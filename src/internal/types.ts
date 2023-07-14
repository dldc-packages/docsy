import type { LinkedList } from './LinkedList';
import type { StringReader } from './StringReader';
import type * as Ast from '../Ast';

export type Position = {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
};

export interface Range {
  readonly start: number;
  readonly end: number;
}

export type Ranges = Map<Ast.Node, Range>;

export type ReadonlyRanges = ReadonlyMap<Ast.Node, Range>;

export interface ReadonlyMap<K, V> {
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  readonly size: number;
}

export interface ParseResultFailure {
  type: 'Failure';
  path: LinkedList<string>;
  message: () => string;
  pos: number;
  child: ParseResultFailure | null;
}

export interface ParseResultSuccess<T> {
  type: 'Success';
  value: T;
  start: number;
  end: number;
  rest: StringReader;
  ifError: ParseResultFailure | null;
}

export type ParseResult<T> = ParseResultSuccess<T> | ParseResultFailure;

export type ParserFn<T, Ctx> = (
  path: LinkedList<string>,
  input: StringReader,
  skip: Array<Parser<any, Ctx>>,
  ctx: Ctx,
) => ParseResult<T>;

export type Parser<T, Ctx> = {
  parse: ParserFn<T, Ctx>;
};

export type ParserAny<Ctx> = Parser<any, Ctx>;

export interface Rule<T, Ctx> extends Parser<T, Ctx> {
  setParser(parser: Parser<T, Ctx>): void;
}

export type StackItem = { position: number; name: string; message: string };
export type Stack = Array<StackItem>;

export type ResultTracker<T> = {
  get(): ParseResult<T>;
  getFailure(): ParseResultFailure | null;
  update(result: ParseResult<T>): void;
};

export type TraversePath = Array<number | string>;

export type Complete<T> = {
  [P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : T[P] | undefined;
};
