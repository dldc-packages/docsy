import {
  createParserNotImplemented,
  createUnexpectedError,
} from "../DocsyErreur.ts";
import { LinkedList } from "./LinkedList.ts";
import { ParseFailure, ParseSuccess, resultTracker } from "./Parser.ts";
import type {
  Parser,
  ParseResult,
  ParseResultSuccess,
  ParserFn,
  Rule,
} from "./types.ts";

export type ManyOptions = {
  allowEmpty?: boolean;
};

export function many<T, Ctx>(
  parser: Parser<T, Ctx>,
  { allowEmpty = true }: ManyOptions = {},
): Parser<Array<T>, Ctx> {
  const parseMany: ParserFn<Array<T>, Ctx> = function parseMany(
    parentPath,
    input,
    parent,
    ctx,
  ) {
    const path = parentPath.add("Many");
    const itemPath = path.add("item");
    const tracker = resultTracker();
    let nextInput = input;
    const items: Array<T> = [];
    let next: ParseResult<T>;
    while (true) {
      next = parser.parse(
        itemPath,
        nextInput,
        items.length === 0 ? parent : [],
        ctx,
      );
      if (next.type === "Failure") {
        tracker.update(next);
        break;
      }
      items.push(next.value);
      nextInput = next.rest;
    }
    if (allowEmpty === false && items.length === 0) {
      return ParseFailure(
        input.position,
        parentPath,
        () => "No element found and allowEmpty === false",
        tracker.getFailure(),
      );
    }
    return ParseSuccess(input.position, nextInput, items, tracker.getFailure());
  };
  return { parse: parseMany };
}

export type ManySepByResult<T, Sep> =
  | null
  | { head: T; tail: Array<{ sep: Sep; item: T }>; trailing: false }
  | { head: T; tail: Array<{ sep: Sep; item: T }>; trailing: Sep };

export type ManySepByOptions = {
  allowTrailing?: boolean;
  allowEmpty?: boolean;
};

export function manySepBy<T, Sep, Ctx>(
  itemParser: Parser<T, Ctx>,
  sepParser: Parser<Sep, Ctx>,
  { allowTrailing = false, allowEmpty = true }: ManySepByOptions = {},
): Parser<ManySepByResult<T, Sep>, Ctx> {
  return {
    parse(parentPath, input, parent, ctx) {
      const path = parentPath.add("ManySepBy");
      const itemPath = path.add("item");
      const sepPath = path.add("sep");
      let current = input;
      // parse first
      const tracker = resultTracker();
      const firstItem = itemParser.parse(itemPath, current, parent, ctx);

      tracker.update(firstItem);
      if (firstItem.type === "Failure") {
        if (allowEmpty) {
          return ParseSuccess<ManySepByResult<T, Sep>>(
            input.position,
            current,
            null,
            firstItem,
          );
        }
        return ParseFailure(
          input.position,
          itemPath,
          () => "Empty not allowed",
          tracker.getFailure(),
        );
      }
      const result: ManySepByResult<T, Sep> = {
        head: firstItem.value,
        tail: [],
        trailing: false,
      };
      current = firstItem.rest;
      let nextSep: ParseResult<any>;
      while (true) {
        nextSep = sepParser.parse(sepPath, current, [], ctx);
        tracker.update(nextSep);
        if (nextSep.type === "Failure") {
          break;
        }
        const nextItem = itemParser.parse(itemPath, nextSep.rest, [], ctx);
        tracker.update(nextItem);
        if (nextItem.type === "Failure") {
          if (allowTrailing) {
            return ParseSuccess<ManySepByResult<T, Sep>>(
              input.position,
              nextSep.rest,
              { head: result.head, tail: result.tail, trailing: nextSep.value },
              tracker.getFailure(),
            );
          }
          return ParseFailure(
            nextItem.pos,
            path,
            () =>
              `Sep matched but item did not and trailing separator is not allowed`,
            tracker.getFailure(),
          );
        } else {
          result.tail.push({ sep: nextSep.value, item: nextItem.value });
          current = nextItem.rest;
        }
      }
      return ParseSuccess<ManySepByResult<T, Sep>>(
        input.position,
        current,
        result,
        tracker.getFailure(),
      );
    },
  };
}

