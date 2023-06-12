import * as Ast from './Ast.ts';
import * as p from './internal/parsers.ts';
import * as t from './internal/tokens.ts';
import { StringReader } from './internal/StringReader.ts';
import { DocsyError } from './DocsyError.ts';
import { executeParser, failureToStack, ParseSuccess, ParseFailure } from './internal/Parser.ts';
import { createContext, rule, nodeParser, ParserContext } from './internal/ParserContext.ts';
import { Parser, ParseResult } from './internal/types.ts';
import { Parsed } from './Parsed.ts';
import { INTERNAL } from './internal.ts';
import { nonEmptyArray } from './Utils.ts';

function runParser<T extends Ast.Node>(parser: Parser<T, ParserContext<T>>, source: string, file: string): Parsed<T> {
  const ctx = createContext<T>(file, source);
  const input = StringReader(source);
  const result = executeParser(parser, input, ctx);
  if (result.type === 'Failure') {
    throw new DocsyError.ParsingError(file, source, failureToStack(result));
  }
  ctx.parsed[INTERNAL].setResult(result.value);
  return ctx.parsed;
}

export function parseDocument(source: string, file: string): Parsed<Ast.Document> {
  return runParser(DocumentParser, source, file);
}

export function parseExpression(source: string, file: string): Parsed<Ast.ExpressionDocument> {
  return runParser(ExpressionDocumentParser, source, file);
}

export const DocumentParser = rule<Ast.Document>('Document');
export const ExpressionDocumentParser = rule<Ast.ExpressionDocument>('ExpressionDocument');

// Chainable internal types

type ChainableMemberExpression = {
  type: 'ChainableMemberExpression';
  indentifier: Ast.Node<'Identifier'>;
  end: number;
};

type ChainableComputedMemberExpression = {
  type: 'ChainableComputedMemberExpression';
  value: Ast.Expression;
  end: number;
};

type ChainableCallExpression = {
  type: 'ChainableCallExpression';
  arguments?: Ast.ListItems | Ast.WhitespaceLike;
  end: number;
};

type ChainableExpressionItem = ChainableMemberExpression | ChainableComputedMemberExpression | ChainableCallExpression;

type ChainableExpressionBase = Ast.Node<'Identifier' | 'Parenthesis'>;

// -- Parsers

