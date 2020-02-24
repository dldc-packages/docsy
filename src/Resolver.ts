import { Node, NodeIs } from './Node';

export type InjectedValues = {
  createElement: (type: any, props: any, ...children: any) => any;
  [key: string]: any;
};

export function resolve<I extends InjectedValues>(node: Node, values: I): any {
  return resolveInternal(node);

  function resolveInternal(item: Node) {
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
      return item.target[item.property.name];
    }
    if (NodeIs.BracketMember(item)) {
      return item.target[resolveInternal(item.property)];
    }
    throw new Error(`Unsuported node ${item.type}`);
  }
}