export function maybe<T, Ctx>(
  parser: Parser<T, Ctx>,
): Parser<T | undefined, Ctx> {
  return {
    parse(parentPath, input, parent, ctx) {
      const path = parentPath.add("Maybe");
      const nextInput = input;
      const next = parser.parse(path, nextInput, parent, ctx);
      if (next.type === "Failure") {
        return ParseSuccess(input.position, input, undefined, next);
      }
      return ParseSuccess(input.position, next.rest, next.value);
    },
  };
}

/**
const r = num=>Array(num).fill(null).map((v,i)=>i);
const res = r(20).map(v => v + 2).map(v => `export function oneOf<${r(v).map(i => `R${i}`).join(', ')}, C>(${r(v).map(i => `p${i}: Parser<R${i}, C>`).join(', ')}): Parser<${r(v).map(i => `R${i}`).join(' | ')}, C>;`).map(v=>`// prettier-ignore\n${v}`).join('\n');
*/

// prettier-ignore
export function oneOf<R0, R1, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
): Parser<R0 | R1, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
): Parser<R0 | R1 | R2, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
): Parser<R0 | R1 | R2 | R3, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, R4, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
): Parser<R0 | R1 | R2 | R3 | R4, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, R4, R5, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
): Parser<R0 | R1 | R2 | R3 | R4 | R5, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, R4, R5, R6, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
): Parser<R0 | R1 | R2 | R3 | R4 | R5 | R6, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, R4, R5, R6, R7, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
): Parser<R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, R4, R5, R6, R7, R8, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
): Parser<R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
): Parser<R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
): Parser<R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
): Parser<R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11, C>;
// prettier-ignore
export function oneOf<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
): Parser<R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12, C>;
// prettier-ignore
export function oneOf<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
): Parser<
  R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13,
  C
>;
// prettier-ignore
export function oneOf<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
): Parser<
  R0 | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | R12 | R13 | R14,
  C
>;
// prettier-ignore
export function oneOf<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
): Parser<
  | R0
  | R1
  | R2
  | R3
  | R4
  | R5
  | R6
  | R7
  | R8
  | R9
  | R10
  | R11
  | R12
  | R13
  | R14
  | R15,
  C
>;
// prettier-ignore
export function oneOf<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
): Parser<
  | R0
  | R1
  | R2
  | R3
  | R4
  | R5
  | R6
  | R7
  | R8
  | R9
  | R10
  | R11
  | R12
  | R13
  | R14
  | R15
  | R16,
  C
>;
// prettier-ignore
export function oneOf<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
): Parser<
  | R0
  | R1
  | R2
  | R3
  | R4
  | R5
  | R6
  | R7
  | R8
  | R9
  | R10
  | R11
  | R12
  | R13
  | R14
  | R15
  | R16
  | R17,
  C
>;
// prettier-ignore
export function oneOf<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
  p18: Parser<R18, C>,
): Parser<
  | R0
  | R1
  | R2
  | R3
  | R4
  | R5
  | R6
  | R7
  | R8
  | R9
  | R10
  | R11
  | R12
  | R13
  | R14
  | R15
  | R16
  | R17
  | R18,
  C
>;
// prettier-ignore
export function oneOf<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  R19,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
  p18: Parser<R18, C>,
  p19: Parser<R19, C>,
): Parser<
  | R0
  | R1
  | R2
  | R3
  | R4
  | R5
  | R6
  | R7
  | R8
  | R9
  | R10
  | R11
  | R12
  | R13
  | R14
  | R15
  | R16
  | R17
  | R18
  | R19,
  C
>;
// prettier-ignore
export function oneOf<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  R19,
  R20,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
  p18: Parser<R18, C>,
  p19: Parser<R19, C>,
  p20: Parser<R20, C>,
): Parser<
  | R0
  | R1
  | R2
  | R3
  | R4
  | R5
  | R6
  | R7
  | R8
  | R9
  | R10
  | R11
  | R12
  | R13
  | R14
  | R15
  | R16
  | R17
  | R18
  | R19
  | R20,
  C
