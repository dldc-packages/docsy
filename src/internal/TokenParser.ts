import { Token, PONCTUATIONS, CreateToken } from './Token';
import { InputStream } from './InputStream';

export function TokenParser(file: string): Array<Token> {
  const input = InputStream(file);

  const tokens: Array<Token> = [];

  while (!input.eof()) {
    tokens.push(parseNext());
  }

  return tokens;

  function parseNext(): Token {
    const char = input.peek();
    if (isPonctuation(char)) {
      return CreateToken.Ponctuation(input.rangeSinceLastRange(), {
        ponctuation: input.next() as any,
      });
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
    return CreateToken.Whitespace(input.rangeSinceLastRange(), { value: content });
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
