import {
  Document,
  NodeKind,
  Node,
  Child,
  NodeIs,
  Expression,
  ExpressionDocument,
  NodeData,
  NodeBase,
  CreateNodeData,
  NodeMetaBase,
  NodeChildrenBase,
  ChainExpression,
  RawChild,
  AnyComment,
  MaybeWhitespace,
  Primitive,
  ObjectOrArray,
  Prop,
  WhitespaceOrComment,
  QuoteType,
} from './Ast';
import * as c from './Combinator';
import { StringReader } from './StringReader';
import { DocsyError } from './DocsyError';
import { executeParser, failureToStack, ParseFailure, ParseSuccess } from './Parser';
import { Parser, ParseResult } from './types';
import { ManySepByResult } from './Combinator';

const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const BACKTICK = '`';
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
  const result = executeParser(DocumentParser, input, ctx);
  if (result.type === 'Failure') {
    throw new DocsyError.ParsingError(failureToStack(result));
  }
  return { document: result.value, ranges: ctx.ranges };
}

function parseExpression(file: string): ParseDocumentExpressionResult {
  const ctx = createContext();
  const input = StringReader(file);
  const result = executeParser(ExpressionDocumentParser, input, ctx);
  if (result.type === 'Failure') {
    throw new DocsyError.ParsingError(failureToStack(result));
  }
  return { expression: result.value, ranges: ctx.ranges };
}

function createExact<T extends string>(str: T): Parser<T, Ctx> {
  return c.exact<T, Ctx>(str);
}

interface NodeRule<K extends NodeKind> extends Parser<Node<K>, Ctx> {
  setParser(parser: Parser<NodeData<K>, Ctx>): void;
  setNodeParser(parser: Parser<Node<K>, Ctx>): void;
}

const NodeParserInternal: { [K in NodeKind]?: NodeRule<K> } = {};

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
const doubleQuoteParser = createExact(DOUBLE_QUOTE);
const backtickParser = createExact(BACKTICK);
const eofParser = c.eof<Ctx>();