>;
// any number of args
export function oneOf<V, Ctx>(
  ...parsers: Array<Parser<V, Ctx>>
): Parser<V, Ctx>;
export function oneOf<V, Ctx>(
  ...parsers: Array<Parser<V, Ctx>>
): Parser<V, Ctx> {
  return {
    parse(parentPath, input, skip, ctx) {
      const path = parentPath.add("OneOf");
      const tracker = resultTracker<V>();
      for (let i = 0; i < parsers.length; i++) {
        const parser = parsers[i];
        const currentPath = path.add(String(i));
        if (skip.includes(parser)) {
          tracker.update(
            ParseFailure(
              input.position,
              currentPath,
              () => `Item at index ${i} is skiped`,
            ),
          );
          continue;
        }
        const next = parser.parse(currentPath, input, skip, ctx);
        tracker.update(next);
      }
      return tracker.get();
    },
  };
}

export function apply<T, U, Ctx>(
  parser: Parser<T, Ctx>,
  transformer: (val: T, start: number, end: number, ctx: Ctx) => U,
): Parser<U, Ctx> {
  return {
    parse(parentPath, input, skip, ctx) {
      const next = parser.parse(parentPath, input, skip, ctx);
      if (next.type === "Success") {
        return ParseSuccess(
          next.start,
          next.rest,
          transformer(next.value, next.start, next.end, ctx),
        );
      }
      return next;
    },
  };
}

export function applyNamed<T, U, Ctx>(
  name: string,
  parser: Parser<T, Ctx>,
  transformer: (val: T, start: number, end: number, ctx: Ctx) => U,
): Parser<U, Ctx> {
  return named(name, apply(parser, transformer));
}

export function transform<T, U, Ctx>(
  parser: Parser<T, Ctx>,
  transformer: (
    result: ParseResult<T>,
    parentPath: LinkedList<string>,
    ctx: Ctx,
  ) => ParseResult<U>,
): Parser<U, Ctx> {
  return {
    parse(parentPath, input, skip, ctx) {
      const next = parser.parse(parentPath, input, skip, ctx);
      return transformer(next, parentPath, ctx);
    },
  };
}

export function transformSuccess<T, U, Ctx>(
  parser: Parser<T, Ctx>,
  transformer: (
    result: ParseResultSuccess<T>,
    parentPath: LinkedList<string>,
    ctx: Ctx,
  ) => ParseResult<U>,
): Parser<U, Ctx> {
  return {
    parse(parentPath, input, skip, ctx) {
      const next = parser.parse(parentPath, input, skip, ctx);
      if (next.type === "Failure") {
        return next;
      }
      return transformer(next, parentPath, ctx);
    },
  };
}

export interface RegexpParser<Ctx> extends Parser<string, Ctx> {
  regexp: RegExp;
}

export function regexp<Ctx>(reg: RegExp, name?: string): RegexpParser<Ctx> {
  const nameResolved = name || `Regexp(${reg})`;
  if (reg.source[0] !== "^") {
    throw createUnexpectedError(
      `Regular expression should start with '^': ${nameResolved}`,
    );
  }
  if (!reg.global) {
    throw createUnexpectedError(
      `Regular expression should be global: ${nameResolved}`,
    );
  }
  return {
    regexp: reg,
    parse(parentPath, input) {
      const path = parentPath.add(nameResolved);
      if (input.empty) {
        return ParseFailure(input.position, path, () => `EOF reached`);
      }
      const subString = input.peek(Infinity);
      reg.lastIndex = 0;
      const result: boolean = reg.test(subString);
      if (result) {
        const text = subString.slice(0, reg.lastIndex);
        if (text.length === 0) {
          return ParseFailure(
            input.position,
            path,
            () => `Regexp matched empty string.`,
          );
          // throw createUnexpectedError(`Regexp ${reg.source} matched empty string`);
        }
        const next = input.skip(text.length);
        return ParseSuccess(input.position, next, text);
      }
      return ParseFailure(input.position, path, () => `Regexp did not match.`);
    },
  };
}

function printString(str: string): string {
  return str.replace(/\n/, "\\n");
}

