import { Token, PONCTUATIONS, CreateToken } from './_Token.old';
import { StringStream } from './_StringStream.old';

export interface TokenStream {
  peek(): Token;
  peek(size: 1): Token;
  peek(size: 2): [Token, Token];
  peek(size: 3): [Token, Token, Token];
  peek(size: 4): [Token, Token, Token, Token];
  peek(size: 5): [Token, Token, Token, Token, Token];
  peek(size: number): Array<Token>;
  next(): Token;
  next(size: 1): Token;
  next(size: 2): [Token, Token];
  next(size: 3): [Token, Token, Token];
  next(size: 4): [Token, Token, Token, Token];
  next(size: 5): [Token, Token, Token, Token, Token];
  next(size: number): Array<Token>;
  croak(msg: string): never;
  // position(): Position;
  // saveState(): State;
  // restoreState(state: State): void;
}

export function TokenStream(file: string): TokenStream {
  const input = StringStream(file);
  let queue: Array<Token> = [];
  let eof: Token<'Eof'> | null = null;

  return {
    next,
    peek,
    croak: input.croak,
    // position: input.position,
    // saveState: input.saveState,
    // restoreState: input.restoreState,
  };

  function ensureQueueSize(size: number) {
    const missing = size - queue.length;
    if (missing > 0) {
      for (let i = 0; i < missing; i++) {
        queue.push(parseNext());
      }
    }
  }

  function peek(): Token;
  function peek(size: 1): Token;
  function peek(size: 2): [Token, Token];
  function peek(size: 3): [Token, Token, Token];
  function peek(size: 4): [Token, Token, Token, Token];
  function peek(size: 5): [Token, Token, Token, Token, Token];
  function peek(size: number): Array<Token>;
  function peek(size: number = 1): Token | Array<Token> {
    ensureQueueSize(size + 1);
    const result = queue.slice(0, size);
    if (size === 1) {
      return result[0];
    }
    return result;
  }

  function next(): Token;
  function next(size: 1): Token;
  function next(size: 2): [Token, Token];
  function next(size: 3): [Token, Token, Token];
  function next(size: 4): [Token, Token, Token, Token];
  function next(size: 5): [Token, Token, Token, Token, Token];
  function next(size: number): Array<Token>;
  function next(size: number = 1): Token | Array<Token> {
    ensureQueueSize(size);
    const result = queue.slice(0, size);
    queue.splice(0, size);
    if (size === 1) {
      return result[0];
    }
    return result;
  }

  function parseNext(): Token {
    if (input.eof()) {
      if (!eof) {
        eof = CreateToken.Eof({ start: input.position(), end: input.position() }, {});
      }
      return eof;
    }
    const char = input.peek();
    if (isPonctuation(char)) {
      const value = input.next() as any;
      return CreateToken.Ponctuation(input.rangeSinceLastRange(), { value });
    }
    if (isWhitespace(char)) {
      return parseWhitespace();
    }
    if (isNumeric(char)) {
      return parseNumeric();
    }
    return parseText();
  }

  function isPonctuation(char: string): boolean {
    return PONCTUATIONS.includes(char as any);
  }

  function parseNumeric(): Token<'Num'> {
    let content = '';
    while (!input.eof() && isNumeric(input.peek())) {
      content += input.next();
    }
    return CreateToken.Num(input.rangeSinceLastRange(), { value: content });
  }

  function parseWhitespace(): Token<'Whitespace'> {
    let content = '';
    while (!input.eof() && isWhitespace(input.peek())) {
      content += input.next();
    }
    const newLine = content.indexOf('\n') >= 0;
    return CreateToken.Whitespace(input.rangeSinceLastRange(), {
      value: content,
      hasNewLine: newLine,
    });
  }

  function parseText(): Token<'Text'> {
    let content = '';
    while (
      !input.eof() &&
      !isWhitespace(input.peek()) &&
      !isPonctuation(input.peek()) &&
      !isNumeric(input.peek())
    ) {
      content += input.next();
    }
    return CreateToken.Text(input.rangeSinceLastRange(), { value: content });
  }

  function isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  function isNumeric(char: string): boolean {
    return (
      char === '0' ||
      char === '1' ||
      char === '2' ||
      char === '3' ||
      char === '4' ||
      char === '5' ||
      char === '6' ||
      char === '7' ||
      char === '8' ||
      char === '9'
    );
  }
}
