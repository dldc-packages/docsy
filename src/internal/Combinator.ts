import { DocsyUnexpectedError } from '../DocsyError.js';
import { ParseFailure, ParseSuccess } from './Parser.js';
import { Parser, ParseResult, ParseResultSuccess, Rule } from './types.js';

function expectNever<T extends never>(_val: T): never {
  throw new DocsyUnexpectedError(`Expected never !`);
}

export function many<T, Ctx>(parser: Parser<T, Ctx>): Parser<Array<T>, Ctx> {
  return {
    name: `Many(${parser.name})`,
    parse(input, parent, ctx) {
      let nextInput = input;
      const items: Array<T> = [];
      let next: ParseResult<T>;
      while (true) {
        next = parser.parse(nextInput, items.length === 0 ? parent : [], ctx);
        if (next.type === 'Failure') {
          break;
        }
        if (next.type === 'Success') {
          items.push(next.value);
          nextInput = next.rest;
        }
      }
      return ParseSuccess(input.position, nextInput, items);
    },
  };
}

export function manyBetween<Begin, Item, End, Ctx>(
  name: string | null,
  begin: Parser<Begin, Ctx>,
  item: Parser<Item, Ctx>,
  end: Parser<End, Ctx>
): Parser<[Begin, Array<Item>, End], Ctx> {
  const nameResolved = name === null ? `${begin.name} Many(${item.name}) ${end.name}` : name;
  return {
    name: nameResolved,
    parse(input, skip, ctx) {
      let current = input;
      const beginResult = begin.parse(current, skip, ctx);
      if (beginResult.type === 'Failure') {
        return ParseFailure();
      }
      current = beginResult.rest;
      let endResult = end.parse(current, skip, ctx);
      const items: Array<Item> = [];
      while (endResult.type === 'Failure') {
        if (current.size === 0) {
          return ParseFailure();
        }
        const itemResult = item.parse(current, skip, ctx);
        if (itemResult.type === 'Failure') {
          return ParseFailure();
        }
        items.push(itemResult.value);
        current = itemResult.rest;
        endResult = end.parse(current, skip, ctx);
      }
      const result: [Begin, Array<Item>, End] = [beginResult.value, items, endResult.value];
      return ParseSuccess(input.position, endResult.rest, result);
    },
  };
}

export type ManySepByResult<T> = { items: Array<T>; trailing: boolean };

export function manySepBy<T, Ctx>(
  itemParser: Parser<T, Ctx>,
  sepParser: Parser<any, Ctx>,
  allowTrailing: boolean
): Parser<ManySepByResult<T>, Ctx> {
  const name = `ManySepBy(${itemParser.name}, ${sepParser.name})`;
  return {
    name,
    parse(input, parent, ctx) {
      let nextInput = input;
      const items: Array<T> = [];
      // parse first
      const next = itemParser.parse(nextInput, parent, ctx);
      if (next.type === 'Failure') {
        return ParseSuccess<ManySepByResult<T>>(input.position, nextInput, { items, trailing: false });
      }
      if (next.type === 'Success') {
        items.push(next.value);
        nextInput = next.rest;
      }
      let nextSep: ParseResult<any>;
      while (true) {
        nextSep = sepParser.parse(nextInput, [], ctx);
        if (nextSep.type === 'Failure') {
          break;
        }
        const nextItem = itemParser.parse(nextSep.rest, [], ctx);
        if (nextItem.type === 'Failure') {
          if (allowTrailing) {
            return ParseSuccess<ManySepByResult<T>>(input.position, nextSep.rest, { items, trailing: true });
          }
          // fail
          return ParseFailure();
        }
        if (nextItem.type === 'Success') {
          items.push(nextItem.value);
          nextInput = nextItem.rest;
        }
      }
      return ParseSuccess<ManySepByResult<T>>(input.position, nextInput, { items, trailing: false });
    },
  };
}

export function maybe<T, Ctx>(parser: Parser<T, Ctx>): Parser<T | null, Ctx> {
  return {
    name: `Maybe(${parser.name})`,
    parse(input, parent, ctx) {
      const nextInput = input;
      const next = parser.parse(nextInput, parent, ctx);
      if (next.type === 'Failure') {
        return ParseSuccess(input.position, input, null);
      }
      return ParseSuccess(input.position, next.rest, next.value);
    },
  };
}