const WhitespaceLikeParser = rule<Ast.WhitespaceLike>('WhitespaceLike');
const ChildParser = rule<Ast.Child>('Child');
const LineChildParser = rule<Ast.Child>('LineChild'); // Like child but text end on new line
const ExpressionParser = rule<Ast.Expression>('Expression');
const WhitespaceParser = rule<Ast.Whitespace>('Whitespace');
const LineWhitespaceParser = rule<Ast.Whitespace>('LineWhitespace');
const AnyCommentParser = rule<Ast.AnyComment>('AnyComment');
const LineCommentParser = rule<Ast.LineComment>('LineComment');
const BlockCommentParser = rule<Ast.BlockComment>('BlockComment');
const PrimitiveParser = rule<Ast.Primitive>('Primitive');
const ObjOrArrParser = rule<Ast.ObjOrArr>('ObjOrArr');
const ChainableExpressionParser = rule<Ast.ChainableExpression>('ChainableExpression');
const NumParser = rule<Ast.Num>('Num');
const BoolParser = rule<Ast.Bool>('Bool');
const NullParser = rule<Ast.Null>('Null');
const UndefinedParser = rule<Ast.Undefined>('Undefined');
const StrParser = rule<Ast.Str>('Str');
const ArrParser = rule<Ast.Arr>('Arr');
const ListItemsParser = rule<Ast.ListItems>('ListItems');
const ListItemParser = rule<Ast.ListItem>('ListItem');
const ObjParser = rule<Ast.Obj>('Obj');
const ObjItemsParser = rule<Ast.ObjItems>('ObjItems');
const ObjItemParser = rule<Ast.ObjItem>('ObjItem');
const AnyObjPropertyParser = rule<Ast.AnyObjProperty>('AnyObjProperty');
const ObjPropertyParser = rule<Ast.ObjProperty>('ObjProperty');
const ObjComputedPropertyParser = rule<Ast.ObjComputedProperty>('ObjComputedProperty');
const ObjPropertyShorthandParser = rule<Ast.ObjPropertyShorthand>('ObjPropertyShorthand');
const SpreadParser = rule<Ast.Spread>('Spread');
const TrailingCommaParser = rule<Ast.TrailingComma>('TrailingComma');
const ChainableExpressionBaseParser = rule<ChainableExpressionBase>('ChainableExpressionBase');
const ChainableExpressionItemParser = rule<ChainableExpressionItem>('ChainableExpressionItem');
const ChainableMemberExpressionParser = rule<ChainableMemberExpression>('ChainableMemberExpression');
const ChainableComputedMemberExpressionParser = rule<ChainableComputedMemberExpression>(
  'ChainableComputedMemberExpression'
);
const ChainableCallExpressionParser = rule<ChainableCallExpression>('ChainableCallExpression');
const IdentifierParser = rule<Ast.Node<'Identifier'>>('Identifier');
const ParenthesisParser = rule<Ast.Node<'Parenthesis'>>('Parenthesis');
const InjectParser = rule<Ast.Inject>('Inject');
const TextParser = rule<Ast.Text>('Text');
const LineTextParser = rule<Ast.Text>('LineText');
const AnyElementParser = rule<Ast.AnyElement>('AnyElement');
const ElementParser = rule<Ast.Element>('Element');
const RawElementParser = rule<Ast.RawElement>('RawElement');
const SelfClosingElementParser = rule<Ast.SelfClosingElement>('SelfClosingElement');
const LineElementParser = rule<Ast.LineElement>('LineElement');
const FragmentParser = rule<Ast.Fragment>('Fragment');
const RawFragmentParser = rule<Ast.RawFragment>('RawFragment');
const ElementNameParser = rule<Ast.ElementName>('ElementName');
// const ElementOpenStartParser = rule<Ast.ElementName>('ElementOpenStart'); // <|ElementName
// const ElementRawOpenStartParser = rule<Ast.ElementName>('ElementRawOpenStart'); // <#ElementName
// const ElementCloseParser = rule<Ast.ElementName>('ElementClose'); // <ElementName/>
// const ElementCloseShortcutParser = rule<null>('ElementCloseShortcut'); // </>
// const ElementSelfClosingStartParser = rule<Ast.ElementName>('ElementSelfClosingStart'); // </ElementName
// const ElementLineStartParser = rule<Ast.ElementName>('ElementLineStart'); // <Identifier
const AttributesParser = rule<Array<Ast.Attribute>>('Attributes');
const AttributeParser = rule<Ast.Attribute>('Attribute');

// -- Implementation

ExpressionDocumentParser.setParser(
  nodeParser(
    'ExpressionDocument',
    p.oneOf(
      p.apply(t.eof, () => ({})), // empty
      p.apply(
        p.pipe(p.maybe(WhitespaceLikeParser), p.maybe(ExpressionParser), p.maybe(WhitespaceLikeParser)),
        ([before, value, after]) => ({ value, before, after })
      )
    )
  )
);

DocumentParser.setParser(
  nodeParser(
    'Document',
    p.applyPipe([p.many(ChildParser), t.eof], ([children]) => ({ children }))
  )
);

ChildParser.setParser(p.oneOf(AnyElementParser, AnyCommentParser, InjectParser, WhitespaceParser, TextParser));

LineChildParser.setParser(
  p.oneOf(AnyElementParser, AnyCommentParser, InjectParser, LineWhitespaceParser, LineTextParser)
);

InjectParser.setParser(
  nodeParser(
    'Inject',
    p.applyPipe(
      [
        t.curlyBracketOpen,
        p.maybe(WhitespaceLikeParser),
        ExpressionParser,
        p.maybe(WhitespaceLikeParser),
        t.curlyBracketClose,
      ],
      ([_begin, whitespaceBefore, value, whitespaceAfter]) => {
        return { whitespaceBefore, value, whitespaceAfter };
      }
    )
  )
);

TextParser.setParser(
  nodeParser(
    'Text',
    p.apply(t.textContent, (content) => ({ content }))
  )
);

