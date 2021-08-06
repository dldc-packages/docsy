import { DocsyError } from './DocsyError';
import { MaybeWhitespace, Node, NodeIs } from './Ast';
import { DocsySerializer } from './DocsySerializer';

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
      const result = resolveChildren(item.children);
      if (result.length === 0) {
        return '';
      }
      if (result.length === 1) {
        return result[0];
      }
      return result;
    }
    if (NodeIs.ExpressionDocument(item)) {
      return resolveNode(item.children.value);
    }
    if (NodeIs.Element(item) || NodeIs.SelfClosingElement(item)) {
      const props = resolveNode(item.children.props);
      const children = NodeIs.SelfClosingElement(item) ? undefined : resolveChildren(item.children.children);
      const type = resolveNode(item.children.component);
      if (type === undefined) {
        throw new DocsyError.MissingGlobalError(
          item.children.component,
          `You probably forgot to provide a value for ${DocsySerializer.serialize(item.children.component)}`
        );
      }
      return resolveJsx(type, { ...props, children });
    }
    if (NodeIs.RawElement(item)) {
      const props = resolveNode(item.children.props);
      const children = resolveChildren(item.children.children);
      const type = resolveNode(item.children.component);
      if (type === undefined) {
        throw new DocsyError.MissingGlobalError(
          item.children.component,
          `You probably forgot to provide a value for ${DocsySerializer.serialize(item.children.component)}`
        );
      }
      return resolveJsx(type, { ...props, children });
    }
    if (NodeIs.Props(item)) {
      return resolveProps(item.children.items);
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
      const target = resolveNode(item.children.target);
      if (target === undefined) {
        throw new DocsyError.MissingGlobalError(
          item.children.target,
          `Cannot access property "${DocsySerializer.serialize(
            item.children.property
          )}" of \`${DocsySerializer.serialize(item.children.target)}\``
        );
      }
      const keys = Object.keys(target);
      if (keys.indexOf(item.children.property.meta.name) === -1) {
        throw new DocsyError.MissingGlobalError(
          item.children.target,
          `Cannot access property "${DocsySerializer.serialize(
            item.children.property
          )}" of \`${DocsySerializer.serialize(item.children.target)}\``
        );
      }
      return resolveNode(item.children.target)[item.children.property.meta.name];
    }
    if (NodeIs.BracketMember(item)) {
      return resolveNode(item.children.target)[resolveNode(item.children.property)];
    }
    if (NodeIs.Object(item)) {
      return resolveObject(item.children.items);
    }
    if (NodeIs.EmptyObject(item)) {
      return {};
    }
    if (NodeIs.Array(item)) {
      return resolveArray(item.children.items);
    }
    if (NodeIs.EmptyArray(item)) {
      return [];
    }
    if (NodeIs.Whitespace(item)) {
      return item.meta.content;
    }
    if (NodeIs.Inject(item)) {
      const content = resolveNode(item.children.value);
      if (typeof content !== 'string') {
        // Should we .toString() and allow any value here ?
        throw new DocsyError.CannotResolveInjectError(item.children.value);
      }
      return (
        resolveMaybeWhitespaceToString(item.children.whitespaceBefore) +
        content +
        resolveMaybeWhitespaceToString(item.children.whitespaceAfter)
      );
    }
    throw new DocsyError.CannotResolveNodeError(item, `resolver not implemented`);
  }

  function resolveMaybeWhitespaceToString(item: MaybeWhitespace): string {
    if (item === null) {
      return '';
    }
    return item.meta.content;
  }

  function resolveJsx(type: string, props: any): any {
    if (!jsx || typeof jsx !== 'function') {
      throw new DocsyError.MissingJsxFunctionError();
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
      const inner = prop.children.item;
      if (NodeIs.PropNoValue(inner)) {
        const key: string = inner.children.name.meta.name;
        obj[key] = true;
        return;
      }
      if (NodeIs.PropValue(inner)) {
        const key: string = inner.children.name.meta.name;
        obj[key] = resolveNode(inner.children.value);
        return;
      }
      throw new DocsyError.CannotResolveNodeError(inner, `resolver not implemented`);
    });
    return obj;
  }

  function resolveObject(items: Array<Node<'ObjectItem'>>): any {
    let obj: any = {};
    items.forEach((propItem) => {
      const prop = propItem.children.item;
      if (NodeIs.Spread(prop)) {
        const value = resolveNode(prop.children.target);
        obj = {
          ...obj,
          ...value,
        };
        return;
      }
      if (NodeIs.Property(prop)) {
        const value = resolveNode(prop.children.value);
        if (NodeIs.Identifier(prop.children.name)) {
          obj[prop.children.name.meta.name] = value;
          return;
        }
        if (NodeIs.Str(prop.children.name)) {
          obj[prop.children.name.meta.value] = value;
          return;
        }
        return;
      }
      if (NodeIs.ComputedProperty(prop)) {
        const key = resolveNode(prop.children.expression);
        const value = resolveNode(prop.children.value);
        obj[key] = value;
        return;
      }
      if (NodeIs.PropertyShorthand(prop)) {
        const key = prop.children.name.meta.name;
        const value = resolveNode(prop.children.name);
        obj[key] = value;
        return;
      }
      throw new DocsyError.CannotResolveNodeError(prop, `resolver not implemented`);
    });
    return obj;
  }

  function resolveArray(items: Array<Node<'ArrayItem'>>): any {
    let arr: Array<any> = [];
    items.forEach((arrayItem) => {
      const item = arrayItem.children.item;
      if (NodeIs.Spread(item)) {
        const value = resolveNode(item.children.target);
        arr = [...arr, ...value];
        return;
      }
      arr.push(resolveNode(item));
    });
    return arr;
  }
}