const whitespaceParser = c.regexp<Ctx>(/^\s+/g);
const identifierParser = c.regexp<Ctx>(/^[A-Za-z][A-Za-z0-9_$]*/g);
const numberParser = c.regexp<Ctx>(/^[+-]?((\d+(\.\d+)?)|(\.(\d+)))/g);
const singleQuoteStringContentParser = c.regexp<Ctx>(/^((\\')|[^'\n])+/g);
const doubleQuoteStringContentParser = c.regexp<Ctx>(/^((\\")|[^"\n])+/g);
const backtickStringContentParser = c.regexp<Ctx>(/^((\\`)|[^`])+/g);
const lineCommentContentParser = c.regexp<Ctx>(/^[^\n]+/g);
const blockCommentContentParser = c.regexp<Ctx>(/^(((?!\*\/))(.|\n))+/g);
const textContentParser = c.regexp<Ctx>(/^((?!(\|>)|(<[A-Z])|(<\|)|(\/\/)|(\/\*)|\s)(.|\n))+/g); // Not |> | <[A-Z] | <|[A-Z] | // | /* | Whitespace
const rawTextContentParser = c.regexp<Ctx>(/^((?!((#>)|(<#)|(<[A-Z])))(.|\n))+/g); // Not <[A-Z] | <#>
const anySingleCharParser = c.regexp<Ctx>(/^./g);

type ArrayItems = { items: Array<Node<'ArrayItem'>>; trailingComma: boolean };
type ComponentType = Node<'ElementTypeMember' | 'Identifier'>;

type ChainExpressionDotMember = { type: 'ChainExpressionDotMember'; indentifier: Node<'Identifier'>; end: number };
type ChainExpressionBracketMember = { type: 'ChainExpressionBracketMember'; value: Expression; end: number };
type ChainExpressionFunctionCall = {
  type: 'ChainExpressionFunctionCall';
  args: Array<Node<'ArrayItem'>>;
  trailingComma: boolean;
  end: number;
};

type ChainExpressionItem = ChainExpressionDotMember | ChainExpressionBracketMember | ChainExpressionFunctionCall;

type ChainExpressionBase = Node<'Identifier' | 'Parenthesis'>;

const ChainExpressionItemParser = c.rule<ChainExpressionItem, Ctx>('ChainExpressionItem');
const ChainExpressionParser = c.rule<ChainExpression, Ctx>('ChainExpression');
const AnyCommentParser = c.rule<AnyComment, Ctx>('AnyComment');
const ArrayItemsParser = c.rule<ArrayItems, Ctx>('ArrayItems');
const ChainExpressionBracketMemberParser = c.rule<ChainExpressionBracketMember, Ctx>('ChainExpressionBracketMember');
const ChainExpressionDotMemberParser = c.rule<ChainExpressionDotMember, Ctx>('ChainExpressionDotMember');
const ChainExpressionFunctionCallParser = c.rule<ChainExpressionFunctionCall, Ctx>('ChainExpressionFunctionCall');
const ChainExpressionBaseParser = c.rule<ChainExpressionBase, Ctx>('ChainExpressionBase');
const ChildParser = c.rule<Child, Ctx>('Child');
const ComponentTypeParser = c.rule<ComponentType, Ctx>('ComponentType');
const ExpressionParser = c.rule<Expression, Ctx>('Expression');
const MaybeWhitespaceParser = c.rule<MaybeWhitespace, Ctx>('MaybeWhitespace');
const ObjectOrArrayParser = c.rule<ObjectOrArray, Ctx>('ObjectOrArray');
const PrimitiveParser = c.rule<Primitive, Ctx>('Primitive');
const RawChildParser = c.rule<RawChild, Ctx>('RawChild');
const UnrawChildParser = c.rule<Child, Ctx>('RawChild');
const PropParser = c.rule<Prop, Ctx>('Prop');
const WhitespaceOrCommentParser = c.rule<WhitespaceOrComment, Ctx>('WhitespaceOrComment');

export const DocumentParser = nodeParser('Document') as Parser<Node<'Document'>, Ctx>;
export const ExpressionDocumentParser = nodeParser('ExpressionDocument') as Parser<Node<'ExpressionDocument'>, Ctx>;

WhitespaceOrCommentParser.setParser(c.oneOf(nodeParser('Whitespace'), AnyCommentParser));

PropParser.setParser(
  c.oneOf(
    nodeParser('PropValue'),
    nodeParser('PropNoValue'),
    nodeParser('PropBlockComment'),
    nodeParser('PropLineComment')
  )
);

ComponentTypeParser.setParser(c.oneOf(nodeParser('ElementTypeMember'), nodeParser('Identifier')));

PrimitiveParser.setParser(
  c.oneOf(nodeParser('Num'), nodeParser('Bool'), nodeParser('Null'), nodeParser('Undefined'), nodeParser('Str'))
);

MaybeWhitespaceParser.setParser(c.apply(c.maybe(nodeParser('Whitespace')), (node) => node ?? null));

ArrayItemsParser.setParser(
  c.apply(c.manySepBy(nodeParser('ArrayItem'), commaParser, { allowTrailing: true }), (items) => ({
    items: flattenManySepBy(items),
    trailingComma: items === null ? false : Boolean(items.trailing),
  }))
);

ChildParser.setParser(
  c.oneOf(
    nodeParser('Element'),
    nodeParser('Fragment'),
    nodeParser('RawFragment'),
    nodeParser('RawElement'),
    nodeParser('SelfClosingElement'),
    nodeParser('Whitespace'),
    nodeParser('Inject'),
    nodeParser('Text'),
    AnyCommentParser
  )
);

RawChildParser.setParser(c.oneOf(nodeParser('UnrawFragment'), nodeParser('RawText')));

// All elements except RawFragment
UnrawChildParser.setParser(
  c.oneOf(
    nodeParser('Element'),
    nodeParser('Fragment'),
    nodeParser('SelfClosingElement'),
    nodeParser('Whitespace'),
    nodeParser('Text'),
    nodeParser('Inject'),
    AnyCommentParser
  )
);

ObjectOrArrayParser.setParser(
  c.oneOf(nodeParser('EmptyArray'), nodeParser('Array'), nodeParser('EmptyObject'), nodeParser('Object'))
);

ChainExpressionDotMemberParser.setParser(
  c.apply(c.pipe(dotParser, nodeParser('Identifier')), ([_dot, indentifier], _start, end) => ({
    type: 'ChainExpressionDotMember',
    indentifier,
    end,
  }))
);

ChainExpressionBracketMemberParser.setParser(
  c.apply(
    c.pipe(squareBracketOpenParser, ExpressionParser, squareBracketCloseParser),
    ([_bracket, value], _start, end) => ({ type: 'ChainExpressionBracketMember', value, end })
  )
);

ChainExpressionFunctionCallParser.setParser(
  c.apply(
    c.pipe(parenthesisOpenParser, ArrayItemsParser, parenthesisCloseParser),
    ([_parenthesis, { items, trailingComma }], _start, end) => ({
      type: 'ChainExpressionFunctionCall',
      args: items,
      trailingComma,
      end,
    })
  )
);

ChainExpressionItemParser.setParser(
  c.oneOf(ChainExpressionDotMemberParser, ChainExpressionBracketMemberParser, ChainExpressionFunctionCallParser)
);

ChainExpressionBaseParser.setParser(c.oneOf(nodeParser('Identifier'), nodeParser('Parenthesis')));

ChainExpressionParser.setParser(
  c.reduceRight(
    ChainExpressionBaseParser,
    ChainExpressionItemParser,
    (left, right, _path, ctx): ParseResult<ChainExpression> => {
      const start = left.start;
      const end = right.end;
      const item = right.value;
      const target = left.value;
      if (item.type === 'ChainExpressionDotMember') {
        return ParseSuccess(
          start,
          right.rest,
          ctx.createNode('DotMember', start, end, { target, property: item.indentifier }, {})
        );
      }
      if (item.type === 'ChainExpressionBracketMember') {
        return ParseSuccess(
          start,
          right.rest,
          ctx.createNode('BracketMember', start, end, { target, property: item.value }, {})
        );
      }
      if (item.type === 'ChainExpressionFunctionCall') {
        return ParseSuccess(
          start,
          right.rest,
          ctx.createNode(
            'FunctionCall',
            start,
            end,
            { target, arguments: item.args },
            { trailingComma: item.trailingComma }
          )
        );
      }
      throw new DocsyError.UnexpectedError(`Access on invalid type`);
    }
  )
);

ExpressionParser.setParser(
  c.oneOf(PrimitiveParser, ObjectOrArrayParser, ChainExpressionBaseParser, ChainExpressionParser, ObjectOrArrayParser)
);

AnyCommentParser.setParser(c.oneOf(nodeParser('LineComment'), nodeParser('BlockComment')));

nodeParser('ExpressionDocument').setParser(
  c.apply(
    c.pipe(c.many(WhitespaceOrCommentParser), ExpressionParser, c.many(WhitespaceOrCommentParser)),
    ([before, value, after]) => nodeData({ before, value, after }, {})
  )
);

nodeParser('Document').setParser(
  c.apply(c.pipe(c.many(ChildParser), eofParser), ([children], _start, _end, ctx) => {
    return nodeData(normalizeChildren(children, ctx.ranges), {});
  })
);

nodeParser('Whitespace').setParser(
  c.apply(whitespaceParser, (content) => {
    const hasNewLine = content.indexOf('\n') >= 0;
    return nodeData({}, { content, hasNewLine });
  })
);

nodeParser('Identifier').setParser(c.apply(identifierParser, (name) => nodeData({}, { name })));

nodeParser('Num').setParser(
  c.apply(numberParser, (rawValue) => nodeData({}, { value: parseFloat(rawValue), rawValue }))
);

nodeParser('Bool').setParser(
  c.apply(c.oneOf(createExact('true'), createExact('false')), (val) =>
    nodeData({}, { value: val === 'true' ? true : false })
  )
);

nodeParser('Null').setParser(c.apply(createExact('null'), () => nodeData({}, {})));

nodeParser('Undefined').setParser(c.apply(createExact('undefined'), () => nodeData({}, {})));

nodeParser('Str').setParser(
  c.apply(
    c.oneOf(
      c.pipe(singleQuoteParser, c.maybe(singleQuoteStringContentParser), singleQuoteParser),
      c.pipe(doubleQuoteParser, c.maybe(doubleQuoteStringContentParser), doubleQuoteParser),
      c.pipe(backtickParser, c.maybe(backtickStringContentParser), backtickParser)
    ),
    ([rawQuote, content]) => {
      const quote: QuoteType = rawQuote === SINGLE_QUOTE ? 'Single' : rawQuote === DOUBLE_QUOTE ? 'Double' : 'Backtick';
      return nodeData({}, { value: content ?? '', quote });
    }
  )
);

nodeParser('EmptyArray').setParser(
  c.apply(
    c.pipe(squareBracketOpenParser, MaybeWhitespaceParser, squareBracketCloseParser),
    ([_open, whitespace, _close]) => nodeData({ whitespace }, {})
  )
);

nodeParser('EmptyObject').setParser(
  c.apply(
    c.pipe(curlyBracketOpenParser, MaybeWhitespaceParser, curlyBracketCloseParser),
    ([_open, whitespace, _close]) => nodeData({ whitespace }, {})
  )
);

nodeParser('Parenthesis').setParser(
  c.apply(c.pipe(parenthesisOpenParser, ExpressionParser, parenthesisCloseParser), ([_open, value, _close]) =>
    nodeData({ value }, {})
  )
);

nodeParser('Spread').setParser(
  c.apply(c.pipe(spreadOperatorParser, ExpressionParser), ([_op, target]) => nodeData({ target }, {}))
);

nodeParser('ArrayItem').setParser(
  c.apply(
    c.pipe(MaybeWhitespaceParser, c.oneOf(nodeParser('Spread'), ExpressionParser), MaybeWhitespaceParser),
    ([whitespaceBefore, item, whitespaceAfter]) => nodeData({ whitespaceBefore, item, whitespaceAfter }, {})
  )
);

nodeParser('Array').setParser(
  c.apply(
    c.pipe(squareBracketOpenParser, ArrayItemsParser, c.maybe(commaParser), squareBracketCloseParser),
    ([_open, { items, trailingComma }, _close]) => nodeData({ items }, { trailingComma })
  )
);

nodeParser('LineComment').setParser(
  c.apply(
    c.pipe(doubleSlashParser, c.maybe(lineCommentContentParser), c.oneOf(eofParser, newLineParser)),
    ([_start, content]) => nodeData({}, { content: content || '' })
  )
);

nodeParser('BlockComment').setParser(
  c.apply(
    c.pipe(blockCommentStartParser, c.maybe(blockCommentContentParser), blockCommentEndParser),
    ([_start, content]) => nodeData({}, { content: content || '' })
  )
);

nodeParser('PropertyShorthand').setParser(c.apply(nodeParser('Identifier'), (name) => nodeData({ name }, {})));

nodeParser('Property').setParser(
  c.apply(
    c.pipe(
      c.oneOf(nodeParser('Identifier'), nodeParser('Str')),
      MaybeWhitespaceParser,
      colonParser,
      MaybeWhitespaceParser,
      ExpressionParser
    ),
    ([name, whitespaceBeforeColon, _colon, whitespaceAfterColon, value]) =>
      nodeData({ name, value, whitespaceAfterColon, whitespaceBeforeColon }, {})
  )
);

nodeParser('ComputedProperty').setParser(
  c.apply(
    c.pipe(
      squareBracketOpenParser,
      ExpressionParser,
      squareBracketCloseParser,
      MaybeWhitespaceParser,
      colonParser,
      MaybeWhitespaceParser,
      ExpressionParser
    ),
    ([_openBracket, expression, _closeBracket, whitespaceBeforeColon, _colon, whitespaceAfterColon, value]) => {
      return nodeData({ expression, whitespaceBeforeColon, value, whitespaceAfterColon }, {});
    }
  )
);

nodeParser('ObjectItem').setParser(
  c.apply(
    c.pipe(
      MaybeWhitespaceParser,
      c.oneOf(
        nodeParser('Property'),
        nodeParser('PropertyShorthand'),
        nodeParser('Spread'),
        nodeParser('ComputedProperty')
      ),
      MaybeWhitespaceParser
    ),
    ([whitespaceBefore, item, whitespaceAfter]) => nodeData({ whitespaceBefore, item, whitespaceAfter }, {})
  )
);

nodeParser('Object').setParser(
  c.apply(
    c.pipe(
      curlyBracketOpenParser,
      c.manySepBy(nodeParser('ObjectItem'), commaParser, { allowTrailing: true }),
      curlyBracketCloseParser
    ),
    ([_open, items, _close]) => {
      return nodeData(
        { items: flattenManySepBy(items) },
        { trailingComma: items === null ? false : Boolean(items.trailing) }
      );
    }
  )
);

nodeParser('ElementTypeMember').setNodeParser(
  c.reduceRight(
    nodeParser('Identifier'),
    c.pipe(dotParser, nodeParser('Identifier')),
    (left, right, _path, ctx): ParseResult<Node<'ElementTypeMember'>> => {
      const [, identifier] = right.value;
      const start = left.start;
      const end = right.end;

      return ParseSuccess(
        start,
        right.rest,
        ctx.createNode('ElementTypeMember', start, end, { target: left.value, property: identifier }, {})
      );
    }
  )
);

nodeParser('PropNoValue').setParser(c.apply(nodeParser('Identifier'), (name) => nodeData({ name }, {})));

nodeParser('PropValue').setParser(
  c.apply(c.pipe(nodeParser('Identifier'), equalParser, ExpressionParser), ([name, _equal, value]) =>
    nodeData({ name, value }, {})
  )
);

nodeParser('PropBlockComment').setParser(
  c.apply(
    c.pipe(blockCommentStartParser, c.maybe(blockCommentContentParser), blockCommentEndParser),
    ([_start, content]) => nodeData({}, { content: content || '' })
  )
);

nodeParser('PropLineComment').setParser(
  c.apply(
    c.pipe(doubleSlashParser, c.maybe(lineCommentContentParser), c.oneOf(eofParser, newLineParser)),
    ([_start, content]) => nodeData({}, { content: content || '' })
  )
);

nodeParser('PropItem').setParser(
  c.apply(c.pipe(nodeParser('Whitespace'), PropParser), ([whitespace, item]) =>
    nodeData({ item, whitespaceBefore: whitespace }, {})
  )
);

nodeParser('Props').setParser(
  c.apply(c.pipe(c.many(nodeParser('PropItem')), MaybeWhitespaceParser), ([items, whitespaceAfter]) =>
    nodeData({ items, whitespaceAfter }, {})
  )
);

nodeParser('SelfClosingElement').setParser(
  c.apply(
    c.pipe(elementTokenOpenParser, ComponentTypeParser, nodeParser('Props'), elementTokenCloseParser),
    ([_tagOpen, component, props]) => {
      return nodeData({ component, props }, { namedCloseTag: false });
    }
  )
);

nodeParser('Text').setParser(c.apply(c.oneOf(textContentParser), (content) => nodeData({}, { content })));

nodeParser('RawText').setParser(
  // Accept single any char because if nothing nothing else matches we read as text
  c.apply(c.oneOf(rawTextContentParser, anySingleCharParser), (content) => nodeData({}, { content }))
);

nodeParser('Element').setNodeParser(
  c.transform(
    c.manyBetween(
      c.pipe(elementTokenOpenParser, ComponentTypeParser, nodeParser('Props'), greaterThanParser),
      ChildParser,
      c.oneOf(elementTokenCloseParser, c.pipe(lessThanParser, ComponentTypeParser, elementTokenCloseParser))
    ),
    (result, path, ctx) => {
      if (result.type === 'Failure') {
        return result;
      }
      const [open, children, close] = result.value;
      const [, componentType, props] = open;
      const closeComponentType = typeof close === 'string' ? componentType : close[1];
      if (!sameComponent(componentType, closeComponentType)) {
        const closeRange = ctx.ranges.get(closeComponentType);
        return ParseFailure(closeRange?.end ?? 0, path, `Invalid close tag: wrong component`);
      }
      const node = createNode(
        ctx.ranges,
        'Element',
        result.start,
        result.end,
        { children: normalizeChildren(children, ctx.ranges), component: componentType, props },
        { namedCloseTag: typeof close !== 'string' }
      );
      return {
        ...result,
        value: node,
      };
    }
  )
);

nodeParser('RawElement').setNodeParser(
  c.transform(
    c.manyBetween(
      c.pipe(rawElementTokenOpenParser, ComponentTypeParser, nodeParser('Props'), greaterThanParser),
      RawChildParser,
      c.oneOf(rawElementTokenCloseParser, c.pipe(lessThanParser, ComponentTypeParser, rawElementTokenCloseParser))
    ),
    (result, path, ctx) => {
      if (result.type === 'Failure') {
        return result;
      }

      const [open, children, close] = result.value;
      const [, componentType, props] = open;
      const closeComponentType = typeof close === 'string' ? componentType : close[1];

      if (!sameComponent(componentType, closeComponentType)) {
        const closeRange = ctx.ranges.get(closeComponentType);
        return ParseFailure(closeRange?.end ?? 0, path, `Invalid close tag: wrong component`);
      }

      const node = createNode(
        ctx.ranges,
        'RawElement',
        result.start,
        result.end,
        { children: normalizeRawChildren(children.flat(), ctx.ranges), component: componentType, props },
        { namedCloseTag: typeof close !== 'string' }
      );
      return {
        ...result,
        value: node,
      };
    }
  )
);

nodeParser('Fragment').setParser(
  c.apply(
    c.manyBetween(fragmentTokenParser, ChildParser, fragmentTokenParser),
    ([_open, children], _start, _end, ctx) => {
      return nodeData(normalizeChildren(children, ctx.ranges), {});
    }
  )
);

nodeParser('RawFragment').setParser(
  c.apply(
    c.manyBetween(rawFragmentTokenParser, RawChildParser, rawFragmentTokenParser),
    ([_open, children], _start, _end, ctx) => {
      return nodeData(normalizeRawChildren(children.flat(), ctx.ranges), {});
    }
  )
);

nodeParser('UnrawFragment').setParser(
  c.apply(
    c.manyBetween(rawFragmentTokenParser, UnrawChildParser, rawFragmentTokenParser),
    ([_begin, items], _start, _end, ctx) => nodeData(normalizeChildren(items, ctx.ranges), {})
  )
);

nodeParser('Inject').setParser(
  c.apply(
    c.pipe(
      curlyBracketOpenParser,
      MaybeWhitespaceParser,
      ExpressionParser,
      MaybeWhitespaceParser,
      curlyBracketCloseParser
    ),
    ([_begin, whitespaceBefore, value, whitespaceAfter]) => {
      return nodeData({ whitespaceBefore, value, whitespaceAfter }, {});
    }
  )
);

// Utils

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

function normalizeRawChildren(nodes: Array<RawChild>, ranges: Ranges): Array<RawChild> {
  const result: Array<RawChild> = [];
  nodes.forEach((child, i) => {
    if (i === 0) {
      result.push(child);
      return;
    }
    const last = result[result.length - 1];
    const lastRange = notNil(ranges.get(last));
    const childRange = notNil(ranges.get(child));
    // text + text => text
    if (NodeIs.RawText(last) && NodeIs.RawText(child)) {
      // Collapse text
      result.pop();
      ranges.delete(child);
      ranges.delete(last);
      result.push(
        createNode(
          ranges,
          'RawText',
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

function normalizeChildren(nodes: Array<Child>, ranges: Ranges): Array<Child> {
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
      (NodeIs.Whitespace(last) && NodeIs.Text(child)) ||
      // text + whitespace => text
      (NodeIs.Text(last) && NodeIs.Whitespace(child))
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

function flattenManySepBy<T, Sep>(result: ManySepByResult<T, Sep>): Array<T> {
  if (result === null) {
    return [];
  }
  const { head, tail } = result;
  return [head, ...tail.map((v) => v.item)];
}

function nodeData<Children extends NodeChildrenBase, Meta extends NodeMetaBase>(
  children: Children,
  meta: Meta
): CreateNodeData<Children, Meta> {
  return { children, meta };
}

function nodeParser<K extends NodeKind>(kind: K): NodeRule<K> {
  if (NodeParserInternal[kind] === undefined) {
    const innerRule = c.rule<NodeData<K>, Ctx>(kind);
    const rule = {
      ...innerRule,
      setParser: (parser: any) => {
        return innerRule.setParser(
          c.apply(parser, (data: NodeBase, start, end, ctx) =>
            ctx.createNode(kind as any, start, end, data.children, data.meta)
          )
        );
      },
      setNodeParser: (parser: any) => {
        return innerRule.setParser(parser);
      },
    } as NodeRule<K>;
    NodeParserInternal[kind] = rule as any;
  }
  return NodeParserInternal[kind] as any;
}