LineTextParser.setParser(
  nodeParser(
    'Text',
    p.apply(t.lineTextContent, (content) => ({ content }))
  )
);

AnyElementParser.setParser(
  p.oneOf(
    FragmentParser,
    RawFragmentParser,
    ElementParser,
    RawElementParser,
    SelfClosingElementParser,
    LineElementParser
  )
);

ElementParser.setParser(
  p.transformSuccess(
    p.pipe(
      t.elementOpenStart,
      ElementNameParser,
      AttributesParser,
      p.maybe(WhitespaceLikeParser),
      t.greaterThan,
      p.many(ChildParser),
      p.oneOf(t.elementCloseShortcut, p.pipe(t.lessThan, ElementNameParser, t.elementCloseEnd))
    ),
    (result, path, ctx): ParseResult<Ast.Element> => {
      const [_begin, elementName, attributes, whitespaceAfterAttributes, _end, children, close] = result.value;
      const closeName = typeof close === 'string' ? null : close[1];
      if (closeName) {
        if (!sameComponent(elementName, closeName)) {
          const closeRange = ctx.ranges.get(closeName);
          return ParseFailure(closeRange?.end ?? 0, path, () => `Invalid close tag: wrong component`);
        }
      }
      const node = ctx.createNode('Element', result.start, result.end, {
        children,
        attributes,
        name: elementName,
        whitespaceAfterAttributes,
        namedCloseTag: closeName !== null,
      });
      return {
        ...result,
        value: node,
      };
    }
  )
);

ElementNameParser.setParser(p.apply(t.elemName, (res, start, end, ctx) => parseElementName(res, start, end, ctx)));

RawElementParser.setParser(
  p.transformSuccess(
    p.pipe(
      t.elementRawOpenStart,
      ElementNameParser,
      AttributesParser,
      p.maybe(WhitespaceLikeParser),
      t.greaterThan,
      t.rawTextContent,
      p.oneOf(t.elementCloseShortcut, p.pipe(t.lessThan, ElementNameParser, t.elementCloseEnd))
    ),
    (result, path, ctx): ParseResult<Ast.RawElement> => {
      const [_begin, elementName, attributes, whitespaceAfterAttributes, _end, content, close] = result.value;
      const closeName = typeof close === 'string' ? null : close[1];
      if (closeName) {
        if (!sameComponent(elementName, closeName)) {
          const closeRange = ctx.ranges.get(closeName);
          return ParseFailure(closeRange?.end ?? 0, path, () => `Invalid close tag: wrong component`);
        }
      }
      const node = ctx.createNode('RawElement', result.start, result.end, {
        attributes,
        name: elementName,
        whitespaceAfterAttributes,
        namedCloseTag: closeName !== null,
        content,
      });
      return {
        type: result.type,
        start: result.start,
        end: result.end,
        rest: result.rest,
        ifError: result.ifError,
        value: node,
      };
    }
  )
);

SelfClosingElementParser.setParser(
  nodeParser(
    'SelfClosingElement',
    p.applyPipe(
      [
        t.elementSelfClosingStart,
        ElementNameParser,
        AttributesParser,
        p.maybe(WhitespaceLikeParser),
        t.elementSelfClosingEnd,
      ],
      ([_begin, elementName, attributes, whitespaceAfterAttributes, _tagEnd]) => {
        return { name: elementName, attributes, whitespaceAfterAttributes };
      }
    )
  )
);

LineElementParser.setParser(
  nodeParser(
    'LineElement',
    p.applyPipe(
      [
        t.lessThan,
        ElementNameParser,
        AttributesParser,
        p.maybe(WhitespaceLikeParser),
        t.greaterThan,
        p.many(LineChildParser),
      ],
      ([_begin, elementName, attributes, whitespaceAfterAttributes, _end, children]) => {
        return { name: elementName, attributes, children, whitespaceAfterAttributes };
      }
    )
  )
);

FragmentParser.setParser(
  nodeParser(
    'Fragment',
    p.applyPipe([t.fragmentToken, p.many(ChildParser), t.elementCloseShortcut], ([_open, children]) => ({ children }))
  )
);

