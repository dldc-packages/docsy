import { StringReader } from './StringReader';
import { Parser, ParseResult, ParseResultFailure, ParseResultSuccess } from './types';

export function executeParserSync<T, Ctx>(parser: Parser<T, Ctx>, input: StringReader, ctx: Ctx): ParseResult<T> {
  return parser.parse(input, [], ctx);
}

export function ParseFailure(): ParseResultFailure {
  return {
    type: 'Failure',
  };
}

export function ParseSuccess<T>(start: number, rest: StringReader, value: T): ParseResultSuccess<T> {
  return {
    type: 'Success',
    rest,
    start,
    end: rest.position,
    value,
  };
}
