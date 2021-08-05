import { DocsyError } from './DocsyError.js';
import { Node, NodeType, CreateNode, Expression, NodeNodesItem, isValidNodeType } from './Node.js';

type TraversePath = Array<number | string>;

type TransformResult<T> = {
  value: T;
  changed: boolean;
};

export const DocsyUtils = {
  traverse,
  transform,
  transformDeep,
  createNodeFromValue,
  getNodeNodes,
};

/**
 * If the onNode return a different node, we replace the node and don't go deeper
 */
function transform(node: Node, onNode: (item: Node, path: TraversePath) => Node): Node {
  return transformInternal(node, []).value;

  function transformInternal<K extends NodeType>(item: Node<K>, path: TraversePath): TransformResult<Node> {
    const result = onNode(item, path);
    if (result !== item) {
      return { changed: true, value: result };
    }
    // if (NodeIs.Document(item)) {
    //   const childRes = transformArray(item.children, [...path, 'children']);
    //   const value: Node<'Document'> = childRes.changed
    //     ? { ...item, children: childRes.value }
    //     : item;
    //   return { changed: childRes.changed, value };
    // }
    throw new DocsyError.NotImplementedError(`Node of type ${item.type}`);
  }

  // function transformArray<K extends NodeType>(
  //   items: Array<Node<K>>,
  //   path: TraversePath
  // ): TransformResult<Array<Node>> {
  //   let changed = false;
  //   const updated = items.map((node, i) => {
  //     const res = transformInternal(node, [...path, i]);
  //     if (res.changed && changed === false) {
  //       changed = true;
  //     }
  //     return res.value;
  //   });
  //   return { changed, value: changed ? updated : items };
  // }
}

function transformDeep(node: Node, onNode: (item: Node, path: TraversePath) => Node): Node {
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

export type NodePath = Array<string | number>;
export interface NodeWithPath {
  node: Node;
  path: NodePath;
}

function getNodesFromNodes(nodes: NodeNodesItem, path: NodePath): Array<NodeWithPath> {
  if (nodes === null) {
    return [];
  }
  if (Array.isArray(nodes)) {
    return nodes.map((node, index) => ({ node, path: [...path, index] }));
  }
  if (nodes.type && isValidNodeType(nodes.type)) {
    // is node
    return [{ node: nodes as any, path }];
  }
  // Object
  return Object.keys(nodes).reduce<Array<NodeWithPath>>((acc, key) => {
    acc.push(...getNodesFromNodes((nodes as any)[key], [...path, key]));
    return acc;
  }, []);
}

function getNodeNodes(item: Node): Array<NodeWithPath> {
  return getNodesFromNodes(item.nodes, []);
}

function traverse(node: Node, onNode: (item: Node, path: TraversePath) => void): void {
  return traverseInternal(node, []);

  function traverseInternal(item: Node, path: TraversePath) {
    onNode(item, path);
    getNodeNodes(item).forEach((child) => {
      traverseInternal(child.node, [...path, ...child.path]);
    });
  }
}

function createNodeFromValue(value: unknown): Expression {
  if (value === null) {
    return CreateNode.Null({}, {});
  }
  if (value === undefined) {
    return CreateNode.Undefined({}, {});
  }
  if (typeof value === 'boolean') {
    return CreateNode.Bool({}, { value });
  }
  if (typeof value === 'number') {
    return CreateNode.Num({}, { value, rawValue: String(value) });
  }
  if (typeof value === 'string') {
    return CreateNode.Str({}, { value, quote: 'Single' });
  }
  if (Array.isArray(value)) {
    return CreateNode.Array(
      {
        items: value.map((val) =>
          CreateNode.ArrayItem(
            {
              item: createNodeFromValue(val),
              whitespaceAfter: null,
              whitespaceBefore: null,
            },
            {}
          )
        ),
      },
      { trailingComma: false }
    );
  }
  if (isPlainObject(value)) {
    return CreateNode.Object(
      {
        items: Object.keys(value).map((key) => {
          return CreateNode.ObjectItem(
            {
              item: CreateNode.Property(
                {
                  name: CreateNode.Str(
                    {},
                    {
                      value: key,
                      quote: 'Single',
                    }
                  ),
                  value: createNodeFromValue((value as any)[key]),
                  whitespaceAfterColon: null,
                  whitespaceBeforeColon: null,
                },
                {}
              ),
              whitespaceAfter: null,
              whitespaceBefore: null,
            },
            {}
          );
        }),
      },
      { trailingComma: false }
    );
  }
  throw new DocsyError.CannotTransformValueError(value);
}

function isObject(val: any): boolean {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
}

function isObjectObject(o: any) {
  return isObject(o) === true && Object.prototype.toString.call(o) === '[object Object]';
}

function isPlainObject(o: any): o is {} {
  if (isObjectObject(o) === false) return false;

  // If has modified constructor
  const ctor = o.constructor;
  if (typeof ctor !== 'function') return false;

  // If has modified prototype
  const prot = ctor.prototype;
  if (isObjectObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  // eslint-disable-next-line no-prototype-builtins
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
}
