import {
  Document,
  Children,
  Nodes,
  NodeType,
  Node,
  ComponentType,
  Prop,
  Expression,
  ObjectItem,
  DottableExpression,
  QuoteType,
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

export function parse(file: string): Document {
  const input = InputStream(file);

  return parseDocument();

  function parseDocument(): Document {
    const startPos = input.position();
    const children = parseChildren(false);
    const endPos = input.position();
    return createNode('Document', startPos, endPos, {
      children,
    });
  }

  function parseChildren(expectCloseTag: ComponentType | false): Array<Children> {
    let limit = 2000;
    const children: Array<Children> = [];
    while (!input.eof() && limit > 0) {
      limit--;
      const beforeItemState = input.saveState();
      const item = parseNextChildren();
      if (item.type === 'CLOSE') {
        if (expectCloseTag === false) {
          return input.croak(`Unexpected close tag`);
        }
        if (item.tag !== null) {
          if (!sameComponent(expectCloseTag, item.tag)) {
            input.croak(`Unexpected close tag name (expecting a closing tag but not that one)`);
          }
        }
        input.restoreState(beforeItemState);
        break;
      }
      children.push(item);
    }
    if (limit <= 0) {
      input.croak('Infinit loop !');
    }
    return normalizeChildren(children);
  }

  function sameComponent(left: ComponentType, right: ComponentType): boolean {
    if (left.type !== right.type) {
      return false;
    }
    if (left.type === 'Identifier' && right.type === 'Identifier' && left.name === right.name) {
      return true;
    }
    if (left.type === 'ElementTypeMember' && right.type === 'ElementTypeMember') {
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
      if (last.type === 'Text' && item.type === 'Text') {
        acc.pop();
        acc.push(
          createNode('Text', last.position!.start, item.position!.end, {
            content: last.content + item.content,
          })
        );
      }
      acc.push(item);
      return acc;
    }, []);
  }

  function parseNextChildren(): Children | { type: 'CLOSE'; tag: ComponentType | null } {
    const start = input.position();
    if (peek('|>')) {
      skip('|>');
      return { type: 'CLOSE', tag: null };
    }
    if (peek('<|')) {
      const elem = maybeParseElement();
      if (elem) {
        return elem;
      }
    }
    if (peek('<')) {
      skip('<');
      const elem = maybeParseCloseTag();
      if (elem) {
        return { type: 'CLOSE', tag: elem };
      }
    }
    if (peek('//')) {
      return parseLineComment();
    }
    if (peek('/*')) {
      return parseBlockComment();
    }
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
    const component = ((): ComponentType | false => {
      try {
        skip('<|');
        return parseElementType();
      } catch (error) {
        return false;
      }
    })();
    if (component === false) {
      return false;
    }
    const props: Array<Prop> = [];
    while (!peek('>') && !peek('|>')) {
      const skipped = skipWhitespaces();
      if (peek('>') || peek('|>')) {
        break;
      }
      if (!skipped) {
        input.croak(`Expected at least on whitespace`);
      }
      props.push(parseProp());
    }
    if (peek('|>')) {
      skip('|>');
      return createNode('SelfClosingElement', start, input.position(), {
        component: component as any,
        props,
      });
    }
    skip('>');
    const children = parseChildren(component);
    const namedClose = (() => {
      if (peek('|>')) {
        skip('|>');
        return false;
      }
      // name
      skip('<');
      const identifier = parseIdentifier();
      maybeParseElementTypeMember(identifier);
      skip('|>');
      return true;
    })();
    return createNode('Element', start, input.position(), {
      component: component as any,
      props,
      children,
      namedCloseTag: namedClose,
    });
  }

  function parseProp(): Prop {
    const propStart = input.position();
    const name = parseIdentifier();
    if (!peek('=')) {
      return createNode('NoValueProp', propStart, input.position(), { name });
    }
    skip('=');
    const value = parseExpression();
    return createNode('Prop', propStart, input.position(), { name, value });
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
      skipWhitespaces();
      maybeSkip(',');
      skipWhitespaces();
      if (!input.eof() && input.peek() === ')') {
        break;
      }
      const value = parseExpression();
      skipWhitespaces();
      items.push(value);
    }
    skipWhitespaces();
    skip(')');
    return items;
  }

  function parseObject(): Node<'Object'> {
    const start = input.position();
    skip('{');
    const items: Array<ObjectItem> = [];
    while (!input.eof() && input.peek() !== '}') {
      skipWhitespaces();
      maybeSkip(',');
      skipWhitespaces();
      if (!input.eof() && input.peek() === '}') {
        break;
      }
      skipWhitespaces();
      items.push(parseObjectItem());
    }
    skipWhitespaces();
    skip('}');
    return createNode('Object', start, input.position(), { items });
  }

  function parseObjectItem(): ObjectItem {
    const start = input.position();
    if (peek(SINGLE_QUOTE) || peek(DOUBLE_QUOTE) || peek(BACKTICK)) {
      const name = parseString();
      skip(':');
      skipWhitespaces();
      const value = parseExpression();
      return createNode('Property', start, input.position(), { name, value });
    }
    if (peek('...')) {
      skip('...');
      const target = parseExpression();
      return createNode('Spread', start, input.position(), { target });
    }
    if (peek('[')) {
      const computedStart = input.position();
      skip('[');
      const computedValue = parseExpression();
      skip(']');
      skip(':');
      skipWhitespaces();
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
    skipWhitespaces();
    const value = parseExpression();
    return createNode('Property', start, input.position(), { name, value });
  }

  function parseArray(): Node<'Array'> {
    const start = input.position();
    skip('[');
    const items: Array<Expression> = [];
    while (!input.eof() && input.peek() !== ']') {
      skipWhitespaces();
      maybeSkip(',');
      skipWhitespaces();
      if (!input.eof() && input.peek() === ']') {
        break;
      }
      const value = parseExpression();
      skipWhitespaces();
      items.push(value);
    }
    skipWhitespaces();
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

  function skipWhitespaces(): boolean {
    if (input.eof()) {
      return false;
    }
    if (!isWhitespace(input.peek())) {
      return false;
    }
    while (!input.eof() && isWhitespace(input.peek())) {
      input.next();
    }
    return true;
  }

  function isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n';
  }

  function isText(char: string) {
    return char !== '<' && char !== '|' && char !== '/';
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
