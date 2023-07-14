import * as Ast from './Ast';
import { DocsyErreur } from './DocsyErreur';
import type { Parsed } from './Parsed';
import { INTERNAL } from './internal';
import { serialize } from './serialize';

export type ResolveOptions = {
  file?: Parsed;
  jsx?: (type: string, props: any, key?: string | number) => any;
  Fragment?: any;
  globals?: Record<string, any>;
};

export function resolve<K extends Ast.NodeKind>(item: Ast.Node<K>, options: ResolveOptions = {}): Ast.NodeResolved<K> {
  const result = resolveNode(item, options) as any;
  if (result instanceof IntermediateResolvedValue) {
    throw DocsyErreur.CannotResolveNode.create(options.file, item, `The node resolve to an intermediate value`);
  }
  return result;
}

function resolveNode<K extends Ast.NodeKind>(item: Ast.Node<K>, options: ResolveOptions): Ast.NodeResolved<K> {
  const resolver = NODE_RESOLVERS[item.kind];
  if (resolver === undefined) {
    throw DocsyErreur.CannotResolveNode.create(options.file, item, `Invalid node kind: ${item.kind}`);
  }
  return resolver(item, options);
}

/**
 * This class is used to store resolved result from node such as Spread
 */
export class IntermediateResolvedValue<T = any> {
  public [INTERNAL]: T;

  constructor(value: T) {
    this[INTERNAL] = value;
  }
}

