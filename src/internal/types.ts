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
  name: string;
  message: string;
  pos: number;
  child: ParseResultFailure | null;
}

export interface ParseResultSuccess<T> {
  type: 'Success';
  value: T;
  start: number;
  end: number;
  rest: StringReader;
}

export type ParseResult<T> = ParseResultSuccess<T> | ParseResultFailure;

export type Parser<T, Ctx> = {
  name: string;
  parse(input: StringReader, skip: Array<Parser<any, Ctx>>, ctx: Ctx): ParseResult<T>;
};

export interface Rule<T, Ctx> extends Parser<T, Ctx> {
  setParser(parser: Parser<T, Ctx>): void;
}

export type StackItem = { position: number; name: string; message: string };
export type Stack = Array<StackItem>;
