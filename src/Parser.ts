import { Document, Nodes, NodeType, Node, Children, NodeIs, Expression } from './internal/Node';
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
  const tagOpenParser = Combinator.exact('<|');
  const tagCloseParser = Combinator.exact('|>');
  const spreadOperatorParser = Combinator.exact('...');
  const equalParser = Combinator.exact('=');
  const dashParser = Combinator.exact('-');
  const dotParser = Combinator.exact('.');
  const commaParser = Combinator.exact(',');
  const squareBracketOpenParser = Combinator.exact('[');
  const squareBracketCloseParser = Combinator.exact(']');
  const singleQuoteParser = Combinator.exact(SINGLE_QUOTE);
  const backslashParser = Combinator.exact(BACKSLASH);
  const doubleQuoteParser = Combinator.exact(DOUBLE_QUOTE);
  const backtickParser = Combinator.exact(BACKTICK);

  const lazyExpression = Combinator.lazy(() => expressionParser);

  const whitespaceParser = Combinator.named(
    'WhiteSpace',
    Combinator.transform(
      Combinator.whileMatch('Whitespace', isWhitespace),
      (content, start, end) => {
        const hasNewLine = content.indexOf('\n') >= 0;
        return createNode('Whitespace', start, end, {}, { content, hasNewLine });
      }
    )
  );

  const maybeWhitespaceParser = Combinator.maybe(whitespaceParser);

  const notNewLineParser = Combinator.singleChar('NotNewLine', (char) => char !== '\n');

  const escapedStringValue = Combinator.transform(
    Combinator.pipe(backslashParser, notNewLineParser),
    ([_backslash, char]) => {
      return char;
    }
  );

  const createStringParser = <Q>(
    quote: Combinator.Parser<Q>,
    isContent: (char: string) => boolean
  ) =>
    Combinator.transform(
      Combinator.pipe(
        quote,
        Combinator.many(
          Combinator.oneOf(escapedStringValue, Combinator.whileMatch('StringContent', isContent))
        ),
        quote
      ),
      ([q1, content, _q2]) => ({ quote: q1, content: content.join('') })
    );

  const singleQuoteStringParser = createStringParser(singleQuoteParser, isSingleQuoteContent);

  const doubleQuoteStringParser = createStringParser(doubleQuoteParser, isDoubleQuoteContent);

  const backtickStringParser = createStringParser(backtickParser, isBacktickContent);

  const stringParser = Combinator.transform(
    Combinator.named(
      'String',
      Combinator.oneOf(singleQuoteStringParser, doubleQuoteStringParser, backtickStringParser)
    ),
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

  const emptyArrayParser = Combinator.transform(
    Combinator.pipe(
      squareBracketOpenParser,
      Combinator.maybe(whitespaceParser),
      squareBracketCloseParser
    ),
    ([_open, whitespace, _close], start, end) => {
      return createNode('EmptyArray', start, end, { whitespace }, {});
    }
  );

  const spreadParser = Combinator.transform(
    Combinator.pipe(spreadOperatorParser, lazyExpression),
    ([_op, target], start, end) => {
      return createNode('Spread', start, end, { target }, {});
    }
  );

  const arrayItemParser = Combinator.transform(
    Combinator.pipe(
      maybeWhitespaceParser,
      Combinator.oneOf(spreadParser, lazyExpression),
      maybeWhitespaceParser
    ),
    ([whitespaceBefore, item, whitespaceAfter], start, end) => {
      return createNode('ArrayItem', start, end, { whitespaceBefore, item, whitespaceAfter }, {});
    }
  );

  const arrayParser = Combinator.transform(
    Combinator.pipe(
      squareBracketOpenParser,
      Combinator.manySepBy(arrayItemParser, commaParser),
      squareBracketCloseParser
    ),
    ([_open, items, _close], start, end) => {
      return createNode('Array', start, end, { items }, {});
    }
  );

  const booleanParser = Combinator.transform(
    Combinator.oneOf(Combinator.exact('true'), Combinator.exact('false')),
    (val, start, end) => {
      const value = val === 'true' ? true : false;
      return createNode('Bool', start, end, {}, { value });
    }
  );

  const nullParser = Combinator.named(
    'Null',
    Combinator.transform(Combinator.exact('null'), (_null, start, end) => {
      return createNode('Null', start, end, {}, {});
    })
  );

  const undefinedParser = Combinator.named(
    'Undefined',
    Combinator.transform(Combinator.exact('undefined'), (_null, start, end) => {
      return createNode('Undefined', start, end, {}, {});
    })
  );

  const identifierParser = Combinator.transform(
    Combinator.pipe(
      Combinator.singleChar('IdentifierStart', isIdentifierStart),
      Combinator.whileMatch('Identifier', isIdentifier)
    ),
    ([idenitifierStart, content], start, end) =>
      createNode('Identifier', start, end, {}, { name: idenitifierStart + content })
  );

  const intergerParser = Combinator.whileMatch('Integer', isDigit);

  const numberParser = Combinator.transform(
    Combinator.pipe(
      Combinator.maybe(dashParser),
      intergerParser,
      Combinator.maybe(Combinator.pipe(dotParser, intergerParser))
    ),
    ([minus, integerPart, maybeDecimal], start, end) => {
      const rawValue =
        (minus || '') + integerPart + (maybeDecimal === null ? '' : '.' + maybeDecimal[1]);
      const value = parseFloat(rawValue);
      return createNode('Num', start, end, {}, { value, rawValue });
    }
  );

  const elementTypeMemberParser: Combinator.Parser<Node<
    'ElementTypeMember'
  >> = Combinator.reduceRight(
    identifierParser,
    Combinator.pipe(dotParser, identifierParser),
    (left, [, right], start, end): Node<'ElementTypeMember'> => {
      return createNode('ElementTypeMember', start, end, { target: left, property: right }, {});
    }
  );

  const componentTypeParser = Combinator.named(
    'ComponentType',
    Combinator.oneOf(elementTypeMemberParser, identifierParser)
  );

  const expressionParser: Combinator.Parser<Expression> = Combinator.named<Expression>(
    'Expression',
    Combinator.oneOf(
      numberParser,
      booleanParser,
      nullParser,
      undefinedParser,
      stringParser,
      emptyArrayParser,
      arrayParser
    )
  );

  const propNoValue = Combinator.transform(identifierParser, (name, start, end) => {
    return createNode('PropNoValue', start, end, { name }, {});
  });

  const propValue = Combinator.transform(
    Combinator.pipe(identifierParser, equalParser, expressionParser),
    ([name, _equal, value], start, end) => {
      return createNode('PropValue', start, end, { name, value }, {});
    }
  );

  const propParser = Combinator.oneOf(propValue, propNoValue);

  const propItemParser = Combinator.named(
    'PropItem',
    Combinator.transform(
      Combinator.pipe(whitespaceParser, propParser),
      ([whitespace, item], start, end) => {
        return createNode('PropItem', start, end, { item, whitespaceBefore: whitespace }, {});
      }
    )
  );

  const propsParser = Combinator.named(
    'Props',
    Combinator.transform(
      Combinator.pipe(Combinator.many(propItemParser), Combinator.maybe(whitespaceParser)),
      ([items, whitespaceAfter], start, end) => {
        return createNode('Props', start, end, { items, whitespaceAfter }, {});
      }
    )
  );

  const selfClosingElementParser = Combinator.transform(
    Combinator.pipe(tagOpenParser, componentTypeParser, propsParser, tagCloseParser),
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
    Combinator.transform(Combinator.whileMatch('Text', isText), (content, start, end) =>
      createNode('Text', start, end, {}, { content })
    )
  );

  const childParser = Combinator.named(
    'Child',
    Combinator.oneOf(whitespaceParser, textParser, selfClosingElementParser)
  );

  const childrenParser = Combinator.named(
    'Children',
    Combinator.transform(Combinator.many(childParser), (children) => normalizeChildren(children))
  );

  const documentParser = Combinator.transform(
    Combinator.named(
      'Document',
      Combinator.pipe(childrenParser, Combinator.convertError(Combinator.eof, childParser))
    ),
    ([children, _eof], start, end) => createNode('Document', start, end, { children }, {})
  );

  const ranges: Ranges = new Map();
  const document = parseDocument();

  return { document, ranges };

  function parseDocument(): Document {
    const input = StringReader(file);

    const next = documentParser(input);
    if (next.type === 'Success') {
      return next.value;
    }
    throw new Error(Combinator.printParseError(next.error));
  }

  function normalizeChildren(nodes: Array<Children>): Array<Children> {
    const result: Array<Children> = [];
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
      // text + text => text
      if (
        // text + text => text
        (NodeIs.Text(last) && NodeIs.Text(child)) ||
        // whitespace + text => text
        (NodeIs.Whitespace(last) && NodeIs.Text(child)) ||
        // text + whitespace => text
        (NodeIs.Text(last) && NodeIs.Whitespace(child))
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

function isText(char: string) {
  return (
    char !== '#' &&
    char !== '<' &&
    char !== '|' &&
    char !== '/' &&
    char !== '{' &&
    isWhitespace(char) === false
  );
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