export function exact<T extends string, Ctx>(str: T): Parser<T, Ctx> {
  const printed = printString(str);
  const name = `Exact('${printed}')`;
  return {
    parse(parentPath, input) {
      const path = parentPath.add(name);
      if (input.empty) {
        return ParseFailure(input.position, path, () => `EOF reached`);
      }
      const peek = input.peek(str.length);
      if (peek.length < str.length) {
        return ParseFailure(
          input.position,
          path,
          () => `Remaining text is shorter than '${printed}'`,
        );
      }
      if (peek !== str) {
        return ParseFailure(
          input.position,
          parentPath.add(name),
          () => `'${printString(peek)}' is not equal to '${printString(str)}'`,
        );
      }
      const nextInput = input.skip(str.length);
      return ParseSuccess(input.position, nextInput, str);
    },
  };
}

export function eof<Ctx>(): Parser<null, Ctx> {
  return {
    parse(parentPath, input) {
      const path = parentPath.add(`EOF`);
      if (input.empty) {
        return ParseSuccess(input.position, input, null);
      }
      return ParseFailure(
        input.position,
        path,
        () =>
          `End of file not reached (${
            input.peek(Infinity).length
          } chars remaining)`,
      );
    },
  };
}

type PRS<T> = ParseResultSuccess<T>;

/**
const r = num=>Array(num).fill(null).map((v,i)=>i);
const res = r(21).map(v => v + 1).map(v => `export function pipeResults<${r(v).map(i => `R${i}`).join(', ')}, C>(${r(v).map(i => `p${i}: Parser<R${i}, C>`).join(', ')}): Parser<[${r(v).map(i => `PRS<R${i}>`).join(', ')}], C>;`).map(v=>`// prettier-ignore\n${v}`).join('\n');
*/

// prettier-ignore
export function pipeResults<R0, C>(p0: Parser<R0, C>): Parser<[PRS<R0>], C>;
// prettier-ignore
export function pipeResults<R0, R1, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
): Parser<[PRS<R0>, PRS<R1>], C>;
// prettier-ignore
export function pipeResults<R0, R1, R2, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
): Parser<[PRS<R0>, PRS<R1>, PRS<R2>], C>;
// prettier-ignore
export function pipeResults<R0, R1, R2, R3, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
): Parser<[PRS<R0>, PRS<R1>, PRS<R2>, PRS<R3>], C>;
// prettier-ignore
export function pipeResults<R0, R1, R2, R3, R4, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
): Parser<[PRS<R0>, PRS<R1>, PRS<R2>, PRS<R3>, PRS<R4>], C>;
// prettier-ignore
export function pipeResults<R0, R1, R2, R3, R4, R5, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
): Parser<[PRS<R0>, PRS<R1>, PRS<R2>, PRS<R3>, PRS<R4>, PRS<R5>], C>;
// prettier-ignore
export function pipeResults<R0, R1, R2, R3, R4, R5, R6, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
): Parser<[PRS<R0>, PRS<R1>, PRS<R2>, PRS<R3>, PRS<R4>, PRS<R5>, PRS<R6>], C>;
// prettier-ignore
export function pipeResults<R0, R1, R2, R3, R4, R5, R6, R7, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
): Parser<
  [PRS<R0>, PRS<R1>, PRS<R2>, PRS<R3>, PRS<R4>, PRS<R5>, PRS<R6>, PRS<R7>],
  C
>;
// prettier-ignore
export function pipeResults<R0, R1, R2, R3, R4, R5, R6, R7, R8, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
    PRS<R12>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
    PRS<R12>,
    PRS<R13>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
    PRS<R12>,
    PRS<R13>,
    PRS<R14>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
    PRS<R12>,
    PRS<R13>,
    PRS<R14>,
    PRS<R15>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
    PRS<R12>,
    PRS<R13>,
    PRS<R14>,
    PRS<R15>,
    PRS<R16>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
    PRS<R12>,
    PRS<R13>,
    PRS<R14>,
    PRS<R15>,
    PRS<R16>,
    PRS<R17>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
  p18: Parser<R18, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
    PRS<R12>,
    PRS<R13>,
    PRS<R14>,
    PRS<R15>,
    PRS<R16>,
    PRS<R17>,
    PRS<R18>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  R19,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
  p18: Parser<R18, C>,
  p19: Parser<R19, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
    PRS<R12>,
    PRS<R13>,
    PRS<R14>,
    PRS<R15>,
    PRS<R16>,
    PRS<R17>,
    PRS<R18>,
    PRS<R19>,
  ],
  C