RawFragmentParser.setParser(
  nodeParser(
    'RawFragment',
    p.applyPipe([t.rawFragmentToken, t.rawTextContent, t.elementCloseShortcut], ([_open, content]) => ({ content }))
  )
);

AttributesParser.setParser(p.many(AttributeParser));

AttributeParser.setParser(
  nodeParser(
    'Attribute',
    p.applyPipe(
      [WhitespaceLikeParser, IdentifierParser, p.maybe(p.pipe(t.equal, ExpressionParser))],
      ([whitespaceBefore, name, val]) => ({ whitespaceBefore, name, value: val ? val[1] : undefined })
    )
  )
);

WhitespaceLikeParser.setParser(
  p.apply(
    p.many(p.oneOf(AnyCommentParser, WhitespaceParser), { allowEmpty: false }),
    (whitespaces): Ast.WhitespaceLike => (whitespaces.length === 1 ? whitespaces[0] : whitespaces) as Ast.WhitespaceLike
  )
);

WhitespaceParser.setParser(
  nodeParser(
    'Whitespace',
    p.apply(t.whitespace, (content) => {
      const hasNewLine = content.indexOf('\n') >= 0;
      return { content, hasNewLine };
    })
  )
);

LineWhitespaceParser.setParser(
  nodeParser(
    'Whitespace',
    p.apply(t.lineWhitespace, (content) => {
      const hasNewLine = content.indexOf('\n') >= 0;
      return { content, hasNewLine };
    })
  )
);

AnyCommentParser.setParser(p.oneOf(LineCommentParser, BlockCommentParser));

LineCommentParser.setParser(
  nodeParser(
    'LineComment',
    p.applyPipe([t.lineCommentStart, p.maybe(t.lineCommentContent)], ([_start, content]) => ({
      content: content || '',
    }))
  )
);

BlockCommentParser.setParser(
  nodeParser(
    'BlockComment',
    p.applyPipe(
      [t.blockCommentStart, p.maybe(t.blockCommentContent), p.oneOf(t.blockCommentEnd, t.eof)],
      ([_start, content]) => ({ content: content || '' })
    )
  )
);

ExpressionParser.setParser(p.oneOf(PrimitiveParser, ObjOrArrParser, ChainableExpressionParser));

PrimitiveParser.setParser(p.oneOf(NumParser, BoolParser, NullParser, UndefinedParser, StrParser));

NumParser.setParser(
  nodeParser(
    'Num',
    p.apply(t.number, (rawValue) => ({ value: parseFloat(rawValue), rawValue }))
  )
);

BoolParser.setParser(
  nodeParser(
    'Bool',
    p.apply(p.oneOf(t.trueToken, t.falseToken), (val) => ({ value: val === 'true' ? true : false }))
  )
);

NullParser.setParser(
  nodeParser(
    'Null',
    p.apply(t.nullToken, () => ({}))
  )
);

UndefinedParser.setParser(
  nodeParser(
    'Undefined',
    p.apply(t.undefinedToken, () => ({}))
  )
);

StrParser.setParser(
  nodeParser(
    'Str',
    p.apply(
      p.oneOf(
        p.pipe(t.singleQuote, p.maybe(t.singleQuoteStringContent), t.singleQuote),
        p.pipe(t.doubleQuote, p.maybe(t.doubleQuoteStringContent), t.doubleQuote),
        p.pipe(t.backtick, p.maybe(t.backtickStringContent), t.backtick)
      ),
      ([rawQuote, content]) => {
        const quote: Ast.QuoteType =
          rawQuote === t.SINGLE_QUOTE ? 'Single' : rawQuote === t.DOUBLE_QUOTE ? 'Double' : 'Backtick';
        return { value: content ?? '', quote };
      }
    )
  )
);

ObjOrArrParser.setParser(p.oneOf(ArrParser, ObjParser));

ArrParser.setParser(
  nodeParser(
    'Arr',
    p.applyPipe(
      [t.squareBracketOpen, p.maybe(p.oneOf(ListItemsParser, WhitespaceLikeParser)), t.squareBracketClose],
      ([_open, items, _close]) => ({ items })
    )
  )
);

