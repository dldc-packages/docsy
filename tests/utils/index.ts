import fse from 'fs-extra';
import path from 'path';

export function readFile(name: string): string {
  const testFileFolder = path.resolve(process.cwd(), 'tests/files');
  const filePath = path.resolve(testFileFolder, `${name}.docsy`);
  const file = fse.readFileSync(filePath, { encoding: 'utf8' });
  return file;
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
