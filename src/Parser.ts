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
  ArrayItem,
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

export function parse(file: string): Document {
  const input = InputStream(file);

  return parseDocument();

  function parseDocument(): Document {
    const startPos = input.position();
    const children = parseChildren({ type: 'DOCUMENT' });
    const endPos = input.position();
    return createNode('Document', startPos, endPos, {
      children,
    });
  }

  function parseChildren(currentComponent: CurrentComponent): Array<Children> {
    let limit = 2000;
    const children: Array<Children> = [];
    while (!input.eof() && limit > 0) {
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
    if (NodeIs.Identifier(left) && NodeIs.Identifier(right) && left.name === right.name) {
      return true;
    }
    if (NodeIs.ElementTypeMember(left) && NodeIs.ElementTypeMember(right)) {
      return (
        sameComponent(left.target, right.target) && sameComponent(left.property, right.property)
      );
    }
    return false;
  }

  function normalizeChildren(nodes: Array<Children>): Array<Children> {
    return nodes.reduce<Array<Children>>((acc, item) => {
      if (acc.length === 0) {
        acc.push(item);
        return acc;
      }
      // join Text nodes
      const last = acc[acc.length - 1];
      if (NodeIs.Text(last) && NodeIs.Text(item)) {
        acc.pop();
        acc.push(
          createNode('Text', last.position!.start, item.position!.end, {
            content: last.content + item.content,
          })
        );
      } else {
        acc.push(item);
      }
      return acc;
    }, []);
  }

  function parseNextChildren(currentComponent: CurrentComponent): Children | 'CLOSE' {
    const start = input.position();
    if (currentComponent.type === 'RAW') {
      const tag = currentComponent.tag;
      if (tag === null) {
        // in RawFragment
        if (peek('<#>')) {
          skip('<#>');
          return 'CLOSE';
        }
        return parseTextChildren(start);
      }
      // in RawElement

      if (peek('#>')) {
        skip('#>');
        return 'CLOSE';
      }
      if (peek('<#>')) {
        return parseUnrawFragment(start);
      }
      if (peek('<')) {
        const close = maybeParseRawCloseTag();
        if (close && sameComponent(close, tag)) {
          return 'CLOSE';
        }
      }
      return parseTextChildren(start);
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
    }
    if (peek('<#')) {
      const elem = maybeParseRawElement();
      if (elem) {
        return elem;
      }
    }
    if (peek('<')) {
      if (currentComponent.type === 'NORMAL' && currentComponent.tag !== null) {
        const close = maybeParseCloseTag();
        if (close && sameComponent(close, currentComponent.tag)) {
          return 'CLOSE';
        }
      }
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
    return parseTextChildren(start);
  }

  function maybeParseRawCloseTag(): ComponentType | false {
    try {
      skip('<');
      const identifier = parseIdentifier();
      const component = maybeParseElementTypeMember(identifier);
      skip('#>');
      return component;
    } catch (err) {
      return false;
    }
  }

  function parseFragment(start: Position): Node<'Fragment'> {
    skip('<|>');
    const children = parseChildren({ type: 'NORMAL', tag: null });
    skip('<|>');
    return createNode('Fragment', start, input.position(), { children });
  }

  function parseRawFragment(start: Position): Node<'RawFragment'> {
    skip('<#>');
    const children = parseChildren({ type: 'RAW', tag: null });
    skip('<#>');
    return createNode('RawFragment', start, input.position(), { children });
  }

  function parseUnrawFragment(start: Position): Node<'Fragment'> {
    skip('<#>');
    const children = parseChildren({ type: 'UNRAW' });
    skip('<#>');
    return createNode('Fragment', start, input.position(), { children });
  }

  function parseTextChildren(start: Position): Node<'Text'> {
    if (input.position().offset === start.offset) {
      // the next char is text
      const firstChar = input.next();
      const content = firstChar + readWhile(isText);
      return createNode('Text', start, input.position(), {
        content,
      });
    }
    return createNode('Text', start, input.position(), {
      content: input.get(start, input.position()),
    });
  }

  function parseBlockComment(): Node<'BlockComment'> {
    const start = input.position();
    skip('/*');
    let content = '';
    while (peek('*/') === false) {
      if (peek('*')) {
        content += input.next();
      }
      content += readWhile(char => char !== '*');
    }
    skip('*/');
    const elem = createNode('BlockComment', start, input.position(), {
      content,
    });
    return elem;
  }

  function parseLineComment(): Node<'LineComment'> {
    const start = input.position();
    skip('//');
    const content = readWhile(char => char !== '\n');
    const elem = createNode('LineComment', start, input.position(), {
      content,
    });
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
      return createNode('SelfClosingElement', start, input.position(), {
        component: tag as any,
        props,
      });
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
    return createNode('Element', start, input.position(), {
      component: tag,
      props,
      children,
      namedCloseTag: namedClose,
    });
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
    return createNode('RawElement', start, input.position(), {
      component: tag,
      props,
      children,
      namedCloseTag: namedClose,
    });
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
    const propsState = input.position();
    const whitespace = parseWhitespaces();
    if (peek('>') || (canSelfClose && peek('|>'))) {
      return createNode('Props', propsState, input.position(), {
        items: propItems,
        whitespace: whitespace || '',
      });
    }
    if (!whitespace) {
      return input.croak(`Expected at least one whitespace`);
    }
    while (!peek('>') && (canSelfClose === true ? !peek('|>') : true)) {
      const nextPropItem = parsePropOrComment();
      propItems.push(nextPropItem);
      if (peek('>') || (canSelfClose && peek('|>'))) {
        break;
      }
      if (!nextPropItem.whitespace) {
        break;
      }
    }
    return createNode('Props', propsState, input.position(), { items: propItems, whitespace });
  }

  function parsePropOrComment(): PropItem {
    if (peek('//')) {
      const { content, position } = parseLineComment();
      const whitespace = parseWhitespaces() || '';
      return createNode('PropLineComment', position!.start, position!.end, { content, whitespace });
    }
    if (peek('/*')) {
      const { content, position } = parseBlockComment();
      const whitespace = parseWhitespaces();
      return createNode('PropBlockComment', position!.start, position!.end, {
        content,
        whitespace,
      });
    }
    const propStart = input.position();
    const name = parseIdentifier();
    if (!peek('=')) {
      const whitespace = parseWhitespaces();
      return createNode('NoValueProp', propStart, input.position(), { name, whitespace });
    }
    skip('=');
    const value = parseExpression();
    const whitespace = parseWhitespaces();
    return createNode('Prop', propStart, input.position(), { name, value, whitespace });
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
      return createNode('Parenthesis', start, input.position(), { value });
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
    if (identifier.name === 'true') {
      return createNode('Bool', start, input.position(), { value: true });
    }
    if (identifier.name === 'false') {
      return createNode('Bool', start, input.position(), { value: false });
    }
    if (identifier.name === 'null') {
      return createNode('Null', start, input.position(), {});
    }
    if (identifier.name === 'undefined') {
      return createNode('Undefined', start, input.position(), {});
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
      const next = createNode('DotMember', identifier.position!.start, input.position(), {
        target: identifier,
        property,
      });
      return maybeParseMember(next);
    }
    if (peek('[')) {
      skip('[');
      const property = parseExpression();
      skip(']');
      const next = createNode('BracketMember', identifier.position!.start, input.position(), {
        target: identifier,
        property,
      });
      return maybeParseMember(next);
    }
    if (peek('(')) {
      const args = parseFunctionCall();
      const next = createNode('FunctionCall', identifier.position!.start, input.position(), {
        target: identifier,
        arguments: args,
      });
      return maybeParseMember(next);
    }
    return identifier;
  }

  function parseFunctionCall(): Array<Expression> {
    skip('(');
    const items: Array<Expression> = [];
    while (!input.eof() && input.peek() !== ')') {
      parseWhitespaces();
      maybeSkip(',');
      parseWhitespaces();
      if (!input.eof() && input.peek() === ')') {
        break;
      }
      const value = parseExpression();
      parseWhitespaces();
      items.push(value);
    }
    parseWhitespaces();
    skip(')');
    return items;
  }

  function parseObject(): Node<'Object'> {
    const start = input.position();
    skip('{');
    const items: Array<ObjectItem> = [];
    while (!input.eof() && input.peek() !== '}') {
      parseWhitespaces();
      maybeSkip(',');
      parseWhitespaces();
      if (!input.eof() && input.peek() === '}') {
        break;
      }
      parseWhitespaces();
      items.push(parseObjectItem());
    }
    parseWhitespaces();
    skip('}');
    return createNode('Object', start, input.position(), { items });
  }

  function parseObjectItem(): ObjectItem {
    const start = input.position();
    if (peek(SINGLE_QUOTE) || peek(DOUBLE_QUOTE) || peek(BACKTICK)) {
      const name = parseString();
      skip(':');
      parseWhitespaces();
      const value = parseExpression();
      return createNode('Property', start, input.position(), { name, value });
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
      parseWhitespaces();
      const value = parseExpression();
      return createNode('ComputedProperty', computedStart, input.position(), {
        expression: computedValue,
        value,
      });
    }
    // simple property
    const name = parseIdentifier();
    if (!peek(':')) {
      return createNode('PropertyShorthand', start, input.position(), { name });
    }
    skip(':');
    parseWhitespaces();
    const value = parseExpression();
    return createNode('Property', start, input.position(), { name, value });
  }

  function parseSpread(): Node<'Spread'> {
    const start = input.position();
    skip('...');
    const target = parseExpression();
    return createNode('Spread', start, input.position(), { target });
  }

  function parseArray(): Node<'Array'> {
    const start = input.position();
    skip('[');
    const items: Array<ArrayItem> = [];
    while (!input.eof() && input.peek() !== ']') {
      parseWhitespaces();
      maybeSkip(',');
      parseWhitespaces();
      if (!input.eof() && input.peek() === ']') {
        break;
      }
      if (peek('...')) {
        items.push(parseSpread());
      } else {
        const value = parseExpression();
        parseWhitespaces();
        items.push(value);
      }
    }
    parseWhitespaces();
    skip(']');
    return createNode('Array', start, input.position(), { items });
  }

  function parseNumber(): Node<'Num'> {
    const start = input.position();
    const negative = peek('-');
    if (negative) {
      skip('-');
    }
    let hasDot = false;
    const number = readWhile(ch => {
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
    return createNode('Num', start, input.position(), {
      value,
      rawValue: input.get(start, input.position()),
    });
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
    return createNode('Str', start, input.position(), { value: str, quote: quoteType });
  }

  function isDigit(ch: string): boolean {
    return DIGIT_REGEX.test(ch);
  }

  function maybeParseCloseTag(): ComponentType | false {
    try {
      skip('<');
      const identifier = parseIdentifier();
      const component = maybeParseElementTypeMember(identifier);
      skip('|>');
      return component;
    } catch (err) {
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
      const nextParent = createNode('ElementTypeMember', parent.position!.start, input.position(), {
        target: parent,
        property: nextId,
      });
      return maybeParseElementTypeMember(nextParent);
    }
    return parent;
  }

  function parseIdentifier(): Node<'Identifier'> {
    if (isIdentifierStart(input.peek())) {
      const startPos = input.position();
      const name = readWhile(isIdentifier);
      return createNode('Identifier', startPos, input.position(), { name });
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

  function parseWhitespaces(): string | false {
    if (input.eof()) {
      return false;
    }
    if (!isWhitespace(input.peek())) {
      return false;
    }
    let content = '';
    while (!input.eof() && isWhitespace(input.peek())) {
      content += input.next();
    }
    if (content.length === 0) {
      return false;
    }
    return content;
  }

  function isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n';
  }

  function isText(char: string) {
    return char !== '#' && char !== '<' && char !== '|' && char !== '/';
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
    data: Nodes[K]
  ): Node<K> {
    return {
      type,
      ...data,
      position: {
        start,
        end,
      },
    } as any;
  }
}
