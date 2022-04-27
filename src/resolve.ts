import { DocsyError } from './DocsyError';
import * as Ast from './Ast';
import { serialize } from './serialize';

export type ResolveValues = {
  [key: string]: any;
};

export type ResolveNext = {
  current: (item: Ast.Node) => any;
  node: (item: Ast.Node) => any;
  array: (items: Array<Ast.Node>) => Array<any>;
};

export type ResolveHook = (item: Ast.Node, next: ResolveNext) => any;

type ResolveOptions = {
  jsx?: (type: string, props: any, key?: string | number) => any;
  globals?: any;
};

type Resolver<N extends Ast.Node> = (item: N, options: ResolveOptions) => any;

const NODE_RESOLVERS: { [K in Ast.NodeKind]: Resolver<Ast.Node<K>> } = {
  Document(item, options) {
    const result = resolveChildren(item.children, options);
    if (result.length === 0) {
      return '';
    }
    if (result.length === 1) {
      return result[0];
    }
    return result;
  },
  ExpressionDocument(item, options) {
    if (item.children.value === undefined) {
      return undefined;
    }
    return resolveNode(item.children.value, options);
  },
  Element(item, options) {
    const props = resolveAttributes(item.children.attributes, options);
    const children = resolveChildren(item.children.children, options);
    const type = resolveElementName(item.children.name, options);
    return resolveJsx(options, type, { ...props, children });
  },
  SelfClosingElement(item, options) {
    const props = resolveAttributes(item.children.attributes, options);
    const type = resolveElementName(item.children.name, options);
    return resolveJsx(options, type, { ...props });
  },
  RawElement(item, options) {
    const props = resolveAttributes(item.children.attributes, options);
    const type = resolveElementName(item.children.name, options);
    return resolveJsx(options, type, { ...props, children: item.meta.content });
  },
  Text(item) {
    return item.meta.content;
  },
  Identifier(item, config) {
    const { globals: globalsValues } = config;
    return globalsValues[item.meta.name];
  },
  Bool(item) {
    return item.meta.value;
  },
  Str(item) {
    return item.meta.value;
  },
  Num(item) {
    return item.meta.value;
  },
  Null() {
    return null;
  },
  Undefined() {
    return undefined;
  },
  MemberExpression(item, options) {
    const target = resolveNode(item.children.target, options);
    if (target === undefined) {
      throw new DocsyError.MissingGlobalError(
        item.children.target,
        `Cannot access property "${serialize(item.children.property)}" of \`${serialize(item.children.target)}\``
      );
    }
    const keys = Object.keys(target);
    if (keys.indexOf(item.children.property.meta.name) === -1) {
      throw new DocsyError.MissingGlobalError(
        item.children.target,
        `Cannot access property "${serialize(item.children.property)}" of \`${serialize(item.children.target)}\``
      );
    }
    return target[item.children.property.meta.name];
  },
  ComputedMemberExpression(item, options) {
    const target = resolveNode(item.children.target, options);
    if (target === undefined) {
      throw new DocsyError.MissingGlobalError(
        item.children.target,
        `Cannot access property "${serialize(item.children.property)}" of \`${serialize(item.children.target)}\``
      );
    }
    const property = resolveNode(item.children.property, options);
    const keys = Object.keys(target);
    if (keys.indexOf(property) === -1) {
      throw new DocsyError.MissingGlobalError(
        item.children.target,
        `Cannot access property "${serialize(item.children.property)}" of \`${serialize(item.children.target)}\``
      );
    }
    return target[property];
  },
  Obj(item) {
    const items = item.children.items;
    const obj: any = {};
    if (items === undefined) {
      return obj;
    }
    if (Array.isArray(items)) {
      return obj;
    }
    if (!Ast.NodeIs.ObjItems(items)) {
      return obj;
    }
    throw new DocsyError.CannotResolveNodeError(items, `resolver not implemented`);
  },
  Arr(item) {
    const items = item.children.items;
    const arr: Array<any> = [];
    if (items === undefined) {
      return arr;
    }
    if (Array.isArray(items)) {
      return arr;
    }
    if (!Ast.NodeIs.ListItems(items)) {
      return arr;
    }
    throw new DocsyError.CannotResolveNodeError(items, `resolver not implemented`);
  },
  Whitespace(item) {
    return item.meta.content;
  },
  Inject(item, options) {
    const content = resolveNode(item.children.value, options);
    if (typeof content !== 'string') {
      // Should we .toString() and allow any value here ?
      throw new DocsyError.CannotResolveInjectError(item.children.value);
    }
    return (
      resolveWhitespaceLikeToString(item.children.whitespaceBefore) +
      content +
      resolveWhitespaceLikeToString(item.children.whitespaceAfter)
    );
  },
  ListItems() {
    throw new Error('Function not implemented.');
  },
  TrailingComma() {
    throw new Error('Function not implemented.');
  },
  ListItem() {
    throw new Error('Function not implemented.');
  },
  Spread() {
    throw new Error('Function not implemented.');
  },
  ObjItems() {
    throw new Error('Function not implemented.');
  },
  ObjItem() {
    throw new Error('Function not implemented.');
  },
  ObjProperty() {
    throw new Error('Function not implemented.');
  },
  ObjComputedProperty() {
    throw new Error('Function not implemented.');
  },
  ObjPropertyShorthand() {
    throw new Error('Function not implemented.');
  },
  CallExpression() {
    throw new Error('Function not implemented.');
  },
  Parenthesis() {
    throw new Error('Function not implemented.');
  },
  LineComment() {
    throw new Error('Function not implemented.');
  },
  BlockComment() {
    throw new Error('Function not implemented.');
  },
  LineElement() {
    throw new Error('Function not implemented.');
  },
  Fragment() {
    throw new Error('Function not implemented.');
  },
  RawFragment() {
    throw new Error('Function not implemented.');
  },
  Attribute() {
    throw new Error('Function not implemented.');
  },
  ElementNameMember() {
    throw new Error('Function not implemented.');
  },
};

