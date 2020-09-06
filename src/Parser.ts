import {
  Document,
  Nodes,
  NodeType,
  Node,
  Child,
  NodeIs,
  Expression,
  ComponentType,
  ElementAny,
  DottableExpression,
} from './internal/Node';
import * as Combinator from './internal/Combinator';
import { StringReader } from './internal/StringReader';
import {
  IDENTIFIER_START_REGEX,
  IDENTIFIER_REGEX,
  DIGIT_REGEX,
  BACKSLASH,
  SINGLE_QUOTE,
  NEW_LINE,
  DOUBLE_QUOTE,
  BACKTICK,
  WHITESPACES,
} from './internal/constants';

export type Ranges = Map<Node, { start: number; end: number }>;

export const DocsyParser = {
  parseDocument,
};

export interface ParseDocumentResult {
  document: Document;
  ranges: Ranges;
}

function parseDocument(file: string): ParseDocumentResult {
  const elementTokenOpenParser = Combinator.exact('<|');
  const elementTokenCloseParser = Combinator.exact('|>');
  const fragmentTokenParser = Combinator.exact('<|>');
  const rawElementTokenOpenParser = Combinator.exact('<#');
  const rawElementTokenCloseParser = Combinator.exact('#>');
  const rawFragmentTokenParser = Combinator.exact('<#>');
  const lessThanParser = Combinator.exact('<');
  const greaterThanParser = Combinator.exact('>');
  const spreadOperatorParser = Combinator.exact('...');
  const equalParser = Combinator.exact('=');
  const dashParser = Combinator.exact('-');
  const dotParser = Combinator.exact('.');
  const commaParser = Combinator.exact(',');
  const squareBracketOpenParser = Combinator.exact('[');
  const squareBracketCloseParser = Combinator.exact(']');
  const curlyBracketOpenParser = Combinator.exact('{');
  const curlyBracketCloseParser = Combinator.exact('}');
  const parenthesisOpenParser = Combinator.exact('(');
  const parenthesisCloseParser = Combinator.exact(')');
  const colonParser = Combinator.exact(':');
  const doubleSlashParser = Combinator.exact('//');
  const blockCommentStartParser = Combinator.exact('/*');
  const blockCommentEndParser = Combinator.exact('*/');
  const newLineParser = Combinator.exact(NEW_LINE);
  const singleQuoteParser = Combinator.exact(SINGLE_QUOTE);
  const backslashParser = Combinator.exact(BACKSLASH);
  const doubleQuoteParser = Combinator.exact(DOUBLE_QUOTE);
  const backtickParser = Combinator.exact(BACKTICK);

  const intergerParser = Combinator.whileMatch('Integer', isDigit);

  const lazyExpression: Combinator.Parser<Expression> = Combinator.lazy(
    'LazyExpression',
    () => expressionParser
  );
  const lazyDottableExpression: Combinator.Parser<DottableExpression> = Combinator.lazy(
    'LazyDottableExpression',
    () => dottableExpressionParser
  );
  const lazyChildParser: Combinator.Parser<Child> = Combinator.lazy('Child', () => childParser);
  const lazyRawChildParser: Combinator.Parser<Child | Array<Child>> = Combinator.lazy(
    'RawChild',
    () => rawChildParser
  );
  const lazyUnrawChildParser: Combinator.Parser<Child> = Combinator.lazy(
    'UnrawChild',
    () => unrawChildParser
  );
  const lazyUnrawElementAnyParser: Combinator.Parser<ElementAny> = Combinator.lazy(
    'LazyUnrawElementAnyParser',
    () => unrawElementAnyParser
  );
  // const lazyElementAnyParser: Combinator.Parser<ElementAny> = Combinator.lazy(
  //   'LazyElementAnyParser',
  //   () => elementAnyParser
  // );

  const identifierParser = Combinator.transformSuccess(
    Combinator.pipe(
      'Identifier',
      Combinator.singleChar('IdentifierStart', isIdentifierStart),
      Combinator.maybe(Combinator.whileMatch('Identifier', isIdentifier))
    ),
    ([idenitifierStart, content], start, end) =>
      createNode('Identifier', start, end, {}, { name: idenitifierStart + (content || '') })
  );

  const numberParser = Combinator.transformSuccess(
    Combinator.pipe(
      'Num',
      Combinator.maybe(dashParser),
      intergerParser,
      Combinator.maybe(Combinator.pipe(null, dotParser, intergerParser))
    ),
    ([minus, integerPart, maybeDecimal], start, end) => {
      const rawValue =
        (minus || '') + integerPart + (maybeDecimal === null ? '' : '.' + maybeDecimal[1]);
      const value = parseFloat(rawValue);
      return createNode('Num', start, end, {}, { value, rawValue });
    }
  );

  const booleanParser = Combinator.transformSuccess(
    Combinator.oneOf('Bool', Combinator.exact('true'), Combinator.exact('false')),
    (val, start, end) => {
      const value = val === 'true' ? true : false;
      return createNode('Bool', start, end, {}, { value });
    }
  );

  const nullParser = Combinator.named(
    'Null',
    Combinator.transformSuccess(Combinator.exact('null'), (_null, start, end) => {
      return createNode('Null', start, end, {}, {});
    })
  );

  const undefinedParser = Combinator.named(
    'Undefined',
    Combinator.transformSuccess(Combinator.exact('undefined'), (_null, start, end) => {
      return createNode('Undefined', start, end, {}, {});
    })
  );

  const whitespaceParser = Combinator.named(
    'WhiteSpace',
    Combinator.transformSuccess(
      Combinator.whileMatch('Whitespace', isWhitespace),
      (content, start, end) => {
        const hasNewLine = content.indexOf('\n') >= 0;
        return createNode('Whitespace', start, end, {}, { content, hasNewLine });
      }
    )
  );

  const maybeWhitespaceParser = Combinator.maybe(whitespaceParser);

  const notNewLineParser = Combinator.singleChar('NotNewLine', (char) => char !== '\n');

  const escapedStringValue = Combinator.transformSuccess(
    Combinator.pipe(null, backslashParser, notNewLineParser),
    ([_backslash, char]) => {
      return char;
    }
  );

  const createStringParser = <Q>(
    quote: Combinator.Parser<Q>,
    isContent: (char: string) => boolean
  ) =>
    Combinator.transformSuccess(
      Combinator.pipe(
        'Str',
        quote,
        Combinator.many(
          Combinator.oneOf(
            null,
            escapedStringValue,
            Combinator.whileMatch('StringContent', isContent)
          )
        ),
        quote
      ),
      ([q1, content, _q2]) => ({ quote: q1, content: content.join('') })
    );

  const singleQuoteStringParser = createStringParser(singleQuoteParser, isSingleQuoteContent);

  const doubleQuoteStringParser = createStringParser(doubleQuoteParser, isDoubleQuoteContent);

  const backtickStringParser = createStringParser(backtickParser, isBacktickContent);

  const stringParser = Combinator.transformSuccess(
    Combinator.oneOf('Str', singleQuoteStringParser, doubleQuoteStringParser, backtickStringParser),
    (data, start, end) => {
      const quote =
        data.quote === SINGLE_QUOTE
          ? 'Single'
          : data.quote === DOUBLE_QUOTE
          ? 'Double'
          : 'Backtick';
      return createNode('Str', start, end, {}, { value: data.content, quote });
    }
  );

  const emptyArrayParser = Combinator.transformSuccess(
    Combinator.pipe(
      'EmptyArray',
      squareBracketOpenParser,
      Combinator.maybe(whitespaceParser),
      squareBracketCloseParser
    ),
    ([_open, whitespace, _close], start, end) => {
      return createNode('EmptyArray', start, end, { whitespace }, {});
    }
  );

  const emptyObjectParser = Combinator.transformSuccess(
    Combinator.pipe(
      'EmptyObject',
      curlyBracketOpenParser,
      Combinator.maybe(whitespaceParser),
      curlyBracketCloseParser
    ),
    ([_open, whitespace, _close], start, end) => {
      return createNode('EmptyObject', start, end, { whitespace }, {});
    }
  );

  const parenthesisParser = Combinator.transformSuccess(
    Combinator.pipe('Parenthesis', parenthesisOpenParser, lazyExpression, parenthesisCloseParser),
    ([_open, value], start, end) => {
      return createNode('Parenthesis', start, end, { value }, {});
    }
  );

  const spreadParser = Combinator.transformSuccess(
    Combinator.pipe('Spread', spreadOperatorParser, lazyExpression),
    ([_op, target], start, end) => {
      return createNode('Spread', start, end, { target }, {});
    }
  );

  const arrayItemParser = Combinator.transformSuccess(
    Combinator.pipe(
      'ArrayItem',
      maybeWhitespaceParser,
      Combinator.oneOf(null, spreadParser, lazyExpression),
      maybeWhitespaceParser
    ),
    ([whitespaceBefore, item, whitespaceAfter], start, end) => {
      return createNode('ArrayItem', start, end, { whitespaceBefore, item, whitespaceAfter }, {});
    }
  );

  const arrayItemsParser = Combinator.manySepBy(arrayItemParser, commaParser);

  const arrayParser = Combinator.transformSuccess(
    Combinator.pipe('Array', squareBracketOpenParser, arrayItemsParser, squareBracketCloseParser),
    ([_open, items, _close], start, end) => {
      return createNode('Array', start, end, { items }, {});
    }
  );

  const lineCommentParser = Combinator.transformSuccess(
    Combinator.pipe(
      'LineComment',
      doubleSlashParser,
      Combinator.maybe(Combinator.whileMatch('LineCommentContent', isLineCommentContent)),
      Combinator.oneOf(null, Combinator.eof, newLineParser)
    ),
    ([_start, content], start, end) => {
      return createNode('LineComment', start, end, {}, { content: content || '' });
    }
  );

  const blockCommentParser = Combinator.transformSuccess(
    Combinator.pipe(
      'BlockComment',
      blockCommentStartParser,
      Combinator.maybe(Combinator.whileNotMatch('BlockCommentContent', ['*/'])),
      blockCommentEndParser
    ),
    ([_start, content], start, end) => {
      return createNode('BlockComment', start, end, {}, { content: content || '' });
    }
  );

  const commentParser = Combinator.oneOf('Comment', lineCommentParser, blockCommentParser);

  const propertyShorthandParser = Combinator.transformSuccess(
    identifierParser,
    (name, start, end) => {
      return createNode('PropertyShorthand', start, end, { name }, {});
    }
  );

  const propertyNameParser = Combinator.oneOf('PropertyName', identifierParser, stringParser);

  const propertyParser = Combinator.transformSuccess(
    Combinator.pipe(
      'Property',
      propertyNameParser,
      maybeWhitespaceParser,
      colonParser,
      maybeWhitespaceParser,
      lazyExpression
    ),
    ([name, whitespaceBeforeColon, _colon, whitespaceAfterColon, value], start, end) => {
      return createNode(
        'Property',
        start,
        end,
        { name, value, whitespaceAfterColon, whitespaceBeforeColon },
        {}
      );
    }
  );

  const computedPropertyParser = Combinator.transformSuccess(
    Combinator.pipe(
      'ComputedProperty',
      squareBracketOpenParser,
      lazyExpression,
      squareBracketCloseParser,
      maybeWhitespaceParser,
      colonParser,
      maybeWhitespaceParser,
      lazyExpression
    ),
    (
      [
        _openBracket,
        expression,
        _closeBracket,
        whitespaceBeforeColon,
        _colon,
        whitespaceAfterColon,
        value,
      ],
      start,
      end
    ) => {
      return createNode(
        'ComputedProperty',
        start,
        end,
        { expression, whitespaceBeforeColon, value, whitespaceAfterColon },
        {}
      );
    }
  );

  const objectItemParser = Combinator.transformSuccess(
    Combinator.pipe(
      'ObjectItem',
      maybeWhitespaceParser,
      Combinator.oneOf(
        'ObjectItem',
        propertyParser,
        propertyShorthandParser,
        spreadParser,
        computedPropertyParser
      ),
      maybeWhitespaceParser
    ),
    ([whitespaceBefore, item, whitespaceAfter], start, end) => {
      return createNode('ObjectItem', start, end, { whitespaceBefore, item, whitespaceAfter }, {});
    }
  );

  const objectParser = Combinator.transformSuccess(
    Combinator.pipe(
      'Object',
      curlyBracketOpenParser,
      Combinator.manySepBy(objectItemParser, commaParser),
      curlyBracketCloseParser
    ),
    ([_open, items, _close], start, end) => {
      return createNode('Object', start, end, { items }, {});
    }
  );

  const elementTypeMemberParser: Combinator.Parser<Node<
    'ElementTypeMember'
  >> = Combinator.reduceRight(
    'ElementTypeMember',
    identifierParser,
    Combinator.pipe(null, dotParser, identifierParser),
    (left, right): Combinator.ParseResult<Node<'ElementTypeMember'>> => {
      const [, identifier] = right.value;
      const start = left.start;
      const end = right.end;

      return {
        type: 'Success',
        start,
        end,
        value: createNode(
          'ElementTypeMember',
          start,
          end,
          { target: left.value, property: identifier },
          {}
        ),
        rest: right.rest,
        stack: [],
      };
    }
  );

  const componentTypeParser = Combinator.oneOf(
    'ComponentType',
    elementTypeMemberParser,
    identifierParser
  );

  const primitiveParser = Combinator.oneOf(
    'Primitive',
    numberParser,
    booleanParser,
    nullParser,
    undefinedParser,
    stringParser
  );

  const propNoValue = Combinator.transformSuccess(identifierParser, (name, start, end) => {
    return createNode('PropNoValue', start, end, { name }, {});
  });

  const propValue = Combinator.transformSuccess(
    Combinator.pipe('PropValue', identifierParser, equalParser, lazyExpression),
    ([name, _equal, value], start, end) => {
      return createNode('PropValue', start, end, { name, value }, {});
    }
  );

  const propBlockCommentParser = Combinator.transformSuccess(
    Combinator.pipe(
      'PropBlockComment',
      blockCommentStartParser,
      Combinator.maybe(Combinator.whileNotMatch('PropsBlockCommentContent', ['*/'])),
      blockCommentEndParser
    ),
    ([_start, content], start, end) => {
      return createNode('PropBlockComment', start, end, {}, { content: content || '' });
    }
  );

  const propLineCommentParser = Combinator.transformSuccess(
    Combinator.pipe(
      'PropLineComment',
      doubleSlashParser,
      Combinator.maybe(Combinator.whileMatch('PropLineCommentContent', isLineCommentContent)),
      Combinator.oneOf(null, Combinator.eof, newLineParser)
    ),
    ([_start, content], start, end) => {
      return createNode('PropLineComment', start, end, {}, { content: content || '' });
    }
  );

  const propParser = Combinator.oneOf(
    'Props',
    propValue,
    propNoValue,
    propBlockCommentParser,
    propLineCommentParser
  );

  const propItemParser = Combinator.transformSuccess(
    Combinator.pipe('PropItem', whitespaceParser, propParser),
    ([whitespace, item], start, end) => {
      return createNode('PropItem', start, end, { item, whitespaceBefore: whitespace }, {});
    }
  );

  const propsParser = Combinator.transformSuccess(
    Combinator.pipe('Props', Combinator.many(propItemParser), Combinator.maybe(whitespaceParser)),
    ([items, whitespaceAfter], start, end) => {
      return createNode('Props', start, end, { items, whitespaceAfter }, {});
    }
  );

  const elementSelfClosingParser = Combinator.transformSuccess(
    Combinator.pipe(
      'SelfClosingElement',
      elementTokenOpenParser,
      componentTypeParser,
      propsParser,
      elementTokenCloseParser
    ),
    ([_tagOpen, component, props], start, end) => {
      return createNode(
        'SelfClosingElement',
        start,
        end,
        { component, props },
        { namedCloseTag: false }
      );
    }
  );

  const textParser = Combinator.named(
    'Text',
    Combinator.transformSuccess(
      Combinator.whileNotMatch('Text', ['|>', '<', '//', ...WHITESPACES]),
      (content, start, end) => createNode('Text', start, end, {}, { content })
    )
  );

  const rawTextParser = Combinator.transformSuccess(
    Combinator.oneOf(
      'RawText',
      Combinator.whileNotMatch(null, ['#>', '<']),
      Combinator.singleChar('RawSingleChar')
    ),
    (content, start, end) => {
      return createNode('Text', start, end, {}, { content });
    }
  );

  const elementOpeningTagParser = Combinator.pipe(
    'OpeningTag',
    elementTokenOpenParser,
    componentTypeParser,
    propsParser,
    greaterThanParser
  );

  const elementClosingTagParser = Combinator.pipe(
    `NamedClosingTag`,
    lessThanParser,
    componentTypeParser,
    elementTokenCloseParser
  );

  const elementClosingParser = Combinator.oneOf(
    'ClosingTag',
    elementTokenCloseParser,
    elementClosingTagParser
  );

  const elementParser = Combinator.transform(
    Combinator.manyBetween(
      'Element',
      elementOpeningTagParser,
      lazyChildParser,
      elementClosingParser
    ),
    (result) => {
      if (result.type === 'Failure') {
        return result;
      }

      const [open, children, close] = result.value;
      const [, componentType, props] = open;
      const closeComponentType = typeof close === 'string' ? componentType : close[1];

      if (!sameComponent(componentType, closeComponentType)) {
        return Combinator.ParseFailure({
          message: 'Unexpected close tag, wrong tag !',
          position: result.end,
          stack: result.stack,
        });
      }
      const node = createNode(
        'Element',
        result.start,
        result.end,
        {
          children: normalizeChildren(children, true),
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
    'RawOpeningTag',
    rawElementTokenOpenParser,
    componentTypeParser,
    propsParser,
    greaterThanParser
  );

  const rawElementClosingTagParser = Combinator.pipe(
    `NamedRawClosingTag`,
    lessThanParser,
    componentTypeParser,
    rawElementTokenCloseParser
  );

  const rawElementClosingParser = Combinator.oneOf(
    'ClosingTag',
    rawElementTokenCloseParser,
    rawElementClosingTagParser
  );

  const rawElementParser = Combinator.transform(
    Combinator.manyBetween(
      'RawElement',
      rawElementOpeningTagParser,
      lazyRawChildParser,
      rawElementClosingParser
    ),
    (result) => {
      if (result.type === 'Failure') {
        return result;
      }

      const [open, children, close] = result.value;
      const [, componentType, props] = open;
      const closeComponentType = typeof close === 'string' ? componentType : close[1];

      if (!sameComponent(componentType, closeComponentType)) {
        return Combinator.ParseFailure({
          message: 'Unexpected close tag, wrong tag !',
          position: result.end,
          stack: result.stack,
        });
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
        'RawElement',
        result.start,
        result.end,
        {
          children: normalizeChildren(childrenFlat, false),
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

  const fragmentParser = Combinator.transformSuccess(
    Combinator.manyBetween('Fragment', fragmentTokenParser, lazyChildParser, fragmentTokenParser),
    ([_open, children], start, end) => {
      return createNode(
        'Fragment',
        start,
        end,
        { children: normalizeChildren(children, true) },
        {}
      );
    }
  );

  const rawFragmentParser = Combinator.transformSuccess(
    Combinator.manyBetween(
      'RawFragment',
      rawFragmentTokenParser,
      rawTextParser,
      rawFragmentTokenParser
    ),
    ([_open, children], start, end) => {
      return createNode(
        'RawFragment',
        start,
        end,
        { children: normalizeChildren(children, true) },
        {}
      );
    }
  );

  const unrawElementParser = Combinator.transformSuccess(
    Combinator.manyBetween(
      'Unraw',
      rawFragmentTokenParser,
      lazyUnrawChildParser,
      rawFragmentTokenParser
    ),
    ([_begin, items]) => normalizeChildren(items, true)
  );

  const injectParser = Combinator.transformSuccess(
    Combinator.pipe(
      'Inject',
      curlyBracketOpenParser,
      maybeWhitespaceParser,
      lazyExpression,
      maybeWhitespaceParser,
      curlyBracketCloseParser
    ),
    ([_begin, whitespaceBefore, value, whitespaceAfter], start, end) => {
      return createNode('Inject', start, end, { whitespaceBefore, value, whitespaceAfter }, {});
    }
  );

  const unrawChildParser = Combinator.oneOf(
    'Child',
    whitespaceParser,
    commentParser,
    lazyUnrawElementAnyParser,
    textParser
  );

  const rawChildParser: Combinator.Parser<Child | Array<Child>> = Combinator.oneOf(
    'RawChild',
    unrawElementParser,
    rawTextParser
  );

  const elementAnyParser: Combinator.Parser<ElementAny> = Combinator.oneOf(
    'ElementAny',
    fragmentParser,
    rawFragmentParser,
    elementSelfClosingParser,
    elementParser,
    rawElementParser
  );

  // All elements except rawFragment
  const unrawElementAnyParser: Combinator.Parser<ElementAny> = Combinator.oneOf(
    'UnrawElementAny',
    fragmentParser,
    elementSelfClosingParser,
    elementParser,
    rawElementParser
  );

  const childParser = Combinator.oneOf(
    'Child',
    whitespaceParser,
    commentParser,
    elementAnyParser,
    injectParser,
    textParser
  );

  type AccessItem =
    | { type: 'DotMember'; indentifier: Node<'Identifier'> }
    | { type: 'BracketMember'; value: Expression }
    | {
        type: 'FunctionCall';
        args: Array<Node<'ArrayItem'>>;
      };

  const dotMemberAccessParser = Combinator.transformSuccess(
    Combinator.pipe('DotMemberAccess', dotParser, identifierParser),
    ([_dot, indentifier]): AccessItem => ({ type: 'DotMember', indentifier })
  );

  const bracketMemberAccessParser = Combinator.transformSuccess(
    Combinator.pipe(
      'BracketMemberAccess',
      squareBracketOpenParser,
      lazyExpression,
      squareBracketCloseParser
    ),
    ([_bracket, value]): AccessItem => ({ type: 'BracketMember', value })
  );

  const functionCallAccessParser = Combinator.transformSuccess(
    Combinator.pipe(
      'FunctionCallAccess',
      parenthesisOpenParser,
      arrayItemsParser,
      parenthesisCloseParser
    ),
    ([_parenthesis, args]): AccessItem => ({ type: 'FunctionCall', args })
  );

  const accessItemParser = Combinator.oneOf(
    null,
    dotMemberAccessParser,
    bracketMemberAccessParser,
    functionCallAccessParser
  );

  const accessParser = Combinator.reduceRight(
    'AccessExpression',
    lazyDottableExpression,
    accessItemParser,
    (
      left: Combinator.ParseResultSuccess<DottableExpression>,
      right
    ): Combinator.ParseResult<DottableExpression> => {
      const start = left.start;
      const end = right.end;
      const item = right.value;
      const target = left.value;
      if (item.type === 'DotMember') {
        return Combinator.ParseSuccess(
          start,
          right.rest,
          createNode('DotMember', start, end, { target, property: item.indentifier }, {}),
          Combinator.mergeStacks(left.stack, right.stack)
        );
      }
      if (item.type === 'BracketMember') {
        return Combinator.ParseSuccess(
          start,
          right.rest,
          createNode('BracketMember', start, end, { target, property: item.value }, {}),
          Combinator.mergeStacks(left.stack, right.stack)
        );
      }
      if (item.type === 'FunctionCall') {
        if (NodeIs.CallableExpression(target)) {
          return Combinator.ParseSuccess(
            start,
            right.rest,
            createNode('FunctionCall', start, end, { target, arguments: item.args }, {}),
            Combinator.mergeStacks(left.stack, right.stack)
          );
        }
        return Combinator.ParseFailure({
          message: `Cannot call on ${target.type}`,
          position: right.start,
          stack: Combinator.mergeStacks(left.stack, right.stack),
        });
      }
      throw new Error('todo');
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

  const expressionParser = Combinator.oneOf(
    'Expression',
    primitiveParser,
    callableExpressionParser,
    arrayOrObjectParser,
    elementAnyParser
  );

  const dottableExpressionParser: Combinator.Parser<DottableExpression> = Combinator.oneOf(
    'DottableExpression',
    arrayOrObjectParser,
    elementAnyParser,
    callableExpressionParser,
    stringParser
  );

  const documentParser = Combinator.transformSuccess(
    Combinator.pipe('Document', Combinator.many(childParser), Combinator.eof),
    ([children], start, end) =>
      createNode('Document', start, end, { children: normalizeChildren(children, true) }, {})
  );

  const ranges: Ranges = new Map();
  const document = parseDocument();

  return { document, ranges };

  function parseDocument(): Document {
    const input = StringReader(file);

    const next = documentParser(input, []);
    if (next.type === 'Success') {
      return next.value;
    }
    throw new Error(Combinator.printParseError(next.stack));
  }

  function sameComponent(left: ComponentType, right: ComponentType): boolean {
    if (left.type !== right.type) {
      return false;
    }
    if (NodeIs.Identifier(left) && NodeIs.Identifier(right) && left.meta.name === right.meta.name) {
      return true;
    }
    if (NodeIs.ElementTypeMember(left) && NodeIs.ElementTypeMember(right)) {
      return (
        sameComponent(left.nodes.target, right.nodes.target) &&
        sameComponent(left.nodes.property, right.nodes.property)
      );
    }
    return false;
  }

  function normalizeChildren(nodes: Array<Child>, mergeWhitespaces: boolean): Array<Child> {
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

  function createNode<K extends NodeType>(
    type: K,
    start: number,
    end: number,
    nodes: Nodes[K]['nodes'],
    meta: Nodes[K]['meta']
  ): Node<K> {
    const node: Node<K> = { type, nodes, meta } as any;
    ranges.set(node, { start, end });
    return node;
  }
}

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

function notNil<T>(val: T | null | undefined): T {
  if (val === null || val === undefined) {
    throw new Error(`Unexpected nil`);
  }
  return val;
}

function isIdentifierStart(ch: string): boolean {
  return IDENTIFIER_START_REGEX.test(ch);
}

function isIdentifier(ch: string): boolean {
  return IDENTIFIER_REGEX.test(ch);
}

function isDigit(ch: string): boolean {
  return DIGIT_REGEX.test(ch);
}

function isSingleQuoteContent(ch: string): boolean {
  return ch !== BACKSLASH && ch !== NEW_LINE && ch !== SINGLE_QUOTE;
}

function isDoubleQuoteContent(ch: string): boolean {
  return ch !== BACKSLASH && ch !== NEW_LINE && ch !== DOUBLE_QUOTE;
}

function isBacktickContent(ch: string): boolean {
  return ch !== BACKSLASH && ch !== BACKTICK;
}

function isLineCommentContent(ch: string): boolean {
  return ch !== NEW_LINE;
}
