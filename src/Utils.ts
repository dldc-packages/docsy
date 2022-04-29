import { DocsyError } from './DocsyError';
import { Node, CreateNode, Expression, NodeChildrenBase, isValidNodeKind } from './Ast';
import { TraversePath } from './internal/types';

export const Utils = {
  filter,
  traverse,
  createNodeFromValue,
  getNodeChildren,
  cloneAtPaths,
  transform,
  updateNodeMeta,
};

export type NodePath = Array<string | number>;
export interface NodeWithPath {
  node: Node | undefined | null;
  path: NodePath;
}

function updateNodeMeta<T extends Node>(node: T, updater: (meta: T['meta']) => T['meta']): T {
  return {
    ...node,
    meta: updater(node.meta),
  };
}

function getChildren(children: NodeChildrenBase | null | undefined, path: NodePath): Array<NodeWithPath> {
  if (children === null || children === undefined) {
    return [];
  }
  if (Array.isArray(children)) {
    return children.map((node, index) => ({ node, path: [...path, index] }));
  }
  if (children.kind && isValidNodeKind(children.kind)) {
    // is node
    return [{ node: children as any, path }];
  }
  // Object
  return Object.keys(children).reduce<Array<NodeWithPath>>((acc, key) => {
    acc.push(...getChildren((children as any)[key], [...path, key]));
    return acc;
  }, []);
}

function getNodeChildren(node: Node): Array<NodeWithPath> {
  const keys = Object.keys(node).filter((v) => v !== 'meta' && v !== 'kind');
  return keys.reduce<Array<NodeWithPath>>((acc, key) => {
    acc.push(...getChildren((node as any)[key], [key]));
    return acc;
  }, []);
}

/**
 * Traverse Node tree, return false to skip children
 *
 * @param node
 * @param onNode
 * @returns
 */
function traverse(node: Node, onNode: (item: Node, path: TraversePath) => void | false | null): void {
  return traverseInternal(node, []);

  function traverseInternal(item: Node, path: TraversePath) {
    const traverseChildren = onNode(item, path);
    if (traverseChildren === false) {
      return;
    }
    getNodeChildren(item).forEach((child) => {
      if (child.node) {
        traverseInternal(child.node, [...path, ...child.path]);
      }
    });
  }
}

function filter<N extends Node>(node: N, onNode: (item: Node, path: TraversePath) => boolean): N {
  const removePaths: Array<TraversePath> = [];

  if (onNode(node, []) === false) {
    throw new Error('Cannot filter root node !');
  }

  traverse(node, (node, path) => {
    const keep = onNode(node, path);
    if (keep === false) {
      removePaths.push(path);
      return false;
    }
    return;
  });

  // we need to update in reverse order
  const sortedRemovePaths = removePaths.reverse();
  // clone parents
  const clonePaths = sortedRemovePaths.map((v) => v.slice(0, -1)).filter((p) => p.length > 0);
  const cloned = cloneAtPaths(node, clonePaths);
  sortedRemovePaths.forEach((removePath) => {
    deleteAtPath(cloned, removePath);
  });

  return cloned;
}

function transform<N extends Node>(node: N, onNode: (item: Node, path: TraversePath) => Node): N {
  const replaceItems: Array<{ path: TraversePath; node: Node }> = [];

  traverse(node, (node, path) => {
    const updated = onNode(node, path);
    if (updated !== node) {
      replaceItems.push({ path, node: updated });
      return false;
    }
    return;
  });

  // clone parents
  const clonePaths = replaceItems.map((v) => v.path.slice(0, -1)).filter((p) => p.length > 0);
  const cloned = cloneAtPaths(node, clonePaths);
  replaceItems.forEach(({ path, node }) => {
    updateAtPath(cloned, path, node);
  });

  return cloned;
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
    throw new DocsyError('Not implemented');
    // return CreateNode.Array(
    //   { items: value.map((val) => CreateNode.ListItem({ item: createNodeFromValue(val) }, {})) },
    //   { trailingComma: false }
    // );
  }
  if (isPlainObject(value)) {
    throw new DocsyError('Not implemented');
    // return CreateNode.Obj(
    //   {
    //     items: Object.keys(value).map((key) => {
    //       return CreateNode.ObjectItem(
    //         {
    //           item: CreateNode.ObjectProperty(
    //             {
    //               name: CreateNode.Str({}, { value: key, quote: 'Single' }),
    //               value: createNodeFromValue((value as any)[key]),
    //             },
    //             {}
    //           ),
    //         },
    //         {}
    //       );
    //     }),
    //   },
    //   { trailingComma: false }
    // );
  }
  throw new DocsyError.CannotTransformValueError(value);
}

function isObject(val: any): boolean {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
}

function isObjectObject(o: any) {
  return isObject(o) === true && Object.prototype.toString.call(o) === '[object Object]';
}

function isPlainObject(o: any): o is Record<string, any> {
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

/**
 * Clone node
 */
function cloneAtPaths<T>(obj: T, paths: Array<TraversePath>): T {
  return transformInternal(obj, []);

  function transformInternal<T>(item: T, path: TraversePath): T {
    const isInPath = paths.some((clonePath) => arrayStartsWith(clonePath, path));
    if (!isInPath) {
      return item;
    }
    if (Array.isArray(item)) {
      return item.map((v, i) => transformInternal(v, [...path, i])) as any;
    }
    if (isPlainObject(item)) {
      return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, transformInternal(v, [...path, k])])) as any;
    }
    return item;
  }
}

function arrayStartsWith<T>(arr: Array<T>, start: Array<T>): boolean {
  return start.every((v, i) => arr[i] === v);
}

function deleteAtPath(obj: unknown, path: TraversePath) {
  let parent: any = obj;
  const parentPath = path.slice(0, -1);
  const removeKey = path[path.length - 1];
  parentPath.forEach((part) => {
    parent = parent[part];
  });
  if (Array.isArray(parent)) {
    parent.splice(removeKey as any, 1);
    return;
  }
  if (isPlainObject(parent)) {
    delete parent[removeKey];
    return;
  }
  throw new Error('[deleteAtPath] Unsuported type');
}

function updateAtPath(obj: unknown, path: TraversePath, value: unknown) {
  let parent: any = obj;
  const parentPath = path.slice(0, -1);
  const updateKey = path[path.length - 1];
  parentPath.forEach((part) => {
    parent = parent[part];
  });
  parent[updateKey as any] = value;
}