export function resolveNode(item: Ast.Node, options: ResolveOptions = {}): any {
  const resolver: Resolver<Ast.Node> = NODE_RESOLVERS[item.kind] as any;
  if (resolver === undefined) {
    throw new DocsyError.CannotResolveNodeError(item, `Invalid node kind: ${item.kind}`);
  }
  return resolver(item, options);

  throw new DocsyError.CannotResolveNodeError(item, `resolver not implemented`);
}

/**
 * Join consecutive whitespace / text
 * Return resolved array / single item / undefined
 */
export function resolveChildren(items: Array<Ast.Child>, options: ResolveOptions = {}): Array<any> | any | undefined {
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

export function resolveAttributes(attrs: Array<Ast.Attribute>, options: ResolveOptions = {}): any {
  const obj: any = {};
  attrs.forEach((attr) => {
    const key: string = attr.children.name.meta.name;
    if (attr.children.value === undefined) {
      obj[key] = true;
    } else {
      obj[key] = resolveNode(attr.children.value, options);
    }
    return;
  });
  return obj;
}

function resolveWhitespaceLikeToString(item: Ast.WhitespaceLike | undefined): string {
  if (item === undefined) {
    return '';
  }
  const items = Array.isArray(item) ? item : [item];
  return items
    .map((node) => {
      if (Ast.NodeIs.Whitespace(node)) {
        return node.meta.content;
      }
      if (Ast.NodeIs.AnyComment(node)) {
        return '';
      }
      throw new DocsyError.CannotResolveNodeError(node, `resolver not implemented`);
    })
    .join('');
}

function resolveJsx(options: ResolveOptions, type: string, props: any): any {
  const { jsx } = options;
  if (!jsx || typeof jsx !== 'function') {
    throw new DocsyError.MissingJsxFunctionError();
  }
  const key = props.key;
  if (props.key) {
    delete props.key;
  }
  return jsx(type, props, key);
}

function resolveElementName(name: Ast.ElementName, options: ResolveOptions): any {
  const type = resolveNode(name, options);
  if (type === undefined) {
    throw new DocsyError.MissingGlobalError(name, `You probably forgot to provide a value for ${serialize(name)}`);
  }
  return type;
}