>;
// prettier-ignore
export function pipeResults<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  R19,
  R20,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
  p18: Parser<R18, C>,
  p19: Parser<R19, C>,
  p20: Parser<R20, C>,
): Parser<
  [
    PRS<R0>,
    PRS<R1>,
    PRS<R2>,
    PRS<R3>,
    PRS<R4>,
    PRS<R5>,
    PRS<R6>,
    PRS<R7>,
    PRS<R8>,
    PRS<R9>,
    PRS<R10>,
    PRS<R11>,
    PRS<R12>,
    PRS<R13>,
    PRS<R14>,
    PRS<R15>,
    PRS<R16>,
    PRS<R17>,
    PRS<R18>,
    PRS<R19>,
    PRS<R20>,
  ],
  C
>;
// impl
export function pipeResults<V, Ctx>(
  ...parsers: Array<Parser<V, Ctx>>
): Parser<Array<PRS<V>>, Ctx>;
export function pipeResults<V, Ctx>(
  ...parsers: Array<Parser<V, Ctx>>
): Parser<Array<PRS<V>>, Ctx> {
  return {
    parse(parentPath, input, skip, ctx) {
      if (skip.includes(parsers[0])) {
        return ParseFailure(
          input.position,
          parentPath,
          () => `First item did not match`,
        );
      }
      let current = input;
      const tracker = resultTracker();
      const result: Array<PRS<V>> = [];
      for (let i = 0; i < parsers.length; i++) {
        const currentPath = parentPath.add(String(i));
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
        const next = parser.parse(currentPath, current, nextSkip, ctx);
        tracker.update(next);
        if (next.type === "Failure") {
          return ParseFailure(
            current.position,
            currentPath,
            () => `Parser at index ${i} did not match`,
            tracker.getFailure(),
          );
        } else {
          current = next.rest;
          result.push(next);
        }
      }
      return ParseSuccess(input.position, current, result);
    },
  };
}

/**
const r = num=>Array(num).fill(null).map((v,i)=>i);
const res = r(21).map(v => v + 1).map(v => `export function pipe<${r(v).map(i => `R${i}`).join(', ')}, C>(${r(v).map(i => `p${i}: Parser<R${i}, C>`).join(', ')}): Parser<[${r(v).map(i => `R${i}`).join(', ')}], C>;`).map(v=>`// prettier-ignore\n${v}`).join('\n');
*/

// prettier-ignore
export function pipe<R0, C>(p0: Parser<R0, C>): Parser<[R0], C>;
// prettier-ignore
export function pipe<R0, R1, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
): Parser<[R0, R1], C>;
// prettier-ignore
export function pipe<R0, R1, R2, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
): Parser<[R0, R1, R2], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
): Parser<[R0, R1, R2, R3], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, R4, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
): Parser<[R0, R1, R2, R3, R4], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, R4, R5, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
): Parser<[R0, R1, R2, R3, R4, R5], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, R4, R5, R6, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
): Parser<[R0, R1, R2, R3, R4, R5, R6], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, R4, R5, R6, R7, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
): Parser<[R0, R1, R2, R3, R4, R5, R6, R7], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, R4, R5, R6, R7, R8, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
): Parser<[R0, R1, R2, R3, R4, R5, R6, R7, R8], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
): Parser<[R0, R1, R2, R3, R4, R5, R6, R7, R8, R9], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
): Parser<[R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
): Parser<[R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11], C>;
// prettier-ignore
export function pipe<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, C>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
): Parser<[R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12], C>;
// prettier-ignore
export function pipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
): Parser<[R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13], C>;
// prettier-ignore
export function pipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
): Parser<[R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14], C>;
// prettier-ignore
export function pipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
): Parser<
  [R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15],
  C