// prettier-ignore
export function oneOf<R1, R2, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>): Parser<R1 | R2, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>): Parser<R1 | R2 | R3, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>): Parser<R1 | R2 | R3 | R4, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>): Parser<R1 | R2 | R3 | R4 | R5, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, R8, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>, p8: Parser<R8, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, R8, R9, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>, p8: Parser<R8, C>, p9: Parser<R9, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>, p8: Parser<R8, C>, p9: Parser<R9, C>, p10: Parser<R10, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>, p8: Parser<R8, C>, p9: Parser<R9, C>, p10: Parser<R10, C>, p11: Parser<R11, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11, C>;
export function oneOf<V, Ctx>(name: string | null, ...parsers: Array<Parser<V, Ctx>>): Parser<V, Ctx> {
  const nameResolved = name === null ? `OneOf(${parsers.map((p) => p.name).join(',')})` : name;
  return {
    name: nameResolved,
    parse(input, skip, ctx) {
      for (const parser of parsers) {
        if (skip.includes(parser)) {
          continue;
        }
        const next = parser.parse(input, skip, ctx);
        if (next.type === 'Success') {
          return ParseSuccess(input.position, next.rest, next.value);
        }
        if (next.type === 'Failure') {
          continue;
        }
        expectNever(next);
      }
      return ParseFailure();
    },
  };
}

export function apply<T, U, Ctx>(
  parser: Parser<T, Ctx>,
  transformer: (val: T, start: number, end: number, ctx: Ctx) => U
): Parser<U, Ctx> {
  return {
    name: parser.name,
    parse(input, skip, ctx) {
      const next = parser.parse(input, skip, ctx);
      if (next.type === 'Success') {
        const result: ParseResultSuccess<U> = Object.assign({}, next) as any;
        result.value = transformer(next.value, next.start, next.end, ctx);
        return result;
      }
      return next;
    },
  };
}

export function transform<T, U, Ctx>(
  parser: Parser<T, Ctx>,
  transformer: (result: ParseResult<T>, ctx: Ctx) => ParseResult<U>
): Parser<U, Ctx> {
  return {
    name: parser.name,
    parse(input, skip, ctx) {
      const next = parser.parse(input, skip, ctx);
      return transformer(next, ctx);
    },
  };
}

export function whileNotMatch<Ctx>(name: string | null, matchers: Array<string>): Parser<string, Ctx> {
  const nameResolved = name !== null ? name : `WhileNot(${matchers.join(', ')})`;
  return {
    name: nameResolved,
    parse(input) {
      const rest = input.peek(Infinity);
      if (rest.length === 0) {
        return ParseFailure();
      }
      const matches = matchers.map((matcher) => rest.indexOf(matcher)).filter((v) => v !== -1);
      if (matches.length === 0) {
        // no match, take the entire string
        return ParseSuccess(input.position, input.skip(rest.length), rest);
      }
      const firstMatch = Math.min(...matches);
      if (firstMatch === 0) {
        return ParseFailure();
      }
      const text = rest.slice(0, firstMatch);
      return ParseSuccess(input.position, input.skip(text.length), text);
    },
  };
}

export function regexp<Ctx>(name: string, reg: RegExp): Parser<string, Ctx> {
  if (reg.source[0] !== '^') {
    throw new Error(`Regular expression patterns for a tokenizer should start with "^": ${reg.source}`);
  }
  if (!reg.global) {
    throw new Error(`Regular expression patterns for a tokenizer should be global: ${reg.source}`);
  }

  return {
    name,
    parse(input) {
      if (input.empty) {
        return ParseFailure();
      }
      const subString = input.peek(Infinity);
      reg.lastIndex = 0;
      if (reg.test(subString)) {
        const text = subString.substr(0, reg.lastIndex);
        const next = input.skip(text.length);
        return ParseSuccess(input.position, next, text);
      }
      return ParseFailure();
    },
  };
}

export function whileMatch<Ctx>(
  name: string,
  matcher: (ch1: string, ch2: string, ch3: string) => boolean
): Parser<string, Ctx> {
  return {
    name,
    parse(input) {
      let content = '';
      let current = input;
      if (current.empty) {
        return ParseFailure();
      }
      while (!current.empty && matcher(current.peek(), current.peek(2), current.peek(3))) {
        content += current.peek();
        current = current.skip();
      }
      if (content.length === 0) {
        return ParseFailure();
      }
      return ParseSuccess(input.position, current, content);
    },
  };
}

export function singleChar<Ctx>(name: string, matcher?: (char: string) => boolean): Parser<string, Ctx> {
  return {
    name,
    parse(input) {
      if (input.empty) {
        return ParseFailure();
      }
      const value = input.peek();
      if (matcher && !matcher(value)) {
        return ParseFailure();
      }
      const rest = input.skip();
      return ParseSuccess(input.position, rest, value);
    },
  };
}