ListItemsParser.setParser(
  nodeParser(
    'ListItems',
    p.applyPipe(
      [p.manySepBy(ListItemParser, t.comma, { allowEmpty: false }), p.maybe(TrailingCommaParser)],
      ([items, trailingComma]) => ({ items: nonEmptyArray(flattenManySepBy(items)), trailingComma })
    )
  )
);

ListItemParser.setParser(
  nodeParser(
    'ListItem',
    p.applyPipe(
      [p.maybe(WhitespaceLikeParser), ExpressionParser, p.maybe(WhitespaceLikeParser)],
      ([whitespaceBefore, item, whitespaceAfter]) => ({ whitespaceBefore, item, whitespaceAfter })
    )
  )
);

ObjParser.setParser(
  nodeParser(
    'Obj',
    p.applyPipe(
      [t.curlyBracketOpen, p.maybe(p.oneOf(ObjItemsParser, WhitespaceLikeParser)), t.curlyBracketClose],
      ([_open, items, _close]) => {
        return { items };
      }
    )
  )
);

ObjItemsParser.setParser(
  nodeParser(
    'ObjItems',
    p.applyPipe(
      [p.manySepBy(ObjItemParser, t.comma, { allowEmpty: false, allowTrailing: false }), p.maybe(TrailingCommaParser)],
      ([properties, trailingComma]) => ({ properties: nonEmptyArray(flattenManySepBy(properties)), trailingComma })
    )
  )
);

TrailingCommaParser.setParser(
  nodeParser(
    'TrailingComma',
    p.applyPipe([t.comma, p.maybe(WhitespaceLikeParser)], ([_comma, whitespaceAfter]) => ({
      whitespaceAfter,
    }))
  )
);

ObjItemParser.setParser(
  nodeParser(
    'ObjItem',
    p.applyPipe(
      [p.maybe(WhitespaceLikeParser), AnyObjPropertyParser, p.maybe(WhitespaceLikeParser)],
      ([whitespaceBefore, property, whitespaceAfter]) => ({ whitespaceBefore, property, whitespaceAfter })
    )
  )
);

AnyObjPropertyParser.setParser(
  p.oneOf(ObjPropertyParser, ObjComputedPropertyParser, ObjPropertyShorthandParser, SpreadParser)
);

ObjPropertyParser.setParser(
  nodeParser(
    'ObjProperty',
    p.applyPipe(
      [
        p.oneOf(IdentifierParser, StrParser),
        p.maybe(WhitespaceLikeParser),
        t.colon,
        p.maybe(WhitespaceLikeParser),
        ExpressionParser,
      ],
      ([name, whitespaceBeforeColon, _colon, whitespaceAfterColon, value]) => ({
        name,
        value,
        whitespaceAfterColon,
        whitespaceBeforeColon,
      })
    )
  )
);

ObjComputedPropertyParser.setParser(
  nodeParser(
    'ObjComputedProperty',
    p.applyPipe(
      [
        t.squareBracketOpen,
        p.maybe(WhitespaceLikeParser),
        ExpressionParser,
        p.maybe(WhitespaceLikeParser),
        t.squareBracketClose,
        p.maybe(WhitespaceLikeParser),
        t.colon,
        p.maybe(WhitespaceLikeParser),
        ExpressionParser,
      ],
      ([
        _openBracket,
        whitespaceBeforeExpression,
        expression,
        whitespaceAfterExpression,
        _closeBracket,
        whitespaceBeforeColon,
        _colon,
        whitespaceAfterColon,
        value,
      ]) => {
        return {
          whitespaceBeforeExpression,
          expression,
          whitespaceAfterExpression,
          whitespaceBeforeColon,
          whitespaceAfterColon,
          value,
        };
      }
    )
  )
);

ObjPropertyShorthandParser.setParser(
  nodeParser(
    'ObjPropertyShorthand',
    p.applyPipe(
      [p.maybe(WhitespaceLikeParser), IdentifierParser, p.maybe(WhitespaceLikeParser)],
      ([whitespaceBefore, name, whitespaceAfter]) => ({ whitespaceBefore, name, whitespaceAfter })
    )
  )
);

SpreadParser.setParser(
  nodeParser(
    'Spread',
    p.applyPipe([t.spreadOperator, ExpressionParser], ([_op, target]) => ({ target }))
  )
);