>;
// prettier-ignore
export function pipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
): Parser<
  [R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16],
  C
>;
// prettier-ignore
export function pipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
): Parser<
  [
    R0,
    R1,
    R2,
    R3,
    R4,
    R5,
    R6,
    R7,
    R8,
    R9,
    R10,
    R11,
    R12,
    R13,
    R14,
    R15,
    R16,
    R17,
  ],
  C
>;
// prettier-ignore
export function pipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
  p18: Parser<R18, C>,
): Parser<
  [
    R0,
    R1,
    R2,
    R3,
    R4,
    R5,
    R6,
    R7,
    R8,
    R9,
    R10,
    R11,
    R12,
    R13,
    R14,
    R15,
    R16,
    R17,
    R18,
  ],
  C
>;
// prettier-ignore
export function pipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  R19,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
  p18: Parser<R18, C>,
  p19: Parser<R19, C>,
): Parser<
  [
    R0,
    R1,
    R2,
    R3,
    R4,
    R5,
    R6,
    R7,
    R8,
    R9,
    R10,
    R11,
    R12,
    R13,
    R14,
    R15,
    R16,
    R17,
    R18,
    R19,
  ],
  C
>;
// prettier-ignore
export function pipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  R19,
  R20,
  C,
>(
  p0: Parser<R0, C>,
  p1: Parser<R1, C>,
  p2: Parser<R2, C>,
  p3: Parser<R3, C>,
  p4: Parser<R4, C>,
  p5: Parser<R5, C>,
  p6: Parser<R6, C>,
  p7: Parser<R7, C>,
  p8: Parser<R8, C>,
  p9: Parser<R9, C>,
  p10: Parser<R10, C>,
  p11: Parser<R11, C>,
  p12: Parser<R12, C>,
  p13: Parser<R13, C>,
  p14: Parser<R14, C>,
  p15: Parser<R15, C>,
  p16: Parser<R16, C>,
  p17: Parser<R17, C>,
  p18: Parser<R18, C>,
  p19: Parser<R19, C>,
  p20: Parser<R20, C>,
): Parser<
  [
    R0,
    R1,
    R2,
    R3,
    R4,
    R5,
    R6,
    R7,
    R8,
    R9,
    R10,
    R11,
    R12,
    R13,
    R14,
    R15,
    R16,
    R17,
    R18,
    R19,
    R20,
  ],
  C
>; // impl
// Impl
export function pipe<V, Ctx>(
  ...parsers: Array<Parser<V, Ctx>>
): Parser<Array<V>, Ctx>;
export function pipe<V, Ctx>(
  ...parsers: Array<Parser<V, Ctx>>
): Parser<Array<V>, Ctx> {
  return {
    parse(parentPath, input, skip, ctx) {
      if (skip.includes(parsers[0])) {
        return ParseFailure(
          input.position,
          parentPath,
          () => `First item did not match`,
        );
      }
      let current = input;
      const tracker = resultTracker();
      const result: Array<V> = [];
      for (let i = 0; i < parsers.length; i++) {
        const currentPath = parentPath.add(String(i));
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
        const next = parser.parse(currentPath, current, nextSkip, ctx);
        tracker.update(next);
        if (next.type === "Failure") {
          return ParseFailure(
            current.position,
            currentPath,
            () => `Parser at index ${i} did not match`,
            tracker.getFailure(),
          );
        } else {
          current = next.rest;
          result.push(next.value);
        }
      }
      return ParseSuccess(input.position, current, result);
    },
  };
}

/**
const r = num=>Array(num).fill(null).map((v,i)=>i);
const res = r(21).map(v => v + 1).map(v => `export function applyPipe<${r(v).map(i => `R${i}`).join(', ')}, Out, C>(parsers: [${r(v).map(i => `Parser<R${i}, C>`).join(', ')}], transformer: Transformer<[${r(v).map(i => `R${i}`).join(', ')}], Out, C>): Parser<Out, C>;`).map(v=>`// prettier-ignore\n${v}`).join('\n');
*/

type Transformer<In, Out, Ctx> = (
  val: In,
  start: number,
  end: number,
  ctx: Ctx,
) => Out;