const NODE_RESOLVERS: { [K in Ast.NodeKind]: (item: Ast.Node<K>, options: ResolveOptions) => Ast.NodeResolved<K> } = {
  Document(item, options) {
    const result = resolveElementChildren(item.children, options);
    if (result === undefined) {
      return '';
    }
    if (Array.isArray(result)) {
      if (result.length === 0) {
        return '';
      }
      if (result.length === 1) {
        return result[0];
      }
    }
    return result;
  },
  ExpressionDocument(item, options) {
    if (item.value === undefined) {
      return undefined;
    }
    return resolveNode(item.value, options);
  },
  Element(item, options) {
    const props = resolveAttributes(item.attributes, options);
    const children = resolveElementChildren(item.children, options);
    const type = resolveNode(item.name, options);
    return resolveJsx(item, options, type, { ...props, children });
  },
  LineElement(item, options) {
    const props = resolveAttributes(item.attributes, options);
    const children = resolveElementChildren(item.children, options);
    const type = resolveNode(item.name, options);
    return resolveJsx(item, options, type, { ...props, children });
  },
  SelfClosingElement(item, options) {
    const props = resolveAttributes(item.attributes, options);
    const type = resolveNode(item.name, options);
    return resolveJsx(item, options, type, { ...props });
  },
  RawElement(item, options) {
    const props = resolveAttributes(item.attributes, options);
    const type = resolveNode(item.name, options);
    return resolveJsx(item, options, type, { ...props, children: item.content });
  },
  Fragment(item, options) {
    const children = resolveElementChildren(item.children, options);
    return resolveJsx(item, options, resolveFragment(item, options), { children });
  },
  RawFragment(item) {
    return item.content;
  },
  Text(item) {
    return item.content;
  },
  Identifier(item, config) {
    const { globals: globalsValues = {} } = config;
    if (Object.hasOwn(globalsValues, item.name) === false) {
      throw DocsyErreur.MissingGlobal.create(
        config.file,
        item,
        `You probably forgot to provide a value for ${item.name}`,
      );
    }
    return globalsValues[item.name];
  },
  Bool(item) {
    return item.value;
  },
  Str(item) {
    return item.value;
  },
  Num(item) {
    return item.value;
  },
  Null() {
    return null;
  },
  Undefined() {
    return undefined;
  },
  MemberExpression(item, options) {
    const target = resolveNode(item.target, options);
    if (target === undefined || target === null) {
      throw DocsyErreur.TypeError.create(
        options.file,
        item.target,
        `Cannot access property "${serialize(item.property)}" of ${printValueType(target)} (reading '${serialize(
          item,
        )}')`,
      );
    }
    return target[item.property.name];
  },
  ComputedMemberExpression(item, options) {
    const target = resolveNode(item.target, options);
    if (target === undefined || target === null) {
      throw DocsyErreur.TypeError.create(
        options.file,
        item.target,
        `Cannot access property "${serialize(item.property)}" of ${printValueType(target)} (reading '${serialize(
          item,
        )}')`,
      );
    }
    const property = resolveNode(item.property, options);
    if (typeof property !== 'string' && typeof property !== 'number') {
      throw DocsyErreur.TypeError.create(
        options.file,
        item.property,
        `${printValueType(property)} is not valid as a computed property name (reading '${serialize(item)})`,
      );
    }
    return target[property];
  },
  Obj(item, options) {
    const items = item.items;
    if (items === undefined || Ast.NodeIs.WhitespaceLike(items)) {
      return {};
    }
    const resolved = unwrapIntermediate(resolveNode(items, options));
    const obj: Record<string, any> = {};
    resolved.forEach((item) => {
      if (item.kind === 'property') {
        obj[item.name] = item.value;
        return;
      }
      if (item.kind === 'spread') {
        Object.assign(obj, item.target);
        return;
      }
      throw DocsyErreur.UnexpectedError.create(`Unhanled item in Obj resolver`);
    });
    return obj;
  },
  Arr(item, options) {
    const items = item.items;
    if (items === undefined || Ast.NodeIs.WhitespaceLike(items)) {
      return [];
    }
    const resolved = unwrapIntermediate(resolveNode(items, options));
    return resolveListItems(resolved);
  },
  Whitespace(item) {
    return item.content;
  },
  Inject(item, options) {
    return resolveNode(item.value, options);
  },
  ListItems(item, options) {
    return new IntermediateResolvedValue(item.items.map((item) => unwrapIntermediate(resolveNode(item, options))));
  },
  TrailingComma(item, options) {
    throw DocsyErreur.CannotResolveNode.create(options.file, item, `Cannot resolve trailing comma`);
  },
  ListItem(item, options) {
    if (Ast.NodeIs.Expression(item.item)) {
      return new IntermediateResolvedValue({ kind: 'value', value: resolveNode(item.item, options) });
    }
    return resolveNode(item.item, options);
  },
  Spread(item, options) {
    return new IntermediateResolvedValue({ kind: 'spread', target: resolveNode(item.target, options) });
  },
  ObjItems(item, options) {
    return new IntermediateResolvedValue(item.properties.map((item) => unwrapIntermediate(resolveNode(item, options))));
  },
  ObjItem(item, options) {
    return resolveNode(item.property, options);
  },
  ObjProperty(item, options) {
    return new IntermediateResolvedValue({
      kind: 'property',
      name: resolveObjPropertyName(item.name),
      value: resolveNode(item.value, options),
    });
  },
  ObjComputedProperty(item, options) {
    return new IntermediateResolvedValue({
      kind: 'property',
      name: resolveNode(item.expression, options),
      value: resolveNode(item.value, options),
    });
  },
  ObjPropertyShorthand(item, options) {
    return new IntermediateResolvedValue({
      kind: 'property',
      name: resolveObjPropertyName(item.name),
      value: resolveNode(item.name, options),
    });
  },
  CallExpression(item, options) {
    const target = resolveNode(item.target, options);
    if (typeof target !== 'function') {
      throw DocsyErreur.TypeError.create(
        options.file,
        item.target,
        `Cannot call "${serialize(item.target)}" as it is not a function`,
      );
    }
    const args = resolveArguments(item.arguments, options);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return target(...args);
  },
  Parenthesis(item, options) {
    return resolveNode(item.value, options);
  },
  LineComment(item, options) {
    throw DocsyErreur.CannotResolveNode.create(options.file, item, `Cannot resolve line comment`);
  },
  BlockComment(item, options) {
    throw DocsyErreur.CannotResolveNode.create(options.file, item, `Cannot resolve block comment`);
  },
  Attribute(item, options) {
    return new IntermediateResolvedValue({
      name: item.name.name,
      value: item.value ? resolveNode(item.value, options) : true,
    });
  },
  ElementNameMember(item, options) {
    const target = resolveNode(item.target, options);
    if (target === undefined || target === null) {
      throw DocsyErreur.TypeError.create(
        options.file,
        item.target,
        `Cannot access property "${serialize(item.property)}" of ${printValueType(target)} (reading '${serialize(
          item,
        )}')`,
      );
    }
    return target[item.property.name];
  },
};

