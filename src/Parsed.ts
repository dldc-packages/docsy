import type * as Ast from './Ast';
import { createFileError, createParsedNotReady } from './DocsyErreur';
import { INTERNAL } from './internal';
import type { Ranges, ReadonlyRanges } from './internal/types';

export interface IParsedBase {
  readonly ranges: ReadonlyRanges;
  readonly filename: string;
  readonly source: string;
}

export class Parsed<T extends Ast.Node = Ast.Node> implements IParsedBase {
  public readonly ranges: ReadonlyRanges;
  public readonly filename: string;
  public readonly source: string;

  private _result: T | null = null;

  public [INTERNAL] = {
    setResult: (result: T) => {
      this._result = result;
    },
  } as const;

  constructor(filename: string, source: string, ranges: Ranges, result: T | null = null) {
    this.filename = filename;
    this.source = source;
    this.ranges = ranges;
    this._result = result;
  }

  public get result(): T {
    if (!this._result) {
      throw createParsedNotReady(this.filename);
    }
    return this._result;
  }

  throw(node: Ast.Node, message: string): never {
    throw createFileError(message, this, node);
  }
}
