import {
  Document,
  Children,
  Nodes,
  NodeType,
  Node,
  ComponentType,
  Expression,
  ObjectItem,
  DottableExpression,
  QuoteType,
  NodeIs,
  PropItem,
} from './utils/Node';
import { InputStream, Position } from './utils/InputStream';
import {
  BACKTICK,
  DIGIT_REGEX,
  DOUBLE_QUOTE,
  IDENTIFIER_REGEX,
  IDENTIFIER_START_REGEX,
  SINGLE_QUOTE,
} from './utils/constants';

type CurrentComponent =
  | { type: 'DOCUMENT' | 'UNRAW' }
  | { type: 'NORMAL' | 'RAW'; tag: ComponentType | null }; // null === Fragment

export type Ranges = Map<Node, Range>;

export const DocsyParser = {
  parseDocument,
};

export interface Range {
  start: Position;
  end: Position;
}

export interface ParseDocumentResult {
  document: Document;
  ranges: Ranges;
}

function parseDocument(file: string): ParseDocumentResult {
  const input = InputStream(file);

  const ranges: Ranges = new Map<Node, Range>();
  const document = parseDocument();

  return { document, ranges };

  function parseDocument(): Document {
    const startPos = input.position();
    const children = parseChildren({ type: 'DOCUMENT' });
    const endPos = input.position();
    return createNode(
      'Document',
      startPos,
      endPos,
      {
        children,
      },
      {}
    );
  }

  function parseChildren(currentComponent: CurrentComponent): Array<Children> {
    let limit = 2000;
    const children: Array<Children> = [];
    while (!input.eof()) {
      limit--;
      if (limit <= 0) {
        input.croak('Infinit loop !');
      }
      const beforeItemState = input.saveState();
      const item = parseNextChildren(currentComponent);
      if (item === 'CLOSE') {
        input.restoreState(beforeItemState);
        break;
      }
      children.push(item);
    }
    return normalizeChildren(children);
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

  function normalizeChildren(nodes: Array<Children>): Array<Children> {
    return (
      nodes
        // join neighbour Text nodes
        .reduce<Array<Children>>((acc, item) => {
          if (acc.length === 0) {
            acc.push(item);
            return acc;
          }
          // join Text nodes
          const last = acc[acc.length - 1];
          if (NodeIs.Text(last) && NodeIs.Text(item)) {
            acc.pop();
            acc.push(
              createNode(
                'Text',
                ranges.get(last)!.start,
                ranges.get(item)!.end,
                {},
                {
                  content: last.meta.content + item.meta.content,
                }
              )
            );
          } else {
            acc.push(item);
          }
          return acc;
        }, [])
        // convert single whitespace text to Whitespace node
        .map((item) => {
          if (NodeIs.Text(item)) {
            if (item.meta.content.length === 1 && isWhitespace(item.meta.content)) {
              const pos = ranges.get(item);
              if (!pos) {
                throw new Error('Missing range');
              }
              return createNode(
                'Whitespace',
                pos.start,
                pos.end,
                {},
                { content: item.meta.content }
              );
            }
          }
          return item;
        })
    );
  }

  function parseNextChildren(currentComponent: CurrentComponent): Children | 'CLOSE' {
    const start = input.position();
    if (currentComponent.type === 'RAW') {
      const tag = currentComponent.tag;
      if (tag === null) {
        // in RawFragment
        if (peek('<#>')) {
          // close RawFragment
          skip('<#>');
          return 'CLOSE';
        }
        return parseTextChildren({ mode: 'raw', skipFirst: !isText(input.peek()) });
      }
      // in RawElement
      if (peek('#>')) {
        skip('#>');
        return 'CLOSE';
      }
      if (peek('<#>')) {
        return parseUnrawFragment();
      }
      if (peek('<')) {
        const close = maybeParseRawCloseTag();
        if (close) {
          if (!sameComponent(close, tag)) {
            input.croak(`Unexpected close tag, wrong tag !`);
          }
          return 'CLOSE';
        }
      }
      return parseTextChildren({ mode: 'raw', skipFirst: !isText(input.peek()) });
    }
    // Not in a RAW tag
    if (peek('<#>')) {
      if (currentComponent.type === 'UNRAW') {
        skip('<#>');
        return 'CLOSE';
      }
      return parseRawFragment(start);
    }
    if (peek('<|>')) {
      if (currentComponent.type === 'DOCUMENT') {
        return parseFragment(start);
      }
      if (currentComponent.type === 'UNRAW') {
        return parseFragment(start);
      }
      if (currentComponent.type === 'NORMAL') {
        if (currentComponent.tag === null) {
          return 'CLOSE';
        }
        return parseFragment(start);
      }
      return input.croak(`Unhandled case`);
    }
    if (peek('<|')) {
      const elem = maybeParseElement();
      if (elem) {
        return elem;
      }
      return parseTextChildren({ skipFirst: true });
    }
    if (peek('<#')) {
      const elem = maybeParseRawElement();
      if (elem) {
        return elem;
      }
      return parseTextChildren({ skipFirst: true });
    }
    if (peek('<')) {
      if (currentComponent.type === 'NORMAL' && currentComponent.tag !== null) {
        const close = maybeParseCloseTag();
        if (close) {
          if (!sameComponent(close, currentComponent.tag)) {
            input.croak(`Unexpected close tag, wrong tag !`);
          }
          return 'CLOSE';
        }
      }
      return parseTextChildren({ skipFirst: true });
    }
    if (peek('|>')) {
      skip('|>');
      if (currentComponent.type === 'NORMAL') {
        return 'CLOSE';
      }
    }
    if (peek('//')) {
      return parseLineComment();
    }
    if (peek('/*')) {
      return parseBlockComment();
    }
    const whitespace = parseTextWhitespace();
    if (whitespace) {
      return whitespace;
    }
    return parseTextChildren({ skipFirst: !isText(input.peek()) });
  }

  function maybeParseRawCloseTag(): ComponentType | false {
    const state = input.saveState();
    try {
      skip('<');
      const identifier = parseIdentifier();
      const component = maybeParseElementTypeMember(identifier);
      skip('#>');
      return component;
    } catch (err) {
      input.restoreState(state);
      return false;
    }
  }

  function parseFragment(start: Position): Node<'Fragment'> {
    skip('<|>');
    const children = parseChildren({ type: 'NORMAL', tag: null });
    skip('<|>');
    return createNode('Fragment', start, input.position(), { children }, {});
  }

  function parseRawFragment(start: Position): Node<'RawFragment'> {
    skip('<#>');
    const children = parseChildren({ type: 'RAW', tag: null });
    skip('<#>');
    return createNode('RawFragment', start, input.position(), { children }, {});
  }

  function parseUnrawFragment(): Node<'Fragment'> {
    const start = input.position();
    skip('<#>');
    const children = parseChildren({ type: 'UNRAW' });
    skip('<#>');
    return createNode('Fragment', start, input.position(), { children }, {});
  }

  function parseTextChildren({
    mode = 'normal',
    skipFirst = false,
  }: { mode?: 'normal' | 'raw'; skipFirst?: boolean } = {}): Node<'Text'> {
    const start = input.position();
    let text = '';
    if (skipFirst) {
      text += input.next();
    }
    text += parseText(mode);
    return createNode('Text', start, input.position(), {}, { content: text });
  }

  function parseText(mode: 'normal' | 'raw'): string {
    let text = '';
    let limit = 2000;
    while (!input.eof()) {
      limit--;
      if (limit <= 0) {
        input.croak('Infinit loop !');
      }
      text += readWhile(isText);
      if (input.eof()) {
        break;
      }
      if (!isWhitespace(input.peek())) {
        break;
      }
      if (mode === 'normal') {
        const nextTwo = input.peek(2);
        if (nextTwo.length < 2) {
          // eof
          text += nextTwo;
          break;
        }

        if (nextTwo.split('').every(isWhitespace)) {
          // two consecutive whitespaces => end
          break;
        }
        // otherwise add the whitespace and keep going
        text += input.next();
      } else {
        // next is a whitespace, keep parsing
        text += input.next();
      }
    }
    return text;
  }

  function parseBlockComment(): Node<'BlockComment'> {
    const start = input.position();
    skip('/*');
    let content = '';
    while (peek('*/') === false) {
      if (peek('*')) {
        content += input.next();
      }
      content += readWhile((char) => char !== '*');
    }
    skip('*/');
    const elem = createNode(
      'BlockComment',
      start,
      input.position(),
      {},
      {
        content,
      }
    );
    return elem;
  }

  function parseLineComment(): Node<'LineComment'> {
    const start = input.position();
    skip('//');
    const content = readWhile((char) => char !== '\n');
    const elem = createNode(
      'LineComment',
      start,
      input.position(),
      {},
      {
        content,
      }
    );
    if (!input.eof()) {
      skip('\n');
    }
    return elem;
  }

  function maybeParseElement(): false | Node<'Element' | 'SelfClosingElement'> {
    const start = input.position();
    const tag = maybeParseElementStart();
    if (tag === false) {
      return false;
    }
    const props = parseProps(true);
    if (peek('|>')) {
      skip('|>');
      return createNode(
        'SelfClosingElement',
        start,
        input.position(),
        {
          component: tag as any,
          props,
        },
        {}
      );
    }
    skip('>');
    const children = parseChildren({ type: 'NORMAL', tag: tag });
    const namedClose = (() => {
      if (peek('|>')) {
        skip('|>');
        return false;
      }
      // name (ne need to check, we already did in parseChildren)
      skip('<');
      const identifier = parseIdentifier();
      maybeParseElementTypeMember(identifier);
      skip('|>');
      return true;
    })();
    return createNode(
      'Element',
      start,
      input.position(),
      {
        component: tag,
        props,
        children,
      },
      {
        namedCloseTag: namedClose,
      }
    );
  }

  function maybeParseElementStart(): ComponentType | false {
    try {
      skip('<|');
      return parseElementType();
    } catch (error) {
      return false;
    }
  }

  function maybeParseRawElement(): false | Node<'RawElement'> {
    const start = input.position();
    const tag = maybeParseRawElementStart();
    if (tag === false) {
      return false;
    }
    const props = parseProps(false);
    skip('>');
    const children = parseChildren({ type: 'RAW', tag: tag });
    const namedClose = (() => {
      if (peek('#>')) {
        skip('#>');
        return false;
      }
      // name (ne need to check, we already did in parseChildren)
      skip('<');
      const identifier = parseIdentifier();
      maybeParseElementTypeMember(identifier);
      skip('#>');
      return true;
    })();
    return createNode(
      'RawElement',
      start,
      input.position(),
      {
        component: tag,
        props,
        children,
      },
      {
        namedCloseTag: namedClose,
      }
    );
  }

  function maybeParseRawElementStart(): ComponentType | false {
    try {
      skip('<#');
      return parseElementType();
    } catch (error) {
      return false;
    }
  }

  function parseProps(canSelfClose: boolean): Node<'Props'> {
    const propItems: Array<PropItem> = [];
    const propsStart = input.position();
    const whitespace = parseWhitespace();
    if (whitespace) {
      propItems.push(whitespace);
    }
    if (peek('>') || (canSelfClose && peek('|>'))) {
      return createNode('Props', propsStart, input.position(), { items: propItems }, {});
    }
    if (!whitespace) {
      return input.croak(`Expected at least one whitespace`);
    }
    while (!peek('>') && (canSelfClose === true ? !peek('|>') : true)) {
      const whitespaceBefore = parseWhitespace();
      if (whitespaceBefore) {
        propItems.push(whitespaceBefore);
      }
      const nextPropItem = parsePropOrComment();
      propItems.push(nextPropItem);
      const whitespaceAfter = parseWhitespace();
      if (!whitespaceAfter) {
        break;
      }
      propItems.push(whitespaceAfter);
      if (peek('>') || (canSelfClose && peek('|>'))) {
        break;
      }
    }
    return createNode('Props', propsStart, input.position(), { items: propItems }, { whitespace });
  }

  function parsePropOrComment(): PropItem {
    if (peek('//')) {
      const lineComment = parseLineComment();
      const position = ranges.get(lineComment)!;
      return createNode(
        'PropLineComment',
        position!.start,
        position!.end,
        {},
        { content: lineComment.meta.content }
      );
    }
    if (peek('/*')) {
      const blockComment = parseBlockComment();
      const position = ranges.get(blockComment)!;
      return createNode(
        'PropBlockComment',
        position!.start,
        position!.end,
        {},
        { content: blockComment.meta.content }
      );
    }
    const propStart = input.position();
    const name = parseIdentifier();
    if (!peek('=')) {
      return createNode('NoValueProp', propStart, input.position(), { name }, {});
    }
    skip('=');
    const value = parseExpression();
    return createNode('Prop', propStart, input.position(), { name, value }, {});
  }

  function parseExpression(): Expression {
    const ch = input.peek();
    if (peek('{')) {
      return parseObject();
    }
    if (peek('(')) {
      const start = input.position();
      skip('(');
      const value = parseExpression();
      skip(')');
      return createNode('Parenthesis', start, input.position(), { value }, {});
    }
    if (peek('[')) {
      return parseArray();
    }
    if (peek('-') || isDigit(ch)) {
      return parseNumber();
    }
    if (ch === SINGLE_QUOTE || ch === DOUBLE_QUOTE || ch === BACKTICK) {
      return parseString();
    }
    const start = input.position();
    const identifier = parseIdentifier();
    if (identifier.meta.name === 'true') {
      return createNode('Bool', start, input.position(), {}, { value: true });
    }
    if (identifier.meta.name === 'false') {
      return createNode('Bool', start, input.position(), {}, { value: false });
    }
    if (identifier.meta.name === 'null') {
      return createNode('Null', start, input.position(), {}, {});
    }
    if (identifier.meta.name === 'undefined') {
      return createNode('Undefined', start, input.position(), {}, {});
    }
    return maybeParseMember(identifier);
    // if (input.eof()) {
    //   return input.croak(`Unexpected eof`);
    // }
    // return input.croak(`Unexpected "${ch}"`);
  }

  function maybeParseMember(identifier: DottableExpression): DottableExpression {
    if (peek('.')) {
      skip('.');
      const property = parseIdentifier();
      const next = createNode(
        'DotMember',
        ranges.get(identifier)!.start,
        input.position(),
        {
          target: identifier,
          property,
        },
        {}
      );
      return maybeParseMember(next);
    }
    if (peek('[')) {
      skip('[');
      const property = parseExpression();
      skip(']');
      const next = createNode(
        'BracketMember',
        ranges.get(identifier)!.start,
        input.position(),
        {
          target: identifier,
          property,
        },
        {}
      );
      return maybeParseMember(next);
    }
    if (peek('(')) {
      skip('(');
      const args = parseArrayItems(')');
      skip(')');
      const next = createNode(
        'FunctionCall',
        ranges.get(identifier)!.start,
        input.position(),
        {
          target: identifier,
          arguments: args,
        },
        {}
      );
      return maybeParseMember(next);
    }
    return identifier;
  }

  function parseObject(): Node<'Object'> {
    const start = input.position();
    skip('{');
    const items: Array<ObjectItem> = [];
    while (!input.eof() && input.peek() !== '}') {
      parseWhitespace();
      maybeSkip(',');
      parseWhitespace();
      if (!input.eof() && input.peek() === '}') {
        break;
      }
      parseWhitespace();
      items.push(parseObjectItem());
    }
    parseWhitespace();
    skip('}');
    return createNode('Object', start, input.position(), { items }, {});
  }

  function parseObjectItem(): ObjectItem {
    const start = input.position();
    if (peek(SINGLE_QUOTE) || peek(DOUBLE_QUOTE) || peek(BACKTICK)) {
      const name = parseString();
      skip(':');
      parseWhitespace();
      const value = parseExpression();
      return createNode('Property', start, input.position(), { name, value }, {});
    }
    if (peek('...')) {
      return parseSpread();
    }
    if (peek('[')) {
      const computedStart = input.position();
      skip('[');
      const computedValue = parseExpression();
      skip(']');
      skip(':');
      parseWhitespace();
      const value = parseExpression();
      return createNode(
        'ComputedProperty',
        computedStart,
        input.position(),
        {
          expression: computedValue,
          value,
        },
        {}
      );
    }
    // simple property
    const name = parseIdentifier();
    if (!peek(':')) {
      return createNode('PropertyShorthand', start, input.position(), { name }, {});
    }
    skip(':');
    parseWhitespace();
    const value = parseExpression();
    return createNode('Property', start, input.position(), { name, value }, {});
  }

  function parseSpread(): Node<'Spread'> {
    const start = input.position();
    skip('...');
    const target = parseExpression();
    return createNode('Spread', start, input.position(), { target }, {});
  }

  function parseArrayItems(endChar: string): Array<Node<'ArrayItem'>> {
    const items: Array<Node<'ArrayItem'>> = [];
    while (!input.eof() && input.peek() !== endChar) {
      const isFirst = items.length === 0;
      if (isFirst === false) {
        maybeSkip(',');
      }
      const itemStart = input.position();
      const whitespaceBefore = parseWhitespace() || null;
      if (!input.eof() && input.peek() === endChar) {
        break;
      }
      const value = parseExpression();
      const whitespaceAfter = parseWhitespace() || null;
      const item = createNode(
        'ArrayItem',
        itemStart,
        input.position(),
        {
          whitespaceBefore,
          item: value,
          whitespaceAfter,
        },
        {}
      );
      items.push(item);
    }
    return items;
  }

  function parseArray(): Node<'Array'> {
    const start = input.position();
    skip('[');
    const items = parseArrayItems(']');
    skip(']');
    return createNode('Array', start, input.position(), { items }, {});
  }

  function parseNumber(): Node<'Num'> {
    const start = input.position();
    const negative = peek('-');
    if (negative) {
      skip('-');
    }
    let hasDot = false;
    const number = readWhile((ch) => {
      if (ch === '.') {
        if (hasDot) {
          return false;
        }
        hasDot = true;
        return true;
      }
      return isDigit(ch);
    });
    const value = parseFloat(number) * (negative ? -1 : 1);
    return createNode(
      'Num',
      start,
      input.position(),
      {},
      {
        value,
        rawValue: input.get(start, input.position()),
      }
    );
  }

  function parseString(): Node<'Str'> {
    const start = input.position();
    let escaped = false;
    let str = '';
    const end = input.next();
    while (!input.eof()) {
      const ch = input.next();
      if (end !== BACKTICK && ch === '\n') {
        break;
      }
      if (escaped) {
        str += ch;
        escaped = false;
      } else if (ch === end) {
        break;
      } else if (ch === '\\') {
        escaped = true;
      } else {
        str += ch;
      }
    }
    const quoteType: QuoteType =
      end === BACKTICK ? 'Backtick' : end === SINGLE_QUOTE ? 'Single' : 'Double';
    return createNode('Str', start, input.position(), {}, { value: str, quote: quoteType });
  }

  function isDigit(ch: string): boolean {
    return DIGIT_REGEX.test(ch);
  }

  function maybeParseCloseTag(): ComponentType | false {
    const state = input.saveState();
    try {
      skip('<');
      const identifier = parseIdentifier();
      const component = maybeParseElementTypeMember(identifier);
      skip('|>');
      return component;
    } catch (err) {
      input.restoreState(state);
      return false;
    }
  }

  function parseElementType(): ComponentType {
    const identifier = parseIdentifier();
    return maybeParseElementTypeMember(identifier);
  }

  function maybeParseElementTypeMember(
    parent: Node<'Identifier' | 'ElementTypeMember'>
  ): ComponentType {
    if (input.peek() === '.') {
      skip('.');
      const nextId = parseIdentifier();
      const nextParent = createNode(
        'ElementTypeMember',
        ranges.get(parent)!.start,
        input.position(),
        {
          target: parent,
          property: nextId,
        },
        {}
      );
      return maybeParseElementTypeMember(nextParent);
    }
    return parent;
  }

  function parseIdentifier(): Node<'Identifier'> {
    if (isIdentifierStart(input.peek())) {
      const startPos = input.position();
      const name = readWhile(isIdentifier);
      return createNode('Identifier', startPos, input.position(), {}, { name });
    }
    return input.croak(`Unexpected "${input.peek()}"`);
  }

  function skip(char: string) {
    if (input.peek(char.length) !== char) {
      input.croak(`Expected ${char} got ${input.peek()}`);
    }
    input.next(char.length);
  }

  function peek(char: string): boolean {
    return input.peek(char.length) === char;
  }

  function readWhile(predicate: (ch: string) => boolean): string {
    let str = '';
    while (!input.eof() && predicate(input.peek())) {
      str += input.next();
    }
    return str;
  }

  function parseWhitespace(): Node<'Whitespace'> | false {
    if (input.eof()) {
      return false;
    }
    if (!isWhitespace(input.peek())) {
      return false;
    }
    const start = input.position();
    let content = '';
    while (!input.eof() && isWhitespace(input.peek())) {
      content += input.next();
    }
    if (content.length === 0) {
      return false;
    }
    return createNode('Whitespace', start, input.position(), {}, { content });
  }

  // start by at least two whitespaces
  function parseTextWhitespace(): Node<'Whitespace'> | false {
    if (input.eof()) {
      return false;
    }
    const start = input.position();
    let content = '';
    const nextTwo = input.peek(2);
    if (nextTwo.length < 2) {
      // eof
      return false;
    }
    if (!nextTwo.split('').every(isWhitespace)) {
      return false;
    }
    while (!input.eof() && isWhitespace(input.peek())) {
      content += input.next();
    }
    if (content.length === 0) {
      return false;
    }
    return createNode('Whitespace', start, input.position(), {}, { content });
  }

  function isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  function isText(char: string) {
    return (
      char !== '#' && char !== '<' && char !== '|' && char !== '/' && isWhitespace(char) === false
    );
  }

  function isIdentifierStart(ch: string): boolean {
    return IDENTIFIER_START_REGEX.test(ch);
  }

  function isIdentifier(ch: string): boolean {
    return IDENTIFIER_REGEX.test(ch);
  }

  function maybeSkip(char: string) {
    if (input.peek() === char) {
      input.next();
    }
  }

  function createNode<K extends NodeType>(
    type: K,
    start: Position,
    end: Position,
    nodes: Nodes[K]['nodes'],
    meta: Nodes[K]['meta']
  ): Node<K> {
    const node: Node<K> = {
      type,
      nodes,
      meta,
    } as any;
    ranges.set(node, {
      start,
      end,
    });
    return node;
  }
}
