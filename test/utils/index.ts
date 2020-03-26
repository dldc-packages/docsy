import fse from 'fs-extra';
import path from 'path';
import { NodeIs } from '../../src';

export function readFile(name: string): string {
  const testFileFolder = path.resolve(process.cwd(), 'test/files');
  const filePath = path.resolve(testFileFolder, `${name}.docsy`);
  const file = fse.readFileSync(filePath, { encoding: 'utf8' });
  return file;
}

export function logNode(node: any) {
  console.log(JSON.stringify(removePositions(node), null, 2));
}

export function removePositions(item: any): any {
  if (item && item.type && (NodeIs as any)[item.type]) {
    delete item.position;
    let res: any = {};
    Object.keys(item).forEach(key => {
      res[key] = removePositions(item[key]);
    });
    return res;
  }
  if (Array.isArray(item)) {
    return item.map(sub => removePositions(sub));
  }
  return item;
}
