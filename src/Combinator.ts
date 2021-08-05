import { DocsyError } from './DocsyError.js';
import { ParseFailure, ParseSuccess, resultTracker } from './Parser.js';
import { Parser, ParseResult, ParseResultSuccess, Rule } from './types.js';

export function many<T, Ctx>(name: string, parser: Parser<T, Ctx>): Parser<Array<T>, Ctx> {
  return {
    name,
    parse(input, parent, ctx) {
      const tracker = resultTracker();
      let nextInput = input;
      const items: Array<T> = [];
      let next: ParseResult<T>;
      while (true) {
        next = parser.parse(nextInput, items.length === 0 ? parent : [], ctx);
        if (next.type === 'Failure') {
          tracker.update(next);
          break;
        }
        if (next.type === 'Success') {
          items.push(next.value);
          nextInput = next.rest;
        }
      }
      return ParseSuccess(input.position, nextInput, items, tracker.getFailure());
    },
  };
}

export function manyBetween<Begin, Item, End, Ctx>(
  name: string,
  begin: Parser<Begin, Ctx>,
  item: Parser<Item, Ctx>,
  end: Parser<End, Ctx>
): Parser<[Begin, Array<Item>, End], Ctx> {
  return {
    name,
    parse(input, skip, ctx) {
      let current = input;
      const beginResult = begin.parse(current, skip, ctx);
      if (beginResult.type === 'Failure') {
        return ParseFailure(beginResult.pos, name, `${begin.name} did not match`, beginResult);
      }
      const tracker = resultTracker();
      current = beginResult.rest;
      let endResult = end.parse(current, skip, ctx);
      tracker.update(endResult);
      const items: Array<Item> = [];
      while (endResult.type === 'Failure') {
        if (current.empty) {
          return ParseFailure(current.position, name, `${end.name} did not match before EOF`, tracker.getFailure());
        }
        const itemResult = item.parse(current, skip, ctx);
        tracker.update(itemResult);
        if (itemResult.type === 'Failure') {
          return ParseFailure(current.position, name, `${item.name} did not match`, tracker.getFailure());
        }
        items.push(itemResult.value);
        current = itemResult.rest;
        endResult = end.parse(current, skip, ctx);
        tracker.update(endResult);
      }
      const result: [Begin, Array<Item>, End] = [beginResult.value, items, endResult.value];
      return ParseSuccess(input.position, endResult.rest, result);
    },
  };
}

export type ManySepByResult<T> = { items: Array<T>; trailing: boolean };

export function manySepBy<T, Ctx>(
  name: string,
  itemParser: Parser<T, Ctx>,
  sepParser: Parser<any, Ctx>,
  allowTrailing: boolean
): Parser<ManySepByResult<T>, Ctx> {
  return {
    name,
    parse(input, parent, ctx) {
      let current = input;
      const items: Array<T> = [];
      // parse first
      const tracker = resultTracker();
      const next = itemParser.parse(current, parent, ctx);
      tracker.update(next);
      if (next.type === 'Failure') {
        return ParseSuccess<ManySepByResult<T>>(input.position, current, { items, trailing: false }, next);
      }
      if (next.type === 'Success') {
        items.push(next.value);
        current = next.rest;
      }
      let nextSep: ParseResult<any>;
      while (true) {
        nextSep = sepParser.parse(current, [], ctx);
        tracker.update(nextSep);
        if (nextSep.type === 'Failure') {
          break;
        }
        const nextItem = itemParser.parse(nextSep.rest, [], ctx);
        tracker.update(nextItem);
        if (nextItem.type === 'Failure') {
          if (allowTrailing) {
            return ParseSuccess<ManySepByResult<T>>(
              input.position,
              nextSep.rest,
              { items, trailing: true },
              tracker.getFailure()
            );
          }
          // fail
          return ParseFailure(
            nextItem.pos,
            name,
            `${sepParser.name} matched bu ${itemParser.name} did not and trailing separator is not allowed`,
            tracker.getFailure()
          );
        } else {
          items.push(nextItem.value);
          current = nextItem.rest;
        }
      }
      return ParseSuccess<ManySepByResult<T>>(
        input.position,
        current,
        { items, trailing: false },
        tracker.getFailure()
      );
    },
  };
}

