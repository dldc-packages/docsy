import { StringReader } from './StringReader';
import { Parser, ParseResult, ParseResultFailure, ParseResultSuccess, Stack } from './types';
import { DocsyError } from '../DocsyError';

export function executeParser<T, Ctx>(parser: Parser<T, Ctx>, input: StringReader, ctx: Ctx): ParseResult<T> {
  return parser.parse(input, [], ctx);
}

export function expectEOF<T>(result: ParseResult<T>): ParseResult<T> {
  if (result.type === 'Success') {
    if (result.rest.empty === false) {
      throw new DocsyError.NotEOF(result.rest);
    }
  }
  return result;
}

export function ParseFailure(
  pos: number,
  name: string,
  message: string,
  child: ParseResultFailure | null = null
): ParseResultFailure {
  return {
    type: 'Failure',
    name,
    message,
    pos,
    child,
  };
}

export function failurePosition(failure: ParseResultFailure): number {
  if (failure.child === null) {
    return failure.pos;
  }
  if (Array.isArray(failure.child)) {
    return Math.max(...failure.child.map((child) => failurePosition(child)));
  }
  return failurePosition(failure.child);
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

export function failureToStack(failure: ParseResultFailure): Stack {
  const stack: Stack = [];
  let current = failure;
  while (current.child !== null) {
    stack.unshift({ position: current.pos, name: current.name, message: current.message });
    current = current.child;
  }
  stack.unshift({ position: current.pos, name: current.name, message: current.message });
  return stack;
}

export function stackToString(stack: Stack, indent: number = 0): string {
  const indentText = ' '.repeat(indent);
  return stack.map((item) => `${indentText}${item.name}:${item.position} ${item.message}`).join('\n');
}
