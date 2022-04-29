import * as Ast from './Ast.ts';
import { Ranges, ReadonlyRanges } from './internal/types.ts';
import { DocsyError } from './DocsyError.ts';

export interface ParserResultBase {
  readonly ranges: ReadonlyRanges;
  readonly filename: string;
  readonly source: string;
}

export class ParserResult<T extends Ast.Node> implements ParserResultBase {
  public readonly ranges: ReadonlyRanges;
  public readonly result: T;
  public readonly filename: string;
  public readonly source: string;

  constructor(filename: string, source: string, result: T, ranges: Ranges) {
    this.filename = filename;
    this.source = source;
    this.ranges = ranges;
    this.result = result;
  }

  throw(node: Ast.Node, message: string) {
    throw new DocsyError.FileError(this, node, message);
  }
}