// -- Utils

/**
 * Join consecutive whitespace / text
 * Return resolved array / single item / undefined
 */
export function resolveElementChildren(items: ReadonlyArray<Ast.Child>, options: ResolveOptions = {}): unknown {
  const result: Array<any> = [];
  items.forEach((child) => {
    const next = resolveNode(child, options);
    const last = result[result.length - 1];
    if (typeof next === 'string' && typeof last === 'string') {
      result[result.length - 1] += next;
      return;
    }
    result.push(next);
  });
  if (result.length === 0) {
    return undefined;
  }
  if (result.length === 1) {
    return result[0];
  }
  return result;
}

export function resolveAttributes(attrs: ReadonlyArray<Ast.Attribute>, options: ResolveOptions = {}): any {
  const obj: any = {};
  attrs.forEach((attr) => {
    const resolved = unwrapIntermediate<{ name: string; value: any }>(resolveNode(attr, options));
    obj[resolved.name] = resolved.value;
  });
  return obj;
}

function unwrapIntermediate<T>(val: IntermediateResolvedValue<T>): T {
  if (val instanceof IntermediateResolvedValue) {
    return val[INTERNAL];
  }
  throw DocsyErreur.UnexpectedError.create(
    `Interbal: Expecting IntermediateResolvedValue but received ${printValueType(val)}`,
  );
}

function resolveJsx(node: Ast.Node, options: ResolveOptions, type: any, props: any): any {
  const { jsx } = options;
  if (!jsx || typeof jsx !== 'function') {
    throw DocsyErreur.MissingJsxFunction.create(options.file, node);
  }
  const key = props.key;
  if (props.key) {
    delete props.key;
  }
  return jsx(type, props, key);
}

function resolveFragment(node: Ast.Node, options: ResolveOptions): any {
  const { Fragment } = options;
  if (Fragment === null || Fragment === undefined) {
    throw DocsyErreur.MissingFragment.create(options.file, node);
  }
  return Fragment;
}

function printValueType(val: any): string {
  if (val === undefined) {
    return 'undefined';
  }
  if (val === null) {
    return 'null';
  }
  if (typeof val === 'string') {
    return 'string';
  }
  if (typeof val === 'number') {
    return 'number';
  }
  if (typeof val === 'boolean') {
    return 'boolean';
  }
  if (typeof val === 'symbol') {
    return 'symbol';
  }
  if (typeof val === 'function') {
    return 'function';
  }
  if (Array.isArray(val)) {
    return 'Array';
  }
  return 'unknown';
}

function resolveObjPropertyName(item: Ast.Str | Ast.Identifier): string {
  return Ast.NodeIs.Identifier(item) ? item.name : item.value;
}

function resolveListItems(items: Array<Ast.ResolveListItem>): Array<any> {
  const arr: Array<any> = [];
  items.forEach((item) => {
    if (item.kind === 'value') {
      arr.push(item.value);
      return;
    }
    if (item.kind === 'spread') {
      arr.push(...item.target);
      return;
    }
    throw DocsyErreur.UnexpectedError.create(`Unhanled item in Arr resolver`);
  });
  return arr;
}

export function resolveArguments(
  args?: Ast.WhitespaceLike | Ast.ListItems | undefined,
  options: ResolveOptions = {},
): Array<any> {
  if (args === undefined || Ast.NodeIs.WhitespaceLike(args)) {
    return [];
  }
  const items = unwrapIntermediate<Array<any>>(resolveNode(args, options));
  return resolveListItems(items);
}
