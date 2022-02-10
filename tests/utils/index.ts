import fse from 'fs-extra';
import path from 'path';
import { Node, NodeChildrenBase } from '../../src/Ast';

export function readFile(name: string): string {
  const testFileFolder = path.resolve(process.cwd(), 'tests/files');
  const filePath = path.resolve(testFileFolder, `${name}.docsy`);
  const file = fse.readFileSync(filePath, { encoding: 'utf8' });
  return file;
}

function indent(content: string): string {
  return content
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function debugNodeChildren(children: NodeChildrenBase): string {
  if (children === null) {
    return 'null';
  }
  if (Array.isArray(children)) {
    if (children.length === 0) {
      return '[]';
    }
    return children.map((child, index) => `${index}: ${debugNodeChildren(child)}`).join('\n');
  }
  if (children.kind) {
    return debugNode(children as any);
  }
  const entries = Object.entries(children);
  if (entries.length === 0) {
    return '{}';
  }
  return entries.map(([name, child]) => `${name}: ${debugNodeChildren(child)}`).join('\n');
}

export function debugNode(node: Node): string {
  let nodeHeader = `${node.kind}`;
  if (node.meta) {
    const metas = Object.entries(node.meta);
    if (metas.length) {
      nodeHeader += `(${metas.map(([name, value]) => `${name}: ${value}`).join(', ')})`;
    }
  }
  if (!node.children) {
    return nodeHeader;
  }
  if (Array.isArray(node.children)) {
    if (node.children.length === 0) {
      return [nodeHeader, `children: []`].join('\n');
    }
    return [nodeHeader, ...node.children.map((node) => indent(debugNode(node)))].join('\n');
  }
  const children = Object.entries(node.children);
  if (children.length === 0) {
    return nodeHeader;
  }
  return [
    nodeHeader,
    ...children
      .map(([name, child]) => {
        if (child) {
          const childText = debugNodeChildren(child);
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

// type DebugNodeOptions = { inlineSep: string; newLineSep: string; priority: number };

// type DebugNode = { items: Array<string | DebugNode>; options: DebugNodeOptions };

// function node(items: Array<string | DebugNode>, options: DebugNodeOptions): DebugNode {
//   return { items, options };
// }

// function printDebugNode(node: DebugNode, printWidth: number): string {
//   function printInternal(node: DebugNode, printWidth: number) {

//   }

//   // const breakQueue: Array<DebugNode> = [node];
//   // // find all debug
//   // findDebug(node);

//   // function findDebug(node: DebugNode) {
//   //   const children = node.items.filter((item): item is DebugNode => typeof item !== 'string');
//   //   breakQueue.push(...children);
//   //   children.forEach((child) => {
//   //     findDebug(child);
//   //   });
//   // }

//   // function tryPrint(node: DebugNode, printWidth) {

//   // }
// }
