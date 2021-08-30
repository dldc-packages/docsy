import {
  Document,
  NodeKind,
  Node,
  Child,
  NodeIs,
  Expression,
  ComponentType,
  ElementAny,
  DottableExpression,
  ExpressionDocument,
  AnyComment,
} from './Ast.ts';
import * as Combinator from './Combinator.ts';
import { StringReader } from './StringReader.ts';
import { DocsyError } from './DocsyError.ts';
import { executeParser, failureToStack, ParseFailure, ParseSuccess } from './Parser.ts';
import { Parser, ParseResult, ParseResultSuccess } from './types.ts';

const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const BACKTICK = '`';
const BACKSLASH = '\\';
const NEW_LINE = '\n';

export type Ranges = Map<Node, { start: number; end: number }>;

type Ctx = {
  ranges: Ranges;
  createNode<K extends NodeKind>(
    kind: K,
    start: number,
    end: number,
    children: Node<K>['children'],
    meta: Node<K>['meta']
  ): Node<K>;
};

export const DocsyParser = {
  parseDocument,
  parseExpression,
};

export interface ParseDocumentResult {
  document: Document;
  ranges: Ranges;
}

export interface ParseDocumentExpressionResult {
  expression: ExpressionDocument;
  ranges: Ranges;
}

function createContext(): Ctx {
  const ranges: Ranges = new Map();
  return {
    ranges,
    createNode<K extends NodeKind>(
      kind: K,
      start: number,
      end: number,
      children: Node<K>['children'],
      meta: Node<K>['meta']
    ): Node<K> {
      return createNode(ranges, kind, start, end, children, meta);
    },
  };
}

function parseDocument(file: string): ParseDocumentResult {
  const ctx = createContext();
  const input = StringReader(file);
  const result = executeParser(documentParser, input, ctx);
  if (result.type === 'Failure') {
    throw new DocsyError.ParsingError(failureToStack(result));
  }
  return { document: result.value, ranges: ctx.ranges };
}

function parseExpression(file: string): ParseDocumentExpressionResult {
  const ctx = createContext();
  const input = StringReader(file);
  const result = executeParser(expressionDocumentParser, input, ctx);
  if (result.type === 'Failure') {
    throw new DocsyError.ParsingError(failureToStack(result));
  }
  return { expression: result.value, ranges: ctx.ranges };
}

function createExact<T extends string>(str: T): Parser<T, Ctx> {
  return Combinator.exact<T, Ctx>(str);
}

const elementTokenOpenParser = createExact('<|');
const elementTokenCloseParser = createExact('|>');
const fragmentTokenParser = createExact('<|>');
const rawElementTokenOpenParser = createExact('<#');
const rawElementTokenCloseParser = createExact('#>');
const rawFragmentTokenParser = createExact('<#>');
const lessThanParser = createExact('<');
const greaterThanParser = createExact('>');
const spreadOperatorParser = createExact('...');
const equalParser = createExact('=');
const dotParser = createExact('.');
const commaParser = createExact(',');
const squareBracketOpenParser = createExact('[');
const squareBracketCloseParser = createExact(']');
const curlyBracketOpenParser = createExact('{');
const curlyBracketCloseParser = createExact('}');
const parenthesisOpenParser = createExact('(');
const parenthesisCloseParser = createExact(')');
const colonParser = createExact(':');
const doubleSlashParser = createExact('//');
const blockCommentStartParser = createExact('/*');
const blockCommentEndParser = createExact('*/');
const newLineParser = createExact(NEW_LINE);
const singleQuoteParser = createExact(SINGLE_QUOTE);
const backslashParser = createExact(BACKSLASH);
const doubleQuoteParser = createExact(DOUBLE_QUOTE);
const backtickParser = createExact(BACKTICK);
const eofParser = Combinator.eof<Ctx>();