// prettier-ignore
export function applyPipe<R0, Out, C>(
  parsers: [Parser<R0, C>],
  transformer: Transformer<[R0], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, Out, C>(
  parsers: [Parser<R0, C>, Parser<R1, C>],
  transformer: Transformer<[R0, R1], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, R2, Out, C>(
  parsers: [Parser<R0, C>, Parser<R1, C>, Parser<R2, C>],
  transformer: Transformer<[R0, R1, R2], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, R2, R3, Out, C>(
  parsers: [Parser<R0, C>, Parser<R1, C>, Parser<R2, C>, Parser<R3, C>],
  transformer: Transformer<[R0, R1, R2, R3], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, R2, R3, R4, Out, C>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
  ],
  transformer: Transformer<[R0, R1, R2, R3, R4], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, R2, R3, R4, R5, Out, C>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
  ],
  transformer: Transformer<[R0, R1, R2, R3, R4, R5], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, R2, R3, R4, R5, R6, Out, C>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
  ],
  transformer: Transformer<[R0, R1, R2, R3, R4, R5, R6], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, R2, R3, R4, R5, R6, R7, Out, C>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
  ],
  transformer: Transformer<[R0, R1, R2, R3, R4, R5, R6, R7], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, R2, R3, R4, R5, R6, R7, R8, Out, C>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
  ],
  transformer: Transformer<[R0, R1, R2, R3, R4, R5, R6, R7, R8], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, Out, C>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
  ],
  transformer: Transformer<[R0, R1, R2, R3, R4, R5, R6, R7, R8, R9], Out, C>,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, Out, C>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
  ],
  transformer: Transformer<
    [R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
  ],
  transformer: Transformer<
    [R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
    Parser<R12, C>,
  ],
  transformer: Transformer<
    [R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
    Parser<R12, C>,
    Parser<R13, C>,
  ],
  transformer: Transformer<
    [R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
    Parser<R12, C>,
    Parser<R13, C>,
    Parser<R14, C>,
  ],
  transformer: Transformer<
    [R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
    Parser<R12, C>,
    Parser<R13, C>,
    Parser<R14, C>,
    Parser<R15, C>,
  ],
  transformer: Transformer<
    [R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
    Parser<R12, C>,
    Parser<R13, C>,
    Parser<R14, C>,
    Parser<R15, C>,
    Parser<R16, C>,
  ],
  transformer: Transformer<
    [R0, R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14, R15, R16],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
    Parser<R12, C>,
    Parser<R13, C>,
    Parser<R14, C>,
    Parser<R15, C>,
    Parser<R16, C>,
    Parser<R17, C>,
  ],
  transformer: Transformer<
    [
      R0,
      R1,
      R2,
      R3,
      R4,
      R5,
      R6,
      R7,
      R8,
      R9,
      R10,
      R11,
      R12,
      R13,
      R14,
      R15,
      R16,
      R17,
    ],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
    Parser<R12, C>,
    Parser<R13, C>,
    Parser<R14, C>,
    Parser<R15, C>,
    Parser<R16, C>,
    Parser<R17, C>,
    Parser<R18, C>,
  ],
  transformer: Transformer<
    [
      R0,
      R1,
      R2,
      R3,
      R4,
      R5,
      R6,
      R7,
      R8,
      R9,
      R10,
      R11,
      R12,
      R13,
      R14,
      R15,
      R16,
      R17,
      R18,
    ],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  R19,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
    Parser<R12, C>,
    Parser<R13, C>,
    Parser<R14, C>,
    Parser<R15, C>,
    Parser<R16, C>,
    Parser<R17, C>,
    Parser<R18, C>,
    Parser<R19, C>,
  ],
  transformer: Transformer<
    [
      R0,
      R1,
      R2,
      R3,
      R4,
      R5,
      R6,
      R7,
      R8,
      R9,
      R10,
      R11,
      R12,
      R13,
      R14,
      R15,
      R16,
      R17,
      R18,
      R19,
    ],
    Out,
    C
  >,
): Parser<Out, C>;
// prettier-ignore
export function applyPipe<
  R0,
  R1,
  R2,
  R3,
  R4,
  R5,
  R6,
  R7,
  R8,
  R9,
  R10,
  R11,
  R12,
  R13,
  R14,
  R15,
  R16,
  R17,
  R18,
  R19,
  R20,
  Out,
  C,
