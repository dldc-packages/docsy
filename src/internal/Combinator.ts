import { StringReader } from './StringReader';

interface ParseErrorObject {
  message: string;
  position: number;
  stack: ParseError;
}

type ParseError = null | ParseErrorObject | Array<ParseErrorObject>;

interface ParseResultFailure {
  type: 'Failure';
  error: ParseErrorObject;
}

interface ParseResultSuccess<T> {
  type: 'Success';
  value: T;
  start: number;
  end: number;
  rest: StringReader;
}

export type ParseResult<T> = ParseResultSuccess<T> | ParseResultFailure;

export type Parser<T> = {
  ParserName: string;
  (input: StringReader): ParseResult<T>;
};

function ParseFailure(error: ParseErrorObject): ParseResultFailure {
  return {
    type: 'Failure',
    error,
  };
}

function ParseSuccess<T>(input: StringReader, rest: StringReader, value: T): ParseResultSuccess<T> {
  return {
    type: 'Success',
    rest,
    start: input.position,
    end: rest.position,
    value,
  };
}

function expectNever<T extends never>(_val: T): never {
  throw new Error(`Expected never !`);
}

export function printParseError(error: ParseErrorObject) {
  return `Docsy Parse Error: \n` + parseErrorToLines(error).join('\n');
}

export function parseErrorToLines(error: ParseErrorObject): Array<string> {
  return [
    `${error.message}(at offset ${error.position})`,
    ...(error.stack === null
      ? []
      : Array.isArray(error.stack)
      ? error.stack.map((p) => parseErrorToLines(p)).flat(1)
      : parseErrorToLines(error.stack)
    ).map((l) => '  ' + l),
  ];
}

function createParser<T>(name: string, fn: (input: StringReader) => ParseResult<T>): Parser<T> {
  const parser: Parser<T> = fn as any;
  parser.ParserName = name;
  return parser;
}

export function named<T>(name: string, parser: Parser<T>): Parser<T> {
  return createParser(name, parser);
}

export function many<T>(parser: Parser<T>): Parser<Array<T>> {
  return createParser(`Many(${parser.ParserName})`, (input) => {
    let nextInput = input;
    let items: Array<T> = [];
    while (true) {
      const next = parser(nextInput);
      if (next.type === 'Failure') {
        break;
      }
      if (next.type === 'Success') {
        items.push(next.value);
        nextInput = next.rest;
      }
    }
    return ParseSuccess(input, nextInput, items);
  });
}

export function manySepBy<T>(itemParser: Parser<T>, sepParser: Parser<any>): Parser<Array<T>> {
  return createParser(`ManySepBy(${itemParser.ParserName}, ${sepParser.ParserName})`, (input) => {
    let nextInput = input;
    let items: Array<T> = [];
    // parse first
    const next = itemParser(nextInput);
    if (next.type === 'Failure') {
      return ParseSuccess(input, nextInput, items);
    }
    if (next.type === 'Success') {
      items.push(next.value);
      nextInput = next.rest;
    }
    while (true) {
      const nextSep = sepParser(nextInput);
      if (nextSep.type === 'Failure') {
        break;
      }
      const nextItem = itemParser(nextSep.rest);
      if (nextItem.type === 'Failure') {
        // fail
        return ParseFailure({
          message: `Expected ${itemParser.ParserName} after ${sepParser.ParserName}`,
          position: nextSep.rest.position,
          stack: nextItem.error,
        });
      }
      if (nextItem.type === 'Success') {
        items.push(nextItem.value);
        nextInput = nextItem.rest;
      }
    }
    return ParseSuccess(input, nextInput, items);
  });
}

export function maybe<T>(parser: Parser<T>): Parser<T | null> {
  return createParser(`Maybe(${parser.ParserName})`, (input) => {
    let nextInput = input;
    const next = parser(nextInput);
    if (next.type === 'Failure') {
      return ParseSuccess(input, input, null);
    }
    return ParseSuccess(input, next.rest, next.value);
  });
}

// prettier-ignore
export function oneOf<R1, R2>(p1: Parser<R1>, p2: Parser<R2>): Parser<R1 | R2>;
// prettier-ignore
export function oneOf<R1, R2, R3>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>): Parser<R1 | R2 | R3>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>, p4: Parser<R4>): Parser<R1 | R2 | R3 | R4>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>, p4: Parser<R4>, p5: Parser<R5>): Parser<R1 | R2 | R3 | R4 | R5>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>, p4: Parser<R4>, p5: Parser<R5>, p6: Parser<R6>): Parser<R1 | R2 | R3 | R4 | R5 | R6>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>, p4: Parser<R4>, p5: Parser<R5>, p6: Parser<R6>, p7: Parser<R7>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7>;
export function oneOf<V>(...parsers: Array<Parser<V>>): Parser<V> {
  const name = `OneOf(${parsers.map((p) => p.ParserName).join(',')})`;
  return createParser(
    name,
    (input): ParseResult<V> => {
      let fails: Array<ParseErrorObject> = [];
      for (const parser of parsers) {
        const next = parser(input);
        if (next.type === 'Success') {
          return next;
        }
        if (next.type === 'Failure') {
          fails.push(next.error);
          continue;
        }
        expectNever(next);
      }
      return ParseFailure({
        message: `Cannot match one of [${parsers.map((p) => p.ParserName).join(',')}]`,
        position: input.position,
        stack: fails,
      });
    }
  );
}

export function transform<T, U>(
  parser: Parser<T>,
  transformer: (val: T, start: number, end: number) => U
): Parser<U> {
  return createParser(`Transform(${parser.ParserName})`, (input) => {
    const next = parser(input);
    if (next.type === 'Success') {
      return {
        ...next,
        value: transformer(next.value, next.start, next.end),
      };
    }
    return next;
  });
}