const expressionParser = Combinator.rule<Expression, Ctx>('Expression');
const dottableExpressionParser = Combinator.rule<DottableExpression, Ctx>('DottableExpression');
const childParser = Combinator.rule<Child, Ctx>('Child');
const rawChildParser = Combinator.rule<Child | Array<Child>, Ctx>('RawChild');
const unrawChildParser = Combinator.rule<Child, Ctx>('Child');
const unrawElementAnyParser = Combinator.rule<ElementAny, Ctx>('ElementAny');
const anyCommentParser = Combinator.rule<AnyComment, Ctx>('AnyComment');

const whitespaceParser = Combinator.apply(Combinator.regexp<Ctx>(/^\s+/g), (content, start, end, ctx) => {
  const hasNewLine = content.indexOf('\n') >= 0;
  return ctx.createNode('Whitespace', start, end, {}, { content, hasNewLine });
});

const identifierParser = Combinator.apply(
  Combinator.regexp<Ctx>(/^[A-Za-z][A-Za-z0-9_$]*/g),
  (identifier, start, end, ctx) => ctx.createNode('Identifier', start, end, {}, { name: identifier })
);

const numberParser = Combinator.apply(
  Combinator.regexp<Ctx>(/^[+-]?((\d+(\.\d+)?)|(\.(\d+)))/g),
  (rawValue, start, end, ctx) => ctx.createNode('Num', start, end, {}, { value: parseFloat(rawValue), rawValue })
);

const booleanParser = Combinator.apply(
  Combinator.oneOf('Bool', createExact('true'), createExact('false')),
  (val, start, end, ctx) => ctx.createNode('Bool', start, end, {}, { value: val === 'true' ? true : false })
);

const nullParser = Combinator.apply(createExact('null'), (_null, start, end, ctx) =>
  ctx.createNode('Null', start, end, {}, {})
);

const undefinedParser = Combinator.apply(createExact('undefined'), (_null, start, end, ctx) =>
  ctx.createNode('Undefined', start, end, {}, {})
);

const maybeWhitespaceParser = Combinator.maybe(whitespaceParser);

const notNewLineParser = Combinator.singleChar<Ctx>('NotNewLine', (char) => char !== '\n');

const escapedStringValue = Combinator.apply(
  Combinator.pipe('EscapedString', backslashParser, notNewLineParser),
  ([_backslash, char]) => {
    return char;
  }
);

const createStringParser = <Q>(name: string, quote: Parser<Q, Ctx>, contentRegexp: RegExp) =>
  Combinator.apply(
    Combinator.pipe(
      name,
      quote,
      Combinator.many(
        'StringContent',
        Combinator.oneOf('StringContent', escapedStringValue, Combinator.regexp(contentRegexp))
      ),
      quote
    ),
    ([q1, content, _q2]) => ({ quote: q1, content: content.join('') })
  );