>(
  parsers: [
    Parser<R0, C>,
    Parser<R1, C>,
    Parser<R2, C>,
    Parser<R3, C>,
    Parser<R4, C>,
    Parser<R5, C>,
    Parser<R6, C>,
    Parser<R7, C>,
    Parser<R8, C>,
    Parser<R9, C>,
    Parser<R10, C>,
    Parser<R11, C>,
    Parser<R12, C>,
    Parser<R13, C>,
    Parser<R14, C>,
    Parser<R15, C>,
    Parser<R16, C>,
    Parser<R17, C>,
    Parser<R18, C>,
    Parser<R19, C>,
    Parser<R20, C>,
  ],
  transformer: Transformer<
    [
      R0,
      R1,
      R2,
      R3,
      R4,
      R5,
      R6,
      R7,
      R8,
      R9,
      R10,
      R11,
      R12,
      R13,
      R14,
      R15,
      R16,
      R17,
      R18,
      R19,
      R20,
    ],
    Out,
    C
  >,
): Parser<Out, C>;
// Impl
export function applyPipe<V, Out, Ctx>(
  parsers: Array<Parser<V, Ctx>>,
  transformer: Transformer<Array<V>, Out, Ctx>,
): Parser<Out, Ctx>;
export function applyPipe<V, Out, Ctx>(
  parsers: Array<Parser<V, Ctx>>,
  transformer: Transformer<any, Out, Ctx>,
): Parser<Out, Ctx> {
  return apply(pipe(...parsers), transformer);
}

export function named<T, Ctx>(
  name: string,
  parser: Parser<T, Ctx>,
): Parser<T, Ctx> {
  return {
    parse: (_parentPath, input, skip, ctx) =>
      parser.parse(LinkedList.create<string>().add(name), input, skip, ctx),
  };
}

export function reduceRight<I, C, O, Ctx>(
  init: Parser<I, Ctx>,
  condition: Parser<C, Ctx>,
  transform: (
    result: ParseResultSuccess<I | O>,
    right: ParseResultSuccess<C>,
    path: LinkedList<string>,
    ctx: Ctx,
  ) => ParseResult<O>,
): Parser<O, Ctx> {
  return {
    parse(parentPath, input, skip, ctx) {
      const path = parentPath.add(`ReduceRight`);
      const pathInit = path.add("init");
      const conditionInit = path.add("condition");
      if (skip.includes(init)) {
        return ParseFailure(
          input.position,
          path,
          () => `Init is skipped to prevent recursive`,
        );
      }
      const initParsed = init.parse(pathInit, input, [...skip, init], ctx);
      if (initParsed.type === "Failure") {
        return ParseFailure(
          input.position,
          pathInit,
          () => `Init did not match`,
          initParsed,
        );
      }
      let current = initParsed.rest;
      let cond = condition.parse(conditionInit, current, [], ctx);
      if (cond.type === "Failure") {
        return ParseFailure(
          current.position,
          conditionInit,
          () => `Condition did not match`,
          cond,
        );
      }
      current = cond.rest;
      const firstResult = transform(initParsed, cond, path, ctx);
      if (firstResult.type === "Failure") {
        return firstResult;
      }
      let result = firstResult;
      while (cond.type === "Success") {
        current = cond.rest;
        cond = condition.parse(conditionInit, current, [], ctx);
        if (cond.type === "Success") {
          const nextResult = transform(result, cond, path, ctx);
          if (nextResult.type === "Failure") {
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
    setParser(p) {
      if (parser !== null) {
        throw createUnexpectedError(`Parser already set !`);
      }
      parser = p;
    },
    parse(_parentPath, input, skip, ctx) {
      if (parser === null) {
        throw createParserNotImplemented(name);
      }
      return parser.parse(
        LinkedList.create<string>().add(name),
        input,
        skip,
        ctx,
      );
    },
  };
}
