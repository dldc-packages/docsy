import type { Position } from './types';

export function isReadonlyArray(item: any): item is ReadonlyArray<any> {
  return Array.isArray(item);
}

export function offsetToPosition(source: string, offset: number): Position {
  const text = source.slice(0, offset);
  const parts = text.split(`\n`);
  return {
    line: parts.length,
    column: parts[parts.length - 1].length,
    offset,
  };
}
