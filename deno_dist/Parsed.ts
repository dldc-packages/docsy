import * as Ast from './Ast.ts';
import { Ranges, ReadonlyRanges } from './internal/types.ts';
import { DocsyError } from './DocsyError.ts';
import { INTERNAL } from './internal.ts';

export interface ParsedBase {
  readonly ranges: ReadonlyRanges;
  readonly filename: string;
  readonly source: string;
}

export class Parsed<T extends Ast.Node = Ast.Node> implements ParsedBase {
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
      throw new DocsyError.ParsedNotReady(this.filename);
    }
    return this._result;
  }

  throw(node: Ast.Node, message: string): never {
    throw new DocsyError.FileError(this, node, message);
  }
}