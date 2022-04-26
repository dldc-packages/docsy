import { DocsyError } from './DocsyError.ts';
import * as Ast from './Ast.ts';
import { serialize } from './serialize.ts';

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

export function resolve(node: Ast.Node, options: ResolveOptions): any {
  const { globals: globalsValues, jsx } = options;

  return resolveNode(node);

  function resolveNode(item: Ast.Node): any {
    if (Ast.NodeIs.Document(item)) {
      const result = resolveChildren(item.children);
      if (result.length === 0) {
        return '';
      }
      if (result.length === 1) {
        return result[0];
      }
      return result;
    }
    if (Ast.NodeIs.ExpressionDocument(item)) {
      if (item.children.value === undefined) {
        return undefined;
      }
      return resolveNode(item.children.value);
    }
    if (Ast.NodeIs.Element(item) || Ast.NodeIs.SelfClosingElement(item)) {
      const props = resolveAttributes(item.children.attributes);
      const children = Ast.NodeIs.SelfClosingElement(item) ? undefined : resolveChildren(item.children.children);
      const type = resolveNode(item.children.name);
      if (type === undefined) {
        throw new DocsyError.MissingGlobalError(
          item.children.name,
          `You probably forgot to provide a value for ${serialize(item.children.name)}`
        );
      }
      return resolveJsx(type, { ...props, children });
    }
    if (Ast.NodeIs.RawElement(item)) {
      const props = resolveAttributes(item.children.attributes);
      const type = resolveNode(item.children.name);
      if (type === undefined) {
        throw new DocsyError.MissingGlobalError(
          item.children.name,
          `You probably forgot to provide a value for ${serialize(item.children.name)}`
        );
      }
      return resolveJsx(type, { ...props, children: item.meta.content });
    }
    if (Ast.NodeIs.Text(item)) {
      return item.meta.content;
    }
    if (Ast.NodeIs.Identifier(item)) {
      return globalsValues[item.meta.name];
    }
    if (Ast.NodeIs.Bool(item)) {
      return item.meta.value;
    }
    if (Ast.NodeIs.Str(item)) {
      return item.meta.value;
    }
    if (Ast.NodeIs.Num(item)) {
      return item.meta.value;
    }
    if (Ast.NodeIs.Null(item)) {
      return null;
    }
    if (Ast.NodeIs.Undefined(item)) {
      return undefined;
    }
    if (Ast.NodeIs.MemberExpression(item)) {
      const target = resolveNode(item.children.target);
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
      return resolveNode(item.children.target)[item.children.property.meta.name];
    }
    if (Ast.NodeIs.ComputedMemberExpression(item)) {
      return resolveNode(item.children.target)[resolveNode(item.children.property)];
    }
    if (Ast.NodeIs.Obj(item)) {
      return resolveObj(item.children.items);
    }
    if (Ast.NodeIs.Arr(item)) {
      return resolveArr(item.children.items);
    }
    if (Ast.NodeIs.Whitespace(item)) {
      return item.meta.content;
    }
    if (Ast.NodeIs.Inject(item)) {
      const content = resolveNode(item.children.value);
      if (typeof content !== 'string') {
        // Should we .toString() and allow any value here ?
        throw new DocsyError.CannotResolveInjectError(item.children.value);
      }
      return (
        resolveWhitespaceLikeToString(item.children.whitespaceBefore) +
        content +
        resolveWhitespaceLikeToString(item.children.whitespaceAfter)
      );
    }
    throw new DocsyError.CannotResolveNodeError(item, `resolver not implemented`);
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

  function resolveChildren(items: Array<Ast.Node>): Array<any> | any {
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

  function resolveAttributes(attrs: Array<Ast.Attribute>): any {
    const obj: any = {};
    attrs.forEach((attr) => {
      const key: string = attr.children.name.meta.name;
      if (attr.children.value === undefined) {
        obj[key] = true;
      } else {
        obj[key] = resolveNode(attr.children.value);
      }
      return;
    });
    return obj;
  }

  function resolveObj(items: Ast.ObjItems | Ast.WhitespaceLike | undefined): any {
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
    // items.forEach((propItem) => {
    //   if (Ast.NodeIs.ObjItems(propItem)) {
    //     // ignore non object items
    //     return;
    //   }
    //   const prop = propItem.children.item;
    //   if (Ast.NodeIs.Spread(prop)) {
    //     const value = resolveNode(prop.children.target);
    //     obj = {
    //       ...obj,
    //       ...value,
    //     };
    //     return;
    //   }
    //   if (Ast.NodeIs.ObjProperty(prop)) {
    //     const value = resolveNode(prop.children.value);
    //     if (Ast.NodeIs.Identifier(prop.children.name)) {
    //       obj[prop.children.name.meta.name] = value;
    //       return;
    //     }
    //     if (Ast.NodeIs.Str(prop.children.name)) {
    //       obj[prop.children.name.meta.value] = value;
    //       return;
    //     }
    //     return;
    //   }
    //   if (Ast.NodeIs.ObjComputedProperty(prop)) {
    //     const key = resolveNode(prop.children.expression);
    //     const value = resolveNode(prop.children.value);
    //     obj[key] = value;
    //     return;
    //   }
    //   if (Ast.NodeIs.ObjPropertyShorthand(prop)) {
    //     const key = prop.children.name.meta.name;
    //     const value = resolveNode(prop.children.name);
    //     obj[key] = value;
    //     return;
    //   }
    //   throw new DocsyError.CannotResolveNodeError(prop, `resolver not implemented`);
    // });
    // return obj;
  }

  function resolveArr(items: Ast.ListItems | Ast.WhitespaceLike | undefined): any {
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
    // if (Array.isArray(items)) {
    //   items.forEach((arrayItem) => {
    //     const item = arrayItem.children.item;
    //     if (Ast.NodeIs.Spread(item)) {
    //       const value = resolveNode(item.children.target);
    //       arr = [...arr, ...value];
    //       return;
    //     }
    //     arr.push(resolveNode(item));
    //   });
    //   return arr;
    // }
    // return arr;
  }
}