export function exact<T extends string, Ctx>(str: T, name: string = `'${str}'`): Parser<T, Ctx> {
  const nameResolved = name.replace(/\n/, '\\n');
  return {
    name: nameResolved,
    parse(input) {
      const peek = input.peek(str.length);
      if (peek.length < str.length) {
        return ParseFailure();
      }
      if (peek !== str) {
        return ParseFailure();
      }
      const nextInput = input.skip(str.length);
      return ParseSuccess(input.position, nextInput, str);
    },
  };
}

export function eof<Ctx>(): Parser<null, Ctx> {
  return {
    name: 'EOF',
    parse(input) {
      if (input.empty) {
        return ParseSuccess(input.position, input, null);
      }
      return ParseFailure();
    },
  };
}

// prettier-ignore
export function pipe<R1, R2, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>): Parser<[R1, R2], C>;
// prettier-ignore
export function pipe<R1, R2, R3, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>): Parser<[R1, R2, R3], C>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>): Parser<[R1, R2, R3, R4], C>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, R5, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>): Parser<[R1, R2, R3, R4, R5], C>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, R5, R6, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>): Parser<[R1, R2, R3, R4, R5, R6], C>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, R5, R6, R7, C>(name: string | null, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>): Parser<[R1, R2, R3, R4, R5, R6, R7], C>;
export function pipe<V, Ctx>(name: string | null, ...parsers: Array<Parser<V, Ctx>>): Parser<Array<V>, Ctx> {
  const nameResolved = name === null ? `[${parsers.map((p) => p.name).join(' ')}]` : name;
  return {
    name: nameResolved,
    parse(input, skip, ctx) {
      let current = input;
      const result: Array<V> = [];
      if (skip.includes(parsers[0])) {
        return ParseFailure();
      }

      for (let i = 0; i < parsers.length; i++) {
        const parser = parsers[i];
        let nextSkip = skip;
        if (i === 0) {
          nextSkip = skip.slice();
          nextSkip.push(parser);
        }
        const next = parser.parse(current, nextSkip, ctx);
        if (next.type === 'Failure') {
          // const prevError = prevResult === null ? null : prevResult.result.stack;
          return ParseFailure();
        }
        if (next.type === 'Success') {
          current = next.rest;
          result.push(next.value);
        }
      }
      return ParseSuccess(input.position, current, result);
    },
  };
}

export function lazy<T, Ctx>(name: string, exec: () => Parser<T, Ctx>): Parser<T, Ctx> {
  let resolved: Parser<T, Ctx> | null = null;
  return {
    name,
    parse(input, skip, ctx) {
      if (resolved == null) {
        resolved = exec();
      }
      return resolved.parse(input, skip, ctx);
    },
  };
}

export function reduceRight<I, C, O, Ctx>(
  name: string,
  init: Parser<I, Ctx>,
  condition: Parser<C, Ctx>,
  transform: (result: ParseResultSuccess<I | O>, right: ParseResultSuccess<C>, ctx: Ctx) => ParseResult<O>
): Parser<O, Ctx> {
  return {
    name,
    parse(input, skip, ctx) {
      if (skip.includes(init)) {
        return ParseFailure();
      }
      const initParsed = init.parse(input, [...skip, init], ctx);
      if (initParsed.type === 'Failure') {
        return ParseFailure();
      }
      let current = initParsed.rest;
      let cond = condition.parse(current, [], ctx);
      if (cond.type === 'Failure') {
        return ParseFailure();
      }
      // let count = 0;
      current = cond.rest;
      const firstResult = transform(initParsed, cond, ctx);
      if (firstResult.type === 'Failure') {
        return firstResult;
      }
      let result = firstResult;
      while (cond.type === 'Success') {
        current = cond.rest;
        cond = condition.parse(current, [], ctx);
        if (cond.type === 'Success') {
          // count++;
          const nextResult = transform(result, cond, ctx);
          if (nextResult.type === 'Failure') {
            return nextResult;
          }
          current = nextResult.rest;
          result = nextResult;
        }
      }
      return result;
    },
  };
}

export function rule<T, Ctx>(name: string): Rule<T, Ctx> {
  let parser: Parser<T, Ctx> | null = null;
  return {
    name,
    setParser(p) {
      if (parser !== null) {
        throw new Error(`Parser already set !`);
      }
      parser = p;
    },
    parse(input, skip, ctx) {
      if (parser === null) {
        throw new Error(`Cannot get parser rule before setting it !`);
      }
      return parser.parse(input, skip, ctx);
    },
  };
}