export function whileMatch(name: string, matcher: (char: string) => boolean): Parser<string> {
  return createParser(name, (input) => {
    let content = '';
    let current = input;
    if (current.empty) {
      return ParseFailure({
        message: `${name} did not match because of EOF`,
        position: input.position,
        stack: null,
      });
    }
    while (!current.empty && matcher(current.peek())) {
      content += current.peek();
      current = current.skip();
    }
    if (content.length === 0) {
      return ParseFailure({
        message: `${name} did not match (received '${current.peek()}')`,
        position: input.position,
        stack: null,
      });
    }
    return ParseSuccess(input, current, content);
  });
}

export function singleChar(name: string, matcher: (char: string) => boolean): Parser<string> {
  return createParser(name, (input) => {
    if (input.empty) {
      return ParseFailure({
        message: `${name} did not match because of EOF`,
        position: input.position,
        stack: null,
      });
    }
    const value = input.peek();
    if (!matcher(value)) {
      return ParseFailure({
        message: `${name} did not match (received '${value}')`,
        position: input.position,
        stack: null,
      });
    }
    const rest = input.skip();
    return ParseSuccess(input, rest, value);
  });
}

export function exact<T extends string>(str: T, name: string = str): Parser<T> {
  return createParser(name, (input) => {
    const peek = input.peek(str.length);
    if (peek.length < str.length) {
      return ParseFailure({
        message: `${name} did not match because of EOF`,
        position: input.position,
        stack: null,
      });
    }
    if (peek !== str) {
      return ParseFailure({
        message: `${name} did not match (received '${peek}')`,
        position: input.position,
        stack: null,
      });
    }
    const nextInput = input.skip(str.length);
    return ParseSuccess(input, nextInput, str);
  });
}

export const eof: Parser<null> = createParser('EOF', (input) => {
  if (input.empty) {
    return ParseSuccess(input, input, null);
  }
  return ParseFailure({
    message: 'Unexpected EOF',
    position: input.position,
    stack: null,
  });
});

// prettier-ignore
export function pipe<R1, R2>(p1: Parser<R1>, p2: Parser<R2>): Parser<[R1, R2]>;
// prettier-ignore
export function pipe<R1, R2, R3>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>): Parser<[R1, R2, R3]>;
// prettier-ignore
export function pipe<R1, R2, R3, R4>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>, p4: Parser<R4>): Parser<[R1, R2, R3, R4]>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, R5>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>, p4: Parser<R4>, p5: Parser<R5>): Parser<[R1, R2, R3, R4, R5]>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, R5, R6>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>, p4: Parser<R4>, p5: Parser<R5>, p6: Parser<R6>): Parser<[R1, R2, R3, R4, R5, R6]>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, R5, R6, R7>(p1: Parser<R1>, p2: Parser<R2>, p3: Parser<R3>, p4: Parser<R4>, p5: Parser<R5>, p6: Parser<R6>, p7: Parser<R7>): Parser<[R1, R2, R3, R4, R5, R6, R7]>;
export function pipe<V>(...parsers: Array<Parser<V>>): Parser<Array<V>> {
  const name = parsers.map((p) => p.ParserName).join(' ');
  return createParser(name, (input) => {
    let current = input;
    const result: Array<V> = [];
    for (const parser of parsers) {
      const next = parser(current);
      if (next.type === 'Failure') {
        return ParseFailure({
          message: `Cannot parse ${name}`,
          position: current.position,
          stack: next.error,
        });
      }
      if (next.type === 'Success') {
        current = next.rest;
        result.push(next.value);
      }
    }
    return ParseSuccess(input, current, result);
  });
}

export function onError<T>(
  parser: Parser<T>,
  onError: (error: ParseErrorObject, input: StringReader) => ParseResult<T>
): Parser<T> {
  return createParser(`OnError(${parser.ParserName})`, (input) => {
    const next = parser(input);
    if (next.type === 'Success') {
      return next;
    }
    return onError(next.error, input);
  });
}

// if error use error of another parser
export function convertError<T>(parser: Parser<T>, errorParser: Parser<any>): Parser<T> {
  return createParser(parser.ParserName, (input) => {
    const next = parser(input);
    if (next.type === 'Success') {
      return next;
    }
    const childError = errorParser(input);
    if (childError.type === 'Success') {
      // errorParser succeed, return the original error
      return next;
    }
    return ParseFailure(childError.error);
  });
}

export function lazy<T>(exec: () => Parser<T>): Parser<T> {
  let resolved: Parser<T> | null = null;
  const parser = createParser('Lazy', (input) => {
    if (resolved) {
      return resolved(input);
    }
    resolved = exec();
    parser.ParserName = resolved.ParserName;
    return resolved(input);
  });
  return parser;
}

export function reduceRight<I, C, O>(
  init: Parser<I>,
  condition: Parser<C>,
  transform: (left: I | O, right: C, start: number, end: number) => O
): Parser<O> {
  return createParser('ReduceRight', (input) => {
    let initParsed = init(input);
    if (initParsed.type === 'Failure') {
      return ParseFailure({
        message: 'ReduceRight error',
        position: input.position,
        stack: initParsed.error,
      });
    }
    let current = initParsed.rest;
    let cond = condition(current);
    if (cond.type === 'Failure') {
      return ParseFailure({
        message: 'ReduceRight error',
        position: current.position,
        stack: cond.error,
      });
    }
    let result = transform(initParsed.value, cond.value, input.position, cond.rest.position);
    while (cond.type === 'Success') {
      current = cond.rest;
      cond = condition(current);
      if (cond.type === 'Success') {
        result = transform(result, cond.value, input.position, cond.rest.position);
      }
    }
    return ParseSuccess(input, current, result);
  });
}
