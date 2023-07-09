import * as Ast from './Ast';
import { DocsyErreur } from './DocsyErreur';
import { TraversePath } from './internal/types';
import { isReadonlyArray } from './internal/utils';

export const Utils = {
  filter,
  traverse,
  createNodeFromValue,
  getNodeChildren,
  getAllNodeChildren,
  getNodeData,
  cloneAtPaths,
  transform,
  nonEmptyArray,
  debug,
};

export type NodePath = Array<string | number>;

export interface NodeWithPath {
  node: Ast.Node | undefined | null;
  path: NodePath;
}

function getChildrenDeep(children: Ast.NodeContentChildren, path: NodePath): Array<NodeWithPath> {
  if (isReadonlyArray(children)) {
    return children.map((node, index) => ({ node, path: [...path, index] }));
  }
  if (children.kind && Ast.isValidNodeKind(children.kind)) {
    // is node
    return [{ node: children as any, path }];
  }
  // Object
  return Object.keys(children).reduce<Array<NodeWithPath>>((acc, key) => {
    acc.push(...getChildrenDeep((children as any)[key], [...path, key]));
    return acc;
  }, []);
}

/**
 * Traverse the node data (children object and arrays) but it dos not traverse children nodes
 * @param node
 * @returns
 */
function getAllNodeChildren(node: Ast.Node): Array<NodeWithPath> {
  const result: Array<NodeWithPath> = [];
  Object.entries(getNodeChildren(node)).forEach(([key, value]) => {
    result.push(...getChildrenDeep(value, [key]));
  });
  return result;
}

/**
 * Filter node content to keep only non data properties (node or array / object of nodes)
 * @param node
 * @returns
 */
function getNodeChildren(node: Ast.Node): Record<string, Ast.NodeContentChildren> {
  const result: Record<string, Ast.NodeContentChildren> = {};
  Object.entries(node).forEach(([key, value]) => {
    if (key === 'kind' || key === 'parsed') {
      return;
    }
    if (value === null || value === undefined) {
      return;
    }
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint') {
      return;
    }
    result[key] = value;
  });
  return result;
}

/**
 * Traverse Node tree, return false to skip children
 *
 * @param node
 * @param onNode
 * @returns
 */
function traverse(node: Ast.Node, onNode: (item: Ast.Node, path: TraversePath) => void | false | null): void {
  return traverseInternal(node, []);

  function traverseInternal(item: Ast.Node, path: TraversePath) {
    const traverseChildren = onNode(item, path);
    if (traverseChildren === false) {
      return;
    }
    getAllNodeChildren(item).forEach((child) => {
      if (child.node) {
        traverseInternal(child.node, [...path, ...child.path]);
      }
    });
  }
}

function getNodeData(node: Ast.Node): Record<string, Ast.NodeContentData> {
  const result: Record<string, Ast.NodeContentData> = {};
  Object.entries(node).forEach(([key, value]) => {
    if (key === 'kind' || key === 'parsed') {
      return;
    }
    const type = typeof value;
    if (
      value === null ||
      value === undefined ||
      type === 'string' ||
      type === 'number' ||
      type === 'boolean' ||
      type === 'bigint'
    ) {
      result[key] = value;
    }
  });
  return result;
}

function filter<N extends Ast.Node>(node: N, onNode: (item: Ast.Node, path: TraversePath) => boolean): N {
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

function transform<N extends Ast.Node>(node: N, onNode: (item: Ast.Node, path: TraversePath) => Ast.Node): N {
  const replaceItems: Array<{ path: TraversePath; node: Ast.Node }> = [];

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

function createNodeFromValue(value: unknown): Ast.Expression {
  if (value === null) {
    return Ast.NodeBuilder.Null();
  }
  if (value === undefined) {
    return Ast.NodeBuilder.Undefined();
  }
  if (typeof value === 'boolean') {
    return Ast.NodeBuilder.Bool({ value });
  }
  if (typeof value === 'number') {
    return Ast.NodeBuilder.Num({ value, rawValue: String(value) });
  }
  if (typeof value === 'string') {
    return Ast.NodeBuilder.Str({ value, quote: 'Single' });
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return Ast.NodeBuilder.Arr({});
    }
    return Ast.NodeBuilder.Arr({
      items: Ast.NodeBuilder.ListItems({
        items: nonEmptyArray(
          value.map((v, i) => {
            return Ast.NodeBuilder.ListItem({
              item: createNodeFromValue(v),
              whitespaceBefore: i === 0 ? undefined : Ast.NodeBuilder.Whitespace({ content: ' ', hasNewLine: false }),
            });
          }),
        ),
      }),
    });
  }
  if (isPlainObject(value)) {
    if (Object.keys(value).length === 0) {
      return Ast.NodeBuilder.Obj({});
    }
    const properties: Array<Ast.ObjItem> = Object.entries(value).map(([key, v], i) => {
      const isLast = i === Object.keys(value).length - 1;
      return Ast.NodeBuilder.ObjItem({
        property: Ast.NodeBuilder.ObjProperty({
          name: Ast.NodeBuilder.Identifier({ name: key }),
          value: createNodeFromValue(v),
          whitespaceAfterColon: Ast.NodeBuilder.Whitespace({ content: ' ', hasNewLine: false }),
        }),
        whitespaceBefore: Ast.NodeBuilder.Whitespace({ content: ' ', hasNewLine: false }),
        whitespaceAfter: isLast ? Ast.NodeBuilder.Whitespace({ content: ' ', hasNewLine: false }) : undefined,
      });
    });

    return Ast.NodeBuilder.Obj({ items: Ast.NodeBuilder.ObjItems({ properties: nonEmptyArray(properties) }) });
  }
  throw DocsyErreur.CannotTransformValue.create(value);
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

export function nonEmptyArray<T>(arr: ReadonlyArray<T>): Ast.NonEmptyArray<T> {
  if (arr.length === 0) {
    throw DocsyErreur.UnexpectedError.create('Unexpected empty array');
  }
  return arr as Ast.NonEmptyArray<T>;
}

function indent(content: string): string {
  return content
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

export function debug(node: Ast.Node | Array<Ast.Node>): string {
  if (Array.isArray(node)) {
    return node.map((child) => debug(child)).join('\n\n');
  }
  let nodeHeader = `${node.kind}`;

  const dataItems = Object.entries(getNodeData(node));
  if (dataItems.length) {
    nodeHeader += `(${dataItems.map(([name, value]) => `${name}: ${value}`).join(', ')})`;
  }

  const children = getAllNodeChildren(node);
  if (children.length === 0) {
    return nodeHeader;
  }
  return [
    nodeHeader,
    ...children
      .map(({ node: child, path }) => {
        const name = path.join('.');
        if (child) {
          const childText = debug(child);
          if (childText.split('\n').length > 1) {
            return `${name}:\n${childText}`;
          }
          return `${name}: ${indent(childText)}`;
        }
        return `${name}: null`;
      })
      .map((v) => indent(v)),
  ].join('\n');
}