const singleQuoteStringParser = createStringParser('SingleQuoteString', singleQuoteParser, /^[^\\\n']+/g);

const doubleQuoteStringParser = createStringParser('DoubleQuoteString', doubleQuoteParser, /^[^\\\n"]+/g);

const backtickStringParser = createStringParser('BacktickString', backtickParser, /^[^\\`]+/g);

const stringParser = Combinator.apply(
  Combinator.oneOf('String', singleQuoteStringParser, doubleQuoteStringParser, backtickStringParser),
  (data, start, end, ctx) => {
    const quote = data.quote === SINGLE_QUOTE ? 'Single' : data.quote === DOUBLE_QUOTE ? 'Double' : 'Backtick';
    return ctx.createNode('Str', start, end, {}, { value: data.content, quote });
  }
);

const emptyArrayParser = Combinator.apply(
  Combinator.pipe('EmptyArray', squareBracketOpenParser, Combinator.maybe(whitespaceParser), squareBracketCloseParser),
  ([_open, whitespace, _close], start, end, ctx) => {
    return ctx.createNode('EmptyArray', start, end, { whitespace }, {});
  }
);

const emptyObjectParser = Combinator.apply(
  Combinator.pipe('EmptyObject', curlyBracketOpenParser, Combinator.maybe(whitespaceParser), curlyBracketCloseParser),
  ([_open, whitespace, _close], start, end, ctx) => {
    return ctx.createNode('EmptyObject', start, end, { whitespace }, {});
  }
);

const parenthesisParser = Combinator.apply(
  Combinator.pipe('Parenthesis', parenthesisOpenParser, expressionParser, parenthesisCloseParser),
  ([_open, value], start, end, ctx) => {
    return ctx.createNode('Parenthesis', start, end, { value }, {});
  }
);

const spreadParser = Combinator.apply(
  Combinator.pipe('Spread', spreadOperatorParser, expressionParser),
  ([_op, target], start, end, ctx) => {
    return ctx.createNode('Spread', start, end, { target }, {});
  }
);

const arrayItemParser = Combinator.apply(
  Combinator.pipe(
    'ArrayItem',
    maybeWhitespaceParser,
    Combinator.oneOf('ArrayItemInner', spreadParser, expressionParser),
    maybeWhitespaceParser
  ),
  ([whitespaceBefore, item, whitespaceAfter], start, end, ctx) => {
    return ctx.createNode('ArrayItem', start, end, { whitespaceBefore, item, whitespaceAfter }, {});
  }
);

const arrayItemsParser = Combinator.manySepBy('ArrayItems', arrayItemParser, commaParser, true);

const arrayParser = Combinator.apply(
  Combinator.pipe(
    'Array',
    squareBracketOpenParser,
    arrayItemsParser,
    Combinator.maybe(commaParser),
    squareBracketCloseParser
  ),
  ([_open, { items, trailing }, _close], start, end, ctx) => {
    return ctx.createNode('Array', start, end, { items }, { trailingComma: trailing });
  }
);

const lineCommentParser = Combinator.apply(
  Combinator.pipe(
    'LineComment',
    doubleSlashParser,
    Combinator.maybe(Combinator.regexp(/^[^\n]+/g)),
    Combinator.oneOf('LineCommentEnd', eofParser, newLineParser)
  ),
  ([_start, content], start, end, ctx) => {
    return ctx.createNode('LineComment', start, end, {}, { content: content || '' });
  }
);

const blockCommentParser = Combinator.apply(
  Combinator.pipe(
    'BlockComment',
    blockCommentStartParser,
    Combinator.maybe(Combinator.whileNotMatch('BlockCommentContent', ['*/'])),
    blockCommentEndParser
  ),
  ([_start, content], start, end, ctx) => {
    return ctx.createNode('BlockComment', start, end, {}, { content: content || '' });
  }
);

const propertyShorthandParser = Combinator.apply(identifierParser, (name, start, end, ctx) => {
  return ctx.createNode('PropertyShorthand', start, end, { name }, {});
});

const propertyNameParser = Combinator.oneOf('PropertyName', identifierParser, stringParser);

const propertyParser = Combinator.apply(
  Combinator.pipe(
    'Property',
    propertyNameParser,
    maybeWhitespaceParser,
    colonParser,
    maybeWhitespaceParser,
    expressionParser
  ),
  ([name, whitespaceBeforeColon, _colon, whitespaceAfterColon, value], start, end, ctx) => {
    return createNode(
      ctx.ranges,
      'Property',
      start,
      end,
      { name, value, whitespaceAfterColon, whitespaceBeforeColon },
      {}
    );
  }
);

const computedPropertyParser = Combinator.apply(
  Combinator.pipe(
    'ComputedProperty',
    squareBracketOpenParser,
    expressionParser,
    squareBracketCloseParser,
    maybeWhitespaceParser,
    colonParser,
    maybeWhitespaceParser,
    expressionParser
  ),
  (
    [_openBracket, expression, _closeBracket, whitespaceBeforeColon, _colon, whitespaceAfterColon, value],
    start,
    end,
    ctx
  ) => {
    return createNode(
      ctx.ranges,
      'ComputedProperty',
      start,
      end,
      { expression, whitespaceBeforeColon, value, whitespaceAfterColon },
      {}
    );
  }
);

const objectItemParser = Combinator.apply(
  Combinator.pipe(
    'ObjectItem',
    maybeWhitespaceParser,
    Combinator.oneOf('ObjectItemInner', propertyParser, propertyShorthandParser, spreadParser, computedPropertyParser),
    maybeWhitespaceParser
  ),
  ([whitespaceBefore, item, whitespaceAfter], start, end, ctx) => {
    return ctx.createNode('ObjectItem', start, end, { whitespaceBefore, item, whitespaceAfter }, {});
  }
);

const objectParser = Combinator.apply(
  Combinator.pipe(
    'Object',
    curlyBracketOpenParser,
    Combinator.manySepBy('ObjectInner', objectItemParser, commaParser, true),
    curlyBracketCloseParser
  ),
  ([_open, { items, trailing }, _close], start, end, ctx) => {
    return ctx.createNode('Object', start, end, { items }, { trailingComma: trailing });
  }
);

const elementTypeMemberParser: Parser<Node<'ElementTypeMember'>, Ctx> = Combinator.reduceRight(
  'ElementTypeMember',
  identifierParser,
  Combinator.pipe('ElementTypeMemberInner', dotParser, identifierParser),
  (left, right, ctx): ParseResult<Node<'ElementTypeMember'>> => {
    const [, identifier] = right.value;
    const start = left.start;
    const end = right.end;

    return ParseSuccess(
      start,
      right.rest,
      ctx.createNode('ElementTypeMember', start, end, { target: left.value, property: identifier }, {})
    );
  }
);

const componentTypeParser = Combinator.oneOf('ComponentType', elementTypeMemberParser, identifierParser);

const primitiveParser = Combinator.oneOf(
  'Primitive',
  numberParser,
  booleanParser,
  nullParser,
  undefinedParser,
  stringParser
);

const propNoValue = Combinator.apply(identifierParser, (name, start, end, ctx) => {
  return ctx.createNode('PropNoValue', start, end, { name }, {});
});

const propValue = Combinator.apply(
  Combinator.pipe('PropValue', identifierParser, equalParser, expressionParser),
  ([name, _equal, value], start, end, ctx) => {
    return ctx.createNode('PropValue', start, end, { name, value }, {});
  }
);

const propBlockCommentParser = Combinator.apply(
  Combinator.pipe(
    'PropBlockComment',
    blockCommentStartParser,
    Combinator.maybe(Combinator.whileNotMatch('NotBlockCommentEnd', ['*/'])),
    blockCommentEndParser
  ),
  ([_start, content], start, end, ctx) => {
    return ctx.createNode('PropBlockComment', start, end, {}, { content: content || '' });
  }
);

const propLineCommentParser = Combinator.apply(
  Combinator.pipe(
    'PropLineComment',
    doubleSlashParser,
    Combinator.maybe(Combinator.regexp(/^[^\n]+/g)),
    Combinator.oneOf('PropLineCommentEnd', eofParser, newLineParser)
  ),
  ([_start, content], start, end, ctx) => {
    return ctx.createNode('PropLineComment', start, end, {}, { content: content || '' });
  }
);

const propParser = Combinator.oneOf('Prop', propValue, propNoValue, propBlockCommentParser, propLineCommentParser);

const propItemParser = Combinator.apply(
  Combinator.pipe('PropItem', whitespaceParser, propParser),
  ([whitespace, item], start, end, ctx) => {
    return ctx.createNode('PropItem', start, end, { item, whitespaceBefore: whitespace }, {});
  }
);

const propsParser = Combinator.apply(
  Combinator.pipe('Props', Combinator.many('PropsInner', propItemParser), Combinator.maybe(whitespaceParser)),
  ([items, whitespaceAfter], start, end, ctx) => {
    return ctx.createNode('Props', start, end, { items, whitespaceAfter }, {});
  }
);

const elementSelfClosingParser = Combinator.apply(
  Combinator.pipe(
    'SelfClosingElement',
    elementTokenOpenParser,
    componentTypeParser,
    propsParser,
    elementTokenCloseParser
  ),
  ([_tagOpen, component, props], start, end, ctx) => {
    return ctx.createNode('SelfClosingElement', start, end, { component, props }, { namedCloseTag: false });
  }
);

const textParser = Combinator.apply(
  Combinator.whileNotMatch<Ctx>('Text', [' ', '\n', '\t', '\r', '|>', '<', '//']),
  (content, start, end, ctx) => ctx.createNode('Text', start, end, {}, { content })
);

const rawTextParser = Combinator.apply(
  Combinator.oneOf(
    'RawText',
    Combinator.whileNotMatch<Ctx>('RawTextInner', ['#>', '<']),
    Combinator.singleChar<Ctx>('RawTextInner')
  ),
  (content, start, end, ctx) => {
    return ctx.createNode('Text', start, end, {}, { content });
  }
);

const elementOpeningTagParser = Combinator.pipe(
  'ElementOpeningTag',
  elementTokenOpenParser,
  componentTypeParser,
  propsParser,
  greaterThanParser
);

const elementClosingTagParser = Combinator.pipe(
  'ElementClosingTag',
  lessThanParser,
  componentTypeParser,
  elementTokenCloseParser
);

const elementClosingParser = Combinator.oneOf('ElementClosing', elementTokenCloseParser, elementClosingTagParser);

const elementParser = Combinator.transform(
  Combinator.manyBetween('Element', elementOpeningTagParser, childParser, elementClosingParser),
  (result, ctx) => {
    if (result.type === 'Failure') {
      return result;
    }

    const [open, children, close] = result.value;
    const [, componentType, props] = open;
    const closeComponentType = typeof close === 'string' ? componentType : close[1];
    if (!sameComponent(componentType, closeComponentType)) {
      const closeRange = ctx.ranges.get(closeComponentType);
      return ParseFailure(closeRange?.end ?? 0, 'Element', `Invalid close tag: wrong component`);
    }
    const node = createNode(
      ctx.ranges,
      'Element',
      result.start,
      result.end,
      {
        children: normalizeChildren(children, true, ctx.ranges),
        component: componentType,
        props,
      },
      {
        namedCloseTag: typeof close !== 'string',
      }
    );
    return {
      ...result,
      value: node,
    };
  }
);

const rawElementOpeningTagParser = Combinator.pipe(
  'RawElementOpeningTag',
  rawElementTokenOpenParser,
  componentTypeParser,
  propsParser,
  greaterThanParser
);

const rawElementClosingTagParser = Combinator.pipe(
  'RawElementClosingTag',
  lessThanParser,
  componentTypeParser,
  rawElementTokenCloseParser
);

const rawElementClosingParser = Combinator.oneOf(
  'RawElementClosing',
  rawElementTokenCloseParser,
  rawElementClosingTagParser
);

const rawElementParser = Combinator.transform(
  Combinator.manyBetween('RawElement', rawElementOpeningTagParser, rawChildParser, rawElementClosingParser),
  (result, ctx) => {
    if (result.type === 'Failure') {
      return result;
    }

    const [open, children, close] = result.value;
    const [, componentType, props] = open;
    const closeComponentType = typeof close === 'string' ? componentType : close[1];

    if (!sameComponent(componentType, closeComponentType)) {
      const closeRange = ctx.ranges.get(closeComponentType);
      return ParseFailure(closeRange?.end ?? 0, 'Element', `Invalid close tag: wrong component`);
    }

    const childrenFlat: Array<Child> = [];
    children.forEach((child) => {
      if (Array.isArray(child)) {
        childrenFlat.push(...child);
      } else {
        childrenFlat.push(child);
      }
    });

    const node = createNode(
      ctx.ranges,
      'RawElement',
      result.start,
      result.end,
      {
        children: normalizeChildren(childrenFlat, false, ctx.ranges),
        component: componentType,
        props,
      },
      {
        namedCloseTag: typeof close !== 'string',
      }
    );
    return {
      ...result,
      value: node,
    };
  }
);

const fragmentParser = Combinator.apply(
  Combinator.manyBetween('Fragment', fragmentTokenParser, childParser, fragmentTokenParser),
  ([_open, children], start, end, ctx) => {
    return createNode(ctx.ranges, 'Fragment', start, end, normalizeChildren(children, true, ctx.ranges), {});
  }
);

const rawFragmentParser = Combinator.apply(
  Combinator.manyBetween('RawFragment', rawFragmentTokenParser, rawTextParser, rawFragmentTokenParser),
  ([_open, children], start, end, ctx) => {
    return createNode(ctx.ranges, 'RawFragment', start, end, normalizeChildren(children, true, ctx.ranges), {});
  }
);

const unrawElementParser = Combinator.apply(
  Combinator.manyBetween('UnrawElement', rawFragmentTokenParser, unrawChildParser, rawFragmentTokenParser),
  ([_begin, items], _start, _end, ctx) => normalizeChildren(items, true, ctx.ranges)
);

const injectParser = Combinator.apply(
  Combinator.pipe(
    'Inject',
    curlyBracketOpenParser,
    maybeWhitespaceParser,
    expressionParser,
    maybeWhitespaceParser,
    curlyBracketCloseParser
  ),
  ([_begin, whitespaceBefore, value, whitespaceAfter], start, end, ctx) => {
    return ctx.createNode('Inject', start, end, { whitespaceBefore, value, whitespaceAfter }, {});
  }
);

unrawChildParser.setParser(
  Combinator.oneOf('UnrawChild', whitespaceParser, anyCommentParser, unrawElementAnyParser, textParser)
);

rawChildParser.setParser(Combinator.oneOf('RawChild', unrawElementParser, rawTextParser));

const elementAnyParser: Parser<ElementAny, Ctx> = Combinator.oneOf(
  'ElementAny',
  fragmentParser,
  rawFragmentParser,
  elementSelfClosingParser,
  elementParser,
  rawElementParser
);

// All elements except rawFragment
unrawElementAnyParser.setParser(
  Combinator.oneOf('UnrawElementAny', fragmentParser, elementSelfClosingParser, elementParser, rawElementParser)
);

childParser.setParser(
  Combinator.oneOf('Child', whitespaceParser, anyCommentParser, elementAnyParser, injectParser, textParser)
);

type AccessItem =
  | { type: 'DotMember'; indentifier: Node<'Identifier'>; end: number }
  | { type: 'BracketMember'; value: Expression; end: number }
  | {
      type: 'FunctionCall';
      args: Array<Node<'ArrayItem'>>;
      trailingComma: boolean;
      end: number;
    };

const dotMemberParser = Combinator.apply(
  Combinator.pipe('DotMember', dotParser, identifierParser),
  ([_dot, indentifier], _start, end): AccessItem => ({ type: 'DotMember', indentifier, end })
);

const bracketMemberParser = Combinator.apply(
  Combinator.pipe('BracketMember', squareBracketOpenParser, expressionParser, squareBracketCloseParser),
  ([_bracket, value], _start, end): AccessItem => ({ type: 'BracketMember', value, end })
);

const functionCallParser = Combinator.apply(
  Combinator.pipe('FunctionCall', parenthesisOpenParser, arrayItemsParser, parenthesisCloseParser),
  ([_parenthesis, { items, trailing }], _start, end): AccessItem => ({
    type: 'FunctionCall',
    args: items,
    trailingComma: trailing,
    end,
  })
);

const accessItemParser = Combinator.oneOf('AccessItem', dotMemberParser, bracketMemberParser, functionCallParser);

const accessParser = Combinator.reduceRight(
  'Access',
  dottableExpressionParser,
  accessItemParser,
  (left: ParseResultSuccess<DottableExpression>, right, ctx): ParseResult<DottableExpression> => {
    const start = left.start;
    const end = right.end;
    const item = right.value;
    const target = left.value;
    if (item.type === 'DotMember') {
      return ParseSuccess(
        start,
        right.rest,
        ctx.createNode('DotMember', start, end, { target, property: item.indentifier }, {})
      );
    }
    if (item.type === 'BracketMember') {
      return ParseSuccess(
        start,
        right.rest,
        ctx.createNode('BracketMember', start, end, { target, property: item.value }, {})
      );
    }
    if (item.type === 'FunctionCall') {
      if (NodeIs.CallableExpression(target)) {
        return ParseSuccess(
          start,
          right.rest,
          createNode(
            ctx.ranges,
            'FunctionCall',
            start,
            end,
            { target, arguments: item.args },
            { trailingComma: item.trailingComma }
          )
        );
      }
      return ParseFailure(item.end, 'Access', `FunctionCall target id not a callable`);
    }
    throw new DocsyError.UnexpectedError(`Access on invalid type`);
  }
);

const callableExpressionParser = Combinator.oneOf(
  'CallableExpression',
  accessParser,
  identifierParser,
  parenthesisParser
);

const arrayOrObjectParser = Combinator.oneOf(
  'ArrayOrObject',
  emptyArrayParser,
  arrayParser,
  emptyObjectParser,
  objectParser
);

expressionParser.setParser(
  Combinator.oneOf('Expression', primitiveParser, callableExpressionParser, arrayOrObjectParser, elementAnyParser)
);

dottableExpressionParser.setParser(
  Combinator.oneOf('DottableExpression', arrayOrObjectParser, elementAnyParser, callableExpressionParser, stringParser)
);

anyCommentParser.setParser(Combinator.oneOf('AnyComment', lineCommentParser, blockCommentParser));

const documentParser = Combinator.apply(
  Combinator.pipe('Document', Combinator.many('DocumentChildren', childParser), eofParser),
  ([children], start, end, ctx) => {
    return ctx.createNode('Document', start, end, normalizeChildren(children, true, ctx.ranges), {});
  }
);

const whitespaceOrCommentParser = Combinator.oneOf('WhitespaceOrComment', whitespaceParser, anyCommentParser);

const expressionDocumentParser = Combinator.apply(
  Combinator.pipe(
    'ExpressionDocument',
    Combinator.many('WhitespaceOrComments', whitespaceOrCommentParser),
    expressionParser,
    Combinator.many('WhitespaceOrComments', whitespaceOrCommentParser)
  ),
  ([before, value, after], start, end, ctx) =>
    createNode(
      ctx.ranges,
      'ExpressionDocument',
      start,
      end,
      {
        before,
        value,
        after,
      },
      {}
    )
);

function sameComponent(left: ComponentType, right: ComponentType): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (NodeIs.Identifier(left) && NodeIs.Identifier(right) && left.meta.name === right.meta.name) {
    return true;
  }
  if (NodeIs.ElementTypeMember(left) && NodeIs.ElementTypeMember(right)) {
    return (
      sameComponent(left.children.target, right.children.target) &&
      sameComponent(left.children.property, right.children.property)
    );
  }
  return false;
}

function normalizeChildren(nodes: Array<Child>, mergeWhitespaces: boolean, ranges: Ranges): Array<Child> {
  const result: Array<Child> = [];
  nodes.forEach((child, i) => {
    if (i === 0) {
      result.push(child);
      return;
    }
    const last = result[result.length - 1];
    if (!ranges.get(last)) {
      console.log({
        last,
      });
    }
    const lastRange = notNil(ranges.get(last));
    const childRange = notNil(ranges.get(child));
    if (
      // text + text => text
      (NodeIs.Text(last) && NodeIs.Text(child)) ||
      // whitespace + text => text
      (mergeWhitespaces && NodeIs.Whitespace(last) && NodeIs.Text(child)) ||
      // text + whitespace => text
      (mergeWhitespaces && NodeIs.Text(last) && NodeIs.Whitespace(child))
    ) {
      // Collapse textNode
      result.pop();
      ranges.delete(last);
      result.push(
        createNode(
          ranges,
          'Text',
          lastRange.start,
          childRange.end,
          {},
          { content: last.meta.content + child.meta.content }
        )
      );
      return;
    }
    result.push(child);
  });
  return result;
}

function createNode<K extends NodeKind>(
  ranges: Ranges,
  kind: K,
  start: number,
  end: number,
  children: Node<K>['children'],
  meta: Node<K>['meta']
): Node<K> {
  const node: Node<K> = { kind, children, meta } as any;
  ranges.set(node, { start, end });
  return node;
}

function notNil<T>(val: T | null | undefined, errorMessage?: string): T {
  if (val === null || val === undefined) {
    throw new DocsyError.UnexpectedError(errorMessage || `Unexpected nil value`);
  }
  return val;
}
