import {
  DocsyMissingGlobalError,
  DocsyCannotResolveInjectError,
  DocsyCannotResolveNodeError,
  DocsyMissingJsxFunctionError,
} from './DocsyError.js';
import { MaybeWhitespace, Node, NodeIs } from './internal/Node.js';
import { DocsySerializer } from './DocsySerializer.js';

export type ResolveValues = {
  [key: string]: any;
};

export type ResolveNext = {
  current: (item: Node) => any;
  node: (item: Node) => any;
  array: (items: Array<Node>) => Array<any>;
};

export type ResolveHook = (item: Node, next: ResolveNext) => any;

export const DocsyResolver = {
  resolve,
};

type ResolveOptions = {
  jsx?: (type: string, props: any, key?: string | number) => any;
  globals?: any;
};

function resolve(node: Node, options: ResolveOptions): any {
  const { globals: globalsValues, jsx } = options;

  return resolveNode(node);

  function resolveNode(item: Node): any {
    if (NodeIs.Document(item)) {
      const result = resolveChildren(item.nodes.children);
      if (result.length === 0) {
        return '';
      }
      if (result.length === 1) {
        return result[0];
      }
      return result;
    }
    if (NodeIs.ExpressionDocument(item)) {
      return resolveNode(item.nodes.value);
    }
    if (NodeIs.Element(item) || NodeIs.SelfClosingElement(item)) {
      const props = resolveNode(item.nodes.props);
      const children = NodeIs.SelfClosingElement(item) ? undefined : resolveChildren(item.nodes.children);
      const type = resolveNode(item.nodes.component);
      if (type === undefined) {
        throw new DocsyMissingGlobalError(
          item.nodes.component,
          `You probably forgot to provide a value for ${DocsySerializer.serialize(item.nodes.component)}`
        );
      }
      return resolveJsx(type, { ...props, children });
    }
    if (NodeIs.RawElement(item)) {
      const props = resolveNode(item.nodes.props);
      const children = resolveChildren(item.nodes.children);
      const type = resolveNode(item.nodes.component);
      if (type === undefined) {
        throw new DocsyMissingGlobalError(
          item.nodes.component,
          `You probably forgot to provide a value for ${DocsySerializer.serialize(item.nodes.component)}`
        );
      }
      return resolveJsx(type, { ...props, children });
    }
    if (NodeIs.Props(item)) {
      return resolveProps(item.nodes.items);
    }
    if (NodeIs.Text(item)) {
      return item.meta.content;
    }
    if (NodeIs.Identifier(item)) {
      return globalsValues[item.meta.name];
    }
    if (NodeIs.Bool(item)) {
      return item.meta.value;
    }
    if (NodeIs.Str(item)) {
      return item.meta.value;
    }
    if (NodeIs.Num(item)) {
      return item.meta.value;
    }
    if (NodeIs.Null(item)) {
      return null;
    }
    if (NodeIs.Undefined(item)) {
      return undefined;
    }
    if (NodeIs.DotMember(item)) {
      const target = resolveNode(item.nodes.target);
      if (target === undefined) {
        throw new DocsyMissingGlobalError(
          item.nodes.target,
          `Cannot access property "${DocsySerializer.serialize(item.nodes.property)}" of \`${DocsySerializer.serialize(
            item.nodes.target
          )}\``
        );
      }
      const keys = Object.keys(target);
      if (keys.indexOf(item.nodes.property.meta.name) === -1) {
        throw new DocsyMissingGlobalError(
          item.nodes.target,
          `Cannot access property "${DocsySerializer.serialize(item.nodes.property)}" of \`${DocsySerializer.serialize(
            item.nodes.target
          )}\``
        );
      }
      return resolveNode(item.nodes.target)[item.nodes.property.meta.name];
    }
    if (NodeIs.BracketMember(item)) {
      return resolveNode(item.nodes.target)[resolveNode(item.nodes.property)];
    }
    if (NodeIs.Object(item)) {
      return resolveObject(item.nodes.items);
    }
    if (NodeIs.EmptyObject(item)) {
      return {};
    }
    if (NodeIs.Array(item)) {
      return resolveArray(item.nodes.items);
    }
    if (NodeIs.EmptyArray(item)) {
      return [];
    }
    if (NodeIs.Whitespace(item)) {
      return item.meta.content;
    }
    if (NodeIs.Inject(item)) {
      const content = resolveNode(item.nodes.value);
      if (typeof content !== 'string') {
        // Should we .toString() and allow any value here ?
        throw new DocsyCannotResolveInjectError(item.nodes.value);
      }
      return (
        resolveMaybeWhitespaceToString(item.nodes.whitespaceBefore) +
        content +
        resolveMaybeWhitespaceToString(item.nodes.whitespaceAfter)
      );
    }
    throw new DocsyCannotResolveNodeError(item, `resolver not implemented`);
  }

  function resolveMaybeWhitespaceToString(item: MaybeWhitespace): string {
    if (item === null) {
      return '';
    }
    return item.meta.content;
  }

  function resolveJsx(type: string, props: any): any {
    if (!jsx || typeof jsx !== 'function') {
      throw new DocsyMissingJsxFunctionError();
    }
    const key = props.key;
    if (props.key) {
      delete props.key;
    }
    return jsx(type, props, key);
  }

  // function resolveNodeList(items: Array<Node>): Array<any> {
  //   return items.map(child => resolveNode(child));
  // }

  function resolveChildren(items: Array<Node>): Array<any> | any {
    const result: Array<any> = [];
    items.forEach((child) => {
      const next = resolveNode(child);
      const last = result[result.length - 1];
      if (typeof next === 'string' && typeof last === 'string') {
        result[result.length - 1] += next;
        return;
      }
      result.push(next);
    });
    if (result.length === 1) {
      return result;
    }
    return result;
  }

  function resolveProps(items: Array<Node<'PropItem'>>): any {
    const obj: any = {};
    items.forEach((prop) => {
      const inner = prop.nodes.item;
      if (NodeIs.PropNoValue(inner)) {
        const key: string = inner.nodes.name.meta.name;
        obj[key] = true;
        return;
      }
      if (NodeIs.PropValue(inner)) {
        const key: string = inner.nodes.name.meta.name;
        obj[key] = resolveNode(inner.nodes.value);
        return;
      }
      throw new DocsyCannotResolveNodeError(inner, `resolver not implemented`);
    });
    return obj;
  }

  function resolveObject(items: Array<Node<'ObjectItem'>>): any {
    let obj: any = {};
    items.forEach((propItem) => {
      const prop = propItem.nodes.item;
      if (NodeIs.Spread(prop)) {
        const value = resolveNode(prop.nodes.target);
        obj = {
          ...obj,
          ...value,
        };
        return;
      }
      if (NodeIs.Property(prop)) {
        const value = resolveNode(prop.nodes.value);
        if (NodeIs.Identifier(prop.nodes.name)) {
          obj[prop.nodes.name.meta.name] = value;
          return;
        }
        if (NodeIs.Str(prop.nodes.name)) {
          obj[prop.nodes.name.meta.value] = value;
          return;
        }
        return;
      }
      if (NodeIs.ComputedProperty(prop)) {
        const key = resolveNode(prop.nodes.expression);
        const value = resolveNode(prop.nodes.value);
        obj[key] = value;
        return;
      }
      if (NodeIs.PropertyShorthand(prop)) {
        const key = prop.nodes.name.meta.name;
        const value = resolveNode(prop.nodes.name);
        obj[key] = value;
        return;
      }
      throw new DocsyCannotResolveNodeError(prop, `resolver not implemented`);
    });
    return obj;
  }

  function resolveArray(items: Array<Node<'ArrayItem'>>): any {
    let arr: Array<any> = [];
    items.forEach((arrayItem) => {
      const item = arrayItem.nodes.item;
      if (NodeIs.Spread(item)) {
        const value = resolveNode(item.nodes.target);
        arr = [...arr, ...value];
        return;
      }
      arr.push(resolveNode(item));
    });
    return arr;
  }
}