ChainableExpressionParser.setParser(
  p.oneOf(
    ChainableExpressionBaseParser,
    p.reduceRight(
      ChainableExpressionBaseParser,
      ChainableExpressionItemParser,
      (left, right, _path, ctx): ParseResult<Ast.ChainableExpression> => {
        const start = left.start;
        const end = right.end;
        const item = right.value;
        const target = left.value;
        if (item.type === 'ChainableMemberExpression') {
          return ParseSuccess(
            start,
            right.rest,
            ctx.createNode('MemberExpression', start, end, { target, property: item.indentifier })
          );
        }
        if (item.type === 'ChainableComputedMemberExpression') {
          return ParseSuccess(
            start,
            right.rest,
            ctx.createNode('ComputedMemberExpression', start, end, { target, property: item.value })
          );
        }
        if (item.type === 'ChainableCallExpression') {
          return ParseSuccess(
            start,
            right.rest,
            ctx.createNode('CallExpression', start, end, { target, arguments: item.arguments })
          );
        }
        throw new DocsyError.UnexpectedError(`Access on invalid type`);
      }
    )
  )
);

ChainableExpressionBaseParser.setParser(p.oneOf(IdentifierParser, ParenthesisParser));

IdentifierParser.setParser(
  nodeParser(
    'Identifier',
    p.apply(t.identifier, (name) => ({ name }))
  )
);

ParenthesisParser.setParser(
  nodeParser(
    'Parenthesis',
    p.applyPipe([t.parenthesisOpen, ExpressionParser, t.parenthesisClose], ([_open, value, _close]) => ({ value }))
  )
);

ChainableExpressionItemParser.setParser(
  p.oneOf(ChainableMemberExpressionParser, ChainableComputedMemberExpressionParser, ChainableCallExpressionParser)
);

ChainableMemberExpressionParser.setParser(
  p.applyPipe([t.dot, IdentifierParser], ([_dot, indentifier], _start, end) => ({
    type: 'ChainableMemberExpression',
    indentifier,
    end,
  }))
);

ChainableComputedMemberExpressionParser.setParser(
  p.applyPipe([t.squareBracketOpen, ExpressionParser, t.squareBracketClose], ([_bracket, value], _start, end) => ({
    type: 'ChainableComputedMemberExpression',
    value,
    end,
  }))
);

ChainableCallExpressionParser.setParser(
  p.applyPipe(
    [t.parenthesisOpen, p.maybe(p.oneOf(ListItemsParser, WhitespaceLikeParser)), t.parenthesisClose],
    ([_parenthesis, args], _start, end) => ({
      type: 'ChainableCallExpression',
      arguments: args,
      end,
    })
  )
);

// Utils

function sameComponent(left: Ast.ElementName, right: Ast.ElementName): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (Ast.NodeIs.Identifier(left) && Ast.NodeIs.Identifier(right) && left.name === right.name) {
    return true;
  }
  if (Ast.NodeIs.ElementNameMember(left) && Ast.NodeIs.ElementNameMember(right)) {
    return sameComponent(left.target, right.target) && sameComponent(left.property, right.property);
  }
  return false;
}

function flattenManySepBy<T, Sep>(result: p.ManySepByResult<T, Sep>): Array<T> {
  if (result === null) {
    return [];
  }
  const { head, tail } = result;
  return [head, ...tail.map((v) => v.item)];
}

function parseElementName(str: string, start: number, end: number, ctx: ParserContext): Ast.ElementName {
  const parts = str.split('.');
  if (parts.length === 1) {
    return ctx.createNode('Identifier', start, end, { name: parts[0] });
  }
  const [first, ...rest] = parts;
  let pos = 0;
  let acc: Ast.ElementName = ctx.createNode('Identifier', start + pos, start + pos + first.length, { name: first });
  pos += first.length;
  for (const part of rest) {
    acc = ctx.createNode('ElementNameMember', start, start + pos + part.length, {
      target: acc,
      property: ctx.createNode('Identifier', start + pos, start + pos + part.length, { name: part }),
    });
    pos += part.length;
  }
  return acc;
}
