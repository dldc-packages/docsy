import { Node, NodeIs, NodeType, CreateNode, Expression } from './utils/Node';

type TraversePath = Array<number | string>;

type TransformResult<T> = {
  value: T;
  changed: boolean;
};

/**
 * If the onNode return a different node, we replace the node and don't go deeper
 */
export function transform(node: Node, onNode: (item: Node, path: TraversePath) => Node): Node {
  return transformInternal(node, []).value;

  function transformInternal<K extends NodeType>(
    item: Node<K>,
    path: TraversePath
  ): TransformResult<Node> {
    const result = onNode(item, path);
    if (result !== item) {
      return { changed: true, value: result };
    }
    if (NodeIs.Document(item)) {
      const childRes = transformArray(item.children, [...path, 'children']);
      const value: Node<'Document'> = childRes.changed
        ? { ...item, children: childRes.value }
        : item;
      return { changed: childRes.changed, value };
    }
    throw new Error(`Unsuported node ${item.type}`);
  }

  function transformArray<K extends NodeType>(
    items: Array<Node<K>>,
    path: TraversePath
  ): TransformResult<Array<Node>> {
    let changed = false;
    const updated = items.map((node, i) => {
      const res = transformInternal(node, [...path, i]);
      if (res.changed && changed === false) {
        changed = true;
      }
      return res.value;
    });
    return { changed, value: changed ? updated : items };
  }
}

export function transformDeep(node: Node, onNode: (item: Node, path: TraversePath) => Node): Node {
  return transformDeepInternal(node, []);

  function transformDeepInternal(parent: Node, parentPath: TraversePath): Node {
    const nextParent = onNode(parent, parentPath);
    if (nextParent === parent) {
      return parent;
    }
    return transform(parent, (item, path) => {
      if (item === parent) {
        // we have already transform the parent so we skip it
        return item;
      }
      const next = onNode(item, path);
      if (next === item) {
        // same, let transform going
        return item;
      }
      // item changed, transfomr will stop so we start it again
      return transformDeepInternal(next, path);
    });
  }
}

export function traverse(node: Node, onNode: (item: Node, path: TraversePath) => void) {
  return traverseInternal(node, []);

  function traverseInternal(item: Node, path: TraversePath) {
    onNode(item, path);
    if (NodeIs.Document(item)) {
      traverseMany(item.children, [...path, 'children']);
      return;
    }
    if (NodeIs.Element(item)) {
      traverseInternal(item.component, [...path, 'component']);
      traverseInternal(item.props, [...path, 'props']);
      traverseMany(item.children, [...path, 'children']);
      return;
    }
    if (NodeIs.SelfClosingElement(item)) {
      traverseInternal(item.component, [...path, 'component']);
      traverseInternal(item.props, [...path, 'props']);
      return;
    }
    if (NodeIs.Props(item)) {
      traverseMany(item.items, [...path, 'items']);
      return;
    }
    if (NodeIs.Prop(item)) {
      traverseInternal(item.name, [...path, 'name']);
      traverseInternal(item.value, [...path, 'value']);
      return;
    }
    if (NodeIs.Object(item)) {
      traverseMany(item.items, [...path, 'items']);
      return;
    }
    if (NodeIs.Array(item)) {
      traverseMany(item.items, [...path, 'items']);
      return;
    }
    if (NodeIs.Property(item)) {
      traverseInternal(item.name, [...path, 'name']);
      traverseInternal(item.value, [...path, 'value']);
      return;
    }
    if (NodeIs.Identifier(item) || NodeIs.Str(item) || NodeIs.Text(item) || NodeIs.Num(item)) {
      return;
    }

    throw new Error(`Unsuported node ${item.type}`);
  }

  function traverseMany(items: Array<Node>, path: TraversePath): void {
    items.forEach((node, i) => traverseInternal(node, [...path, i]));
  }
}

export function createNodeFromValue(value: any): Expression {
  if (value === null) {
    return CreateNode.Null({});
  }
  if (value === undefined) {
    return CreateNode.Undefined({});
  }
  if (typeof value === 'boolean') {
    return CreateNode.Bool({ value });
  }
  if (typeof value === 'number') {
    return CreateNode.Num({ value, rawValue: String(value) });
  }
  if (typeof value === 'string') {
    return CreateNode.Str({ value, quote: 'Single' });
  }
  if (Array.isArray(value)) {
    return CreateNode.Array({ items: value.map(val => createNodeFromValue(val)) });
  }
  if (isPlainObject(value)) {
    return CreateNode.Object({
      items: Object.keys(value).map(key => {
        return CreateNode.Property({
          name: CreateNode.Str({ value: key, quote: 'Single' }),
          value: createNodeFromValue(value[key]),
        });
      }),
    });
  }

  throw new Error(`Unsuported value ${value} (${typeof value})`);
}

function isObject(val: any): boolean {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
}

function isObjectObject(o: any) {
  return isObject(o) === true && Object.prototype.toString.call(o) === '[object Object]';
}

function isPlainObject(o: any): boolean {
  let ctor, prot;

  if (isObjectObject(o) === false) return false;

  // If has modified constructor
  ctor = o.constructor;
  if (typeof ctor !== 'function') return false;

  // If has modified prototype
  prot = ctor.prototype;
  if (isObjectObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}
