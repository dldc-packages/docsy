import { StringReader } from './StringReader';

export type Position = {
  line: number;
  column: number;
  offset: number;
};

export interface Range {
  start: Position;
  end: Position;
}

export interface ParseResultFailure {
  type: 'Failure';
}

export interface ParseResultSuccess<T> {
  type: 'Success';
  value: T;
  start: number;
  end: number;
  rest: StringReader;
}

export type ParseResult<T> = ParseResultSuccess<T> | ParseResultFailure;

export type ParserJob<T, Ctx> = Generator<Job<any, Ctx>, ParseResult<T>, JobResult>;

export type Parser<T, Ctx> = {
  name: string;
  parse(input: StringReader, skip: Array<Parser<any, Ctx>>, ctx: Ctx): ParserJob<T, Ctx>;
};

export type Job<T, Ctx> = {
  parser: ParserJob<T, Ctx>;
  ref: {};
};

export type JobResult = {
  ref: {};
  value: ParseResult<unknown>;
};

export interface Rule<T, Ctx> extends Parser<T, Ctx> {
  setParser(parser: Parser<T, Ctx>): void;
}
