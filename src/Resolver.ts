import { Node, NodeIs, PropItem, ObjectItem, ArrayItem } from './utils/Node';
import { serialize } from './Serializer';

export type ResolveValues = {
  createElement: (type: any, props: any, ...children: any) => any;
  [key: string]: any;
};

export function resolve<I extends ResolveValues>(node: Node, values: I): any {
  return resolveInternal(node);

  function resolveInternal(item: Node): any {
    if (NodeIs.Document(item)) {
      return resolveChildren(item.children);
    }
    if (NodeIs.Element(item) || NodeIs.SelfClosingElement(item)) {
      const props = resolveInternal(item.props);
      const children = NodeIs.SelfClosingElement(item) ? [] : resolveChildren(item.children);
      const type = resolveInternal(item.component);
      if (type === undefined) {
        throw new Error(
          `Invalid type, you probably forgot to provide a value for ${serialize(item.component)}`
        );
      }
      return values.createElement(type, props, ...children);
    }
    if (NodeIs.Props(item)) {
      return resolveProps(item.items);
    }
    if (NodeIs.Text(item)) {
      return item.content;
    }
    if (NodeIs.Identifier(item)) {
      return values[item.name];
    }
    if (NodeIs.Bool(item)) {
      return item.value;
    }
    if (NodeIs.Str(item)) {
      return item.value;
    }
    if (NodeIs.Num(item)) {
      return item.value;
    }
    if (NodeIs.Null(item)) {
      return null;
    }
    if (NodeIs.Undefined(item)) {
      return undefined;
    }
    if (NodeIs.DotMember(item)) {
      return resolveInternal(item.target)[item.property.name];
    }
    if (NodeIs.BracketMember(item)) {
      return resolveInternal(item.target)[resolveInternal(item.property)];
    }
    if (NodeIs.Object(item)) {
      return resolveObject(item.items);
    }
    if (NodeIs.Array(item)) {
      return resolveArray(item.items);
    }
    console.log(item);
    throw new Error(`Unsuported node ${item.type}`);
  }

  function resolveChildren(items: Array<Node>): Array<any> {
    return items.map(child => resolveInternal(child));
  }

  function resolveProps(items: Array<PropItem>): any {
    const obj: any = {};
    items.forEach(prop => {
      const key: string = prop.name.name;
      if (NodeIs.NoValueProp(prop)) {
        obj[key] = true;
        return;
      }
      if (NodeIs.Prop(prop)) {
        obj[key] = resolveInternal(prop.value);
        return;
      }
      throw new Error(`Unsuported props ${prop.type}`);
    });
    return obj;
  }

  function resolveObject(items: Array<ObjectItem>): any {
    let obj: any = {};
    items.forEach(prop => {
      if (NodeIs.Spread(prop)) {
        const value = resolveInternal(prop.target);
        obj = {
          ...obj,
          ...value,
        };
        return;
      }
      if (NodeIs.Property(prop)) {
        const value = resolveInternal(prop.value);
        if (NodeIs.Identifier(prop.name)) {
          obj[prop.name.name] = value;
          return;
        }
        if (NodeIs.Str(prop.name)) {
          obj[prop.name.value] = value;
          return;
        }
        return;
      }
      if (NodeIs.ComputedProperty(prop)) {
        const key = resolveInternal(prop.expression);
        const value = resolveInternal(prop.value);
        obj[key] = value;
        return;
      }
      if (NodeIs.PropertyShorthand(prop)) {
        const key = prop.name.name;
        const value = resolveInternal(prop.name);
        obj[key] = value;
        return;
      }
      throw new Error(`Unsuported object item ${prop.type}`);
    });
    return obj;
  }

  function resolveArray(items: Array<ArrayItem>): any {
    let arr: Array<any> = [];
    items.forEach(prop => {
      if (NodeIs.Spread(prop)) {
        const value = resolveInternal(prop.target);
        arr = [...arr, ...value];
        return;
      }
      arr.push(resolveInternal(prop));
    });
    return arr;
  }
}
