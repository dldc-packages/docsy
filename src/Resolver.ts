import { Node, NodeIs } from './utils/Node';
import { DocsySerializer } from './Serializer';

export type ResolveValues = {
  createElement: (type: any, props: any, ...children: any) => any;
  [key: string]: any;
};

export const DocsyResolver = {
  resolve,
};

function resolve<I extends ResolveValues>(node: Node, values: I): any {
  return resolveInternal(node);

  function resolveInternal(item: Node): any {
    if (NodeIs.Document(item)) {
      return resolveChildren(item.nodes.children);
    }
    if (NodeIs.Element(item) || NodeIs.SelfClosingElement(item)) {
      const props = resolveInternal(item.nodes.props);
      const children = NodeIs.SelfClosingElement(item) ? [] : resolveChildren(item.nodes.children);
      const type = resolveInternal(item.nodes.component);
      if (type === undefined) {
        throw new Error(
          `Invalid type, you probably forgot to provide a value for ${DocsySerializer.serialize(
            item.nodes.component
          )}`
        );
      }
      return values.createElement(type, props, ...children);
    }
    if (NodeIs.RawElement(item)) {
      const props = resolveInternal(item.nodes.props);
      const children = resolveChildren(item.nodes.children);
      const type = resolveInternal(item.nodes.component);
      if (type === undefined) {
        throw new Error(
          `Invalid type, you probably forgot to provide a value for ${DocsySerializer.serialize(
            item.nodes.component
          )}`
        );
      }
      return values.createElement(type, props, ...children);
    }
    if (NodeIs.Props(item)) {
      return resolveProps(item.nodes.items);
    }
    if (NodeIs.Text(item)) {
      return item.meta.content;
    }
    if (NodeIs.Identifier(item)) {
      return values[item.meta.name];
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
      const target = resolveInternal(item.nodes.target);
      if (target === undefined) {
        throw new Error(
          `Cannot access property "${DocsySerializer.serialize(
            item.nodes.property
          )}" of \`${DocsySerializer.serialize(item.nodes.target)}\``
        );
      }
      const keys = Object.keys(target);
      if (keys.indexOf(item.nodes.property.meta.name) === -1) {
        throw new Error(
          `Cannot access property "${DocsySerializer.serialize(
            item.nodes.property
          )}" of \`${DocsySerializer.serialize(item.nodes.target)}\``
        );
      }
      return resolveInternal(item.nodes.target)[item.nodes.property.meta.name];
    }
    if (NodeIs.BracketMember(item)) {
      return resolveInternal(item.nodes.target)[resolveInternal(item.nodes.property)];
    }
    if (NodeIs.Object(item)) {
      return resolveObject(item.nodes.items);
    }
    if (NodeIs.Array(item)) {
      return resolveArray(item.nodes.items);
    }
    console.log(item);
    throw new Error(`Unsuported node ${item.type}`);
  }

  function resolveChildren(items: Array<Node>): Array<any> {
    return items.map((child) => resolveInternal(child));
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
        obj[key] = resolveInternal(inner.nodes.value);
        return;
      }
      throw new Error(`Unsuported props ${inner.type}`);
    });
    return obj;
  }

  function resolveObject(items: Array<Node<'ObjectItem'>>): any {
    let obj: any = {};
    items.forEach((propItem) => {
      const prop = propItem.nodes.item;
      if (NodeIs.Spread(prop)) {
        const value = resolveInternal(prop.nodes.target);
        obj = {
          ...obj,
          ...value,
        };
        return;
      }
      if (NodeIs.Property(prop)) {
        const value = resolveInternal(prop.nodes.value);
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
        const key = resolveInternal(prop.nodes.expression);
        const value = resolveInternal(prop.nodes.value);
        obj[key] = value;
        return;
      }
      if (NodeIs.PropertyShorthand(prop)) {
        const key = prop.nodes.name.meta.name;
        const value = resolveInternal(prop.nodes.name);
        obj[key] = value;
        return;
      }
      throw new Error(`Unsuported object item ${prop.type}`);
    });
    return obj;
  }

  function resolveArray(items: Array<Node<'ArrayItem'>>): any {
    let arr: Array<any> = [];
    items.forEach((arrayItem) => {
      const item = arrayItem.nodes.item;
      if (NodeIs.Spread(item)) {
        const value = resolveInternal(item.nodes.target);
        arr = [...arr, ...value];
        return;
      }
      arr.push(resolveInternal(item));
    });
    return arr;
  }
}
