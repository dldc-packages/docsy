import fse from 'fs-extra';
import path from 'path';
import { NodeIs } from '../../src';

export function readFile(name: string): string {
  const testFileFolder = path.resolve(process.cwd(), 'tests/files');
  const filePath = path.resolve(testFileFolder, `${name}.docsy`);
  const file = fse.readFileSync(filePath, { encoding: 'utf8' });
  return file;
}

export function logNode(node: any) {
  console.log(JSON.stringify(removePositions(node), null, 2));
}

export function logToken(node: any) {
  console.log(JSON.stringify(removeRange(node), null, 2));
}

export function removeRange(item: any): any {
  // if (item && item.type && (TokenIs as any)[item.type]) {
  //   delete item.range;
  //   let res: any = {};
  //   Object.keys(item).forEach((key) => {
  //     res[key] = removePositions(item[key]);
  //   });
  //   return res;
  // }
  // if (Array.isArray(item)) {
  //   return item.map((sub) => removeRange(sub));
  // }
  return item;
}

export function removePositions(item: any): any {
  if (item && item.type && (NodeIs as any)[item.type]) {
    delete item.position;
    let res: any = {};
    Object.keys(item).forEach((key) => {
      res[key] = removePositions(item[key]);
    });
    return res;
  }
  if (Array.isArray(item)) {
    return item.map((sub) => removePositions(sub));
  }
  return item;
}
