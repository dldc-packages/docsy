import * as p from './parsers.ts';
import { ParserContext as Ctx } from './ParserContext.ts';
import { Parser } from './types.ts';

export const eof = p.eof<Ctx>();

// String based
export const SINGLE_QUOTE = "'";
export const DOUBLE_QUOTE = '"';
export const BACKTICK = '`';
const NEW_LINE_CHAR = '\n';

export const lineCommentStart = exact('//');
export const newLine = exact(NEW_LINE_CHAR);
export const blockCommentStart = exact('/*');
export const blockCommentEnd = exact('*/');
export const trueToken = exact('true');
export const falseToken = exact('false');
export const nullToken = exact('null');
export const undefinedToken = exact('undefined');
export const singleQuote = exact(SINGLE_QUOTE);
export const doubleQuote = exact(DOUBLE_QUOTE);
export const backtick = exact(BACKTICK);
export const dot = exact('.');
export const parenthesisOpen = exact('(');
export const parenthesisClose = exact(')');
export const squareBracketOpen = exact('[');
export const squareBracketClose = exact(']');
export const comma = exact(',');
export const curlyBracketOpen = exact('{');
export const curlyBracketClose = exact('}');
export const greaterThan = exact('>');
export const elementSelfClosingEnd = exact('/>');
export const fragmentToken = exact('<|>');
export const rawFragmentToken = exact('<#>');
export const elementCloseShortcut = exact('</>');
export const colon = exact(':');
export const spreadOperator = exact('...');
export const equal = exact('=');
export const lessThan = exact('<');
export const elementCloseEnd = exact(`/>`);
export const elementOpenStart = exact('<|');
export const elementRawOpenStart = exact('<#');
export const elementSelfClosingStart = exact('</');

// export const rawElementTokenOpen = exact('<#');
// export const rawElementTokenClose = exact('#>');

// Regexp based

const WHITESPACE = `\\s`;
const STAR = `\\*`;
const SLASH = '\\/';
const NEW_LINE = `\\n`;
const DIGIT = `\\d`;
const DOT = `\\.`;
const BACKSLASH = `\\\\`;
const PIPE = '\\|';

const BLOCK_COMMENT_END = `${STAR}${SLASH}`;
const NEGATIVE_BLOCK_COMMENT_END = `(?!${BLOCK_COMMENT_END})`;
const ANYTHING = `(.|${NEW_LINE})`;
const NUM_VARIANT_1 = `(${DIGIT}+(${DOT}${DIGIT}+)?)`;
const NUM_VARIANT_2 = `(${DOT}${DIGIT}+)`;
const ESCAPE_SINGLE_QUOTE = `${BACKSLASH}'`;
const NOT_SINGLE_QUOTE_END = `[^'${NEW_LINE}]`;
const NOT_DOUBLE_QUOTE_END = `[^"${NEW_LINE}]`;
const NOT_BACKTICK_QUOTE_END = `[^\`]`;
const ESCAPE_DOUBLE_QUOTE = `${BACKSLASH}"`;
const ESCAPE_BACKTICK_QUOTE = `${BACKSLASH}${BACKTICK}`;
const IDENTIFIER = `([A-Za-z][A-Za-z0-9_$]*)`;
const ELEMENT_NAME = `(${IDENTIFIER}(${DOT}${IDENTIFIER})*)`;
const INJECT_START = `{`;
const ELEM_OPEN = `(<${PIPE}${ELEMENT_NAME})`;
const RAW_ELEM_OPEN = `(<#${ELEMENT_NAME})`;
const LINE_ELEM_OPEN = `(<${ELEMENT_NAME})`;
const FRAGMENT_OPEN = `(<${PIPE}>)`;
const RAW_FRAGMENT_OPEN = `(<#>)`;
const SELF_CLOSING_ELEM_OPEN = `(<${SLASH}${ELEMENT_NAME})`;
const ELEM_CLOSE = `(<${ELEMENT_NAME}${SLASH}>)`;
const ELEM_SHORT_CLOSE = `(<${SLASH}>)`;
const COMMENT_LINE_START = `${SLASH}${SLASH}`;
const COMMENT_BLOCK_START = `${SLASH}${STAR}`;
const ANY_ELEM = `${INJECT_START}|${ELEM_OPEN}|${RAW_ELEM_OPEN}|${LINE_ELEM_OPEN}|${FRAGMENT_OPEN}|${RAW_FRAGMENT_OPEN}|${SELF_CLOSING_ELEM_OPEN}|${ELEM_CLOSE}|${ELEM_SHORT_CLOSE}|${COMMENT_LINE_START}|${COMMENT_BLOCK_START}`;

export const whitespace = regexp(`${WHITESPACE}+`, 'whitespace');
export const elemName = regexp(`${ELEMENT_NAME}`, 'elemName');
export const lineWhitespace = regexp(`[ \t]+`, 'lineWhitespace');
export const lineCommentContent = regexp(`.+`, 'lineCommentContent');
export const blockCommentContent = regexp(`(${NEGATIVE_BLOCK_COMMENT_END}${ANYTHING})+`, 'blockCommentContent');
export const number = regexp(`[+-]?(${NUM_VARIANT_1}|${NUM_VARIANT_2})`, 'number');
export const singleQuoteStringContent = regexp(
  `((${ESCAPE_SINGLE_QUOTE})|${NOT_SINGLE_QUOTE_END})+`,
  'singleQuoteStringContent'
);
export const doubleQuoteStringContent = regexp(
  `((${ESCAPE_DOUBLE_QUOTE})|${NOT_DOUBLE_QUOTE_END})+`,
  'doubleQuoteStringContent'
);
export const backtickStringContent = regexp(
  `((${ESCAPE_BACKTICK_QUOTE})|${NOT_BACKTICK_QUOTE_END})+`,
  'backtickStringContent'
);
export const identifier = regexp(IDENTIFIER, 'identifier');
export const textContent = regexp(`${ANYTHING}*?(?=$|${ANY_ELEM})`, 'textContent');
export const lineTextContent = regexp(`.*?(?=$|${NEW_LINE}|${ANY_ELEM})`, 'lineTextContent');
export const rawTextContent = regexp(`${ANYTHING}*?(?=${ELEM_CLOSE}|${ELEM_SHORT_CLOSE})`, 'rawTextContent');
// export const elementOpenStart = regexp(ELEM_OPEN, 'elementOpenStart');
// export const elementClose = regexp(ELEM_CLOSE, 'elementClose');
// export const elementRawOpenStart = regexp(RAW_ELEM_OPEN, 'elementRawOpenStart');
// export const elementSelfClosingStart = regexp(SELF_CLOSING_ELEM_OPEN, 'elementSelfClosingStart');
// export const elementLineStart = regexp(LINE_ELEM_OPEN, 'elementLineStart');

function exact<T extends string>(str: T): Parser<T, Ctx> {
  return p.exact<T, Ctx>(str);
}

function regexp(pattern: string, name?: string): p.RegexpParser<Ctx> {
  return p.regexp<Ctx>(new RegExp(`^${pattern}`, 'g'), name);
}