export function maybe<T, Ctx>(parser: Parser<T, Ctx>): Parser<T | null, Ctx> {
  const name = `Maybe(${parser.name})`;
  return {
    name,
    parse(input, parent, ctx) {
      const nextInput = input;
      const next = parser.parse(nextInput, parent, ctx);
      if (next.type === 'Failure') {
        return ParseSuccess(input.position, input, null, next);
      }
      return ParseSuccess(input.position, next.rest, next.value);
    },
  };
}

// prettier-ignore
export function oneOf<R1, R2, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>): Parser<R1 | R2, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>): Parser<R1 | R2 | R3, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>): Parser<R1 | R2 | R3 | R4, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>): Parser<R1 | R2 | R3 | R4 | R5, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, R8, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>, p8: Parser<R8, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, R8, R9, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>, p8: Parser<R8, C>, p9: Parser<R9, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>, p8: Parser<R8, C>, p9: Parser<R9, C>, p10: Parser<R10, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10, C>;
// prettier-ignore
export function oneOf<R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>, p8: Parser<R8, C>, p9: Parser<R9, C>, p10: Parser<R10, C>, p11: Parser<R11, C>): Parser<R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11, C>;
export function oneOf<V, Ctx>(name: string, ...parsers: Array<Parser<V, Ctx>>): Parser<V, Ctx> {
  return {
    name,
    parse(input, skip, ctx) {
      const tracker = resultTracker<V>();
      parsers.forEach((parser) => {
        if (skip.includes(parser)) {
          tracker.update(ParseFailure(input.position, name, `${parser.name} is skiped`));
          return;
        }
        const next = parser.parse(input, skip, ctx);
        tracker.update(next);
      });
      return tracker.get();
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
        return ParseSuccess(next.start, next.rest, transformer(next.value, next.start, next.end, ctx));
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

export function whileNotMatch<Ctx>(name: string, matchers: Array<string>): Parser<string, Ctx> {
  return {
    name,
    parse(input) {
      if (input.empty) {
        return ParseFailure(input.position, name, `Cannot match because EOF`);
      }
      const rest = input.peek(Infinity);
      let text = rest;
      for (const matcher of matchers) {
        const pos = text.indexOf(matcher);
        if (pos === 0) {
          return ParseFailure(input.position, name, `Found ${matcher}`);
        }
        if (pos !== -1) {
          text = text.slice(0, pos);
        }
      }
      return ParseSuccess(input.position, input.skip(text.length), text);
    },
  };
}

export function regexp<Ctx>(reg: RegExp): Parser<string, Ctx> {
  if (reg.source[0] !== '^') {
    throw new DocsyError.UnexpectedError(
      `Regular expression patterns for a tokenizer should start with "^": ${reg.source}`
    );
  }
  if (!reg.global) {
    throw new DocsyError.UnexpectedError(`Regular expression patterns for a tokenizer should be global: ${reg.source}`);
  }
  const name = `${reg}`;
  return {
    name,
    parse(input) {
      if (input.empty) {
        return ParseFailure(input.position, name, `EOF reached`);
      }
      const subString = input.peek(Infinity);
      reg.lastIndex = 0;
      if (reg.test(subString)) {
        const text = subString.substr(0, reg.lastIndex);
        const next = input.skip(text.length);
        return ParseSuccess(input.position, next, text);
      }
      return ParseFailure(input.position, name, `${reg} did not match.`);
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
      if (input.empty) {
        return ParseFailure(input.position, name, `EOF reached`);
      }
      let content = '';
      let current = input;
      while (!current.empty && matcher(current.peek(), current.peek(2), current.peek(3))) {
        content += current.peek();
        current = current.skip();
      }
      if (content.length === 0) {
        return ParseFailure(current.position, name, `Did not match`);
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
        return ParseFailure(input.position, name, `EOF reached`);
      }
      const value = input.peek();
      if (matcher && !matcher(value)) {
        return ParseFailure(input.position, name, `Did not match`);
      }
      const rest = input.skip();
      return ParseSuccess(input.position, rest, value);
    },
  };
}

export function exact<T extends string, Ctx>(str: T): Parser<T, Ctx> {
  const name = `"${str}"`;
  return {
    name,
    parse(input) {
      if (input.empty) {
        return ParseFailure(input.position, name, `EOF reached`);
      }
      const peek = input.peek(str.length);
      if (peek.length < str.length) {
        return ParseFailure(input.position, name, `Remaining text is shoprter than "${str}"`);
      }
      if (peek !== str) {
        return ParseFailure(input.position, name, `String "${peek}" is nopt equal to "${str}"`);
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
      return ParseFailure(
        input.position,
        'EOF',
        `End of file not reached (${input.peek(Infinity).length} chars remaining)`
      );
    },
  };
}

// prettier-ignore
export function pipe<R1, R2, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>): Parser<[R1, R2], C>;
// prettier-ignore
export function pipe<R1, R2, R3, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>): Parser<[R1, R2, R3], C>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>): Parser<[R1, R2, R3, R4], C>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, R5, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>): Parser<[R1, R2, R3, R4, R5], C>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, R5, R6, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>): Parser<[R1, R2, R3, R4, R5, R6], C>;
// prettier-ignore
export function pipe<R1, R2, R3, R4, R5, R6, R7, C>(name: string, p1: Parser<R1, C>, p2: Parser<R2, C>, p3: Parser<R3, C>, p4: Parser<R4, C>, p5: Parser<R5, C>, p6: Parser<R6, C>, p7: Parser<R7, C>): Parser<[R1, R2, R3, R4, R5, R6, R7], C>;
export function pipe<V, Ctx>(name: string, ...parsers: Array<Parser<V, Ctx>>): Parser<Array<V>, Ctx> {
  return {
    name,
    parse(input, skip, ctx) {
      if (skip.includes(parsers[0])) {
        return ParseFailure(input.position, name, `${parsers[0].name} is in skip list`);
      }
      let current = input;
      const tracker = resultTracker();
      const result: Array<V> = [];
      for (let i = 0; i < parsers.length; i++) {
        const parser = parsers[i];
        let nextSkip = skip;
        if (i === 0) {
          if (skip.length === 0) {
            nextSkip = [parser];
          } else if (skip.length === 1) {
            nextSkip = [skip[0], parser];
          } else if (skip.includes(parser) === false) {
            nextSkip = skip.slice();
            nextSkip.push(parser);
          }
        }
        const next = parser.parse(current, nextSkip, ctx);
        tracker.update(next);
        if (next.type === 'Failure') {
          return ParseFailure(current.position, name, `${parser.name} did not match`, tracker.getFailure());
        } else {
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
        return ParseFailure(input.position, name, `${init.name} is in skip list`);
      }
      const initParsed = init.parse(input, [...skip, init], ctx);
      if (initParsed.type === 'Failure') {
        return ParseFailure(input.position, name, `Init(${init.name}) did not match`, initParsed);
      }
      let current = initParsed.rest;
      let cond = condition.parse(current, [], ctx);
      if (cond.type === 'Failure') {
        return ParseFailure(current.position, name, `Condition(${condition.name}) did not match`, cond);
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
        throw new DocsyError.UnexpectedError(`Parser already set !`);
      }
      parser = p;
    },
    parse(input, skip, ctx) {
      if (parser === null) {
        throw new DocsyError.UnexpectedError(`Cannot get parser rule before setting it !`);
      }
      return parser.parse(input, skip, ctx);
    },
  };
}
