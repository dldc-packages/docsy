import { Range } from './InputStream';
import { IDENTIFIER_START_REGEX, IDENTIFIER_REGEX } from './constants';
export type QuoteType = 'Single' | 'Double' | 'Backtick';

interface TokenBase {}

type CreateTokens<Tokens extends { [key: string]: TokenBase }> = Tokens;

export const PONCTUATIONS = [
  '=',
  `"`,
  `'`,
  '`',
  '-',
  '>',
  '<',
  '{',
  '}',
  '(',
  ')',
  '[',
  ']',
  '.',
  '#',
  '*',
  '+',
  '/',
  '|',
  '!',
] as const;

type Ponctuations = typeof PONCTUATIONS extends ReadonlyArray<infer T> ? T : never;

export type Tokens = CreateTokens<{
  Text: { value: string };
  Whitespace: { value: string };
  Num: { value: string };
  Ponctuation: {
    ponctuation: Ponctuations;
  };
  // Collapsed
  PipeBackward: {};
  ElementOpen: {
    component: Token<'Text'>;
  };
  ElementWithProps: {
    component: Token<'Text'>;
    props: Array<Token<'Whitespace'>>;
  };
}>;

export type TokenType = keyof Tokens;

export type Token<K extends TokenType = TokenType> = {
  [J in keyof Tokens[K]]: Tokens[K][J];
} & { type: K; range: Range };

const TOKENS_OBJ: { [K in TokenType]: null } = {
  Num: null,
  Ponctuation: null,
  Text: null,
  Whitespace: null,
  PipeBackward: null,
  ElementOpen: null,
  ElementWithProps: null,
};

const TOKENS = Object.keys(TOKENS_OBJ) as Array<TokenType>;

const TokenIsType: {
  [K in TokenType]: (token: Token) => token is Token<K>;
} = TOKENS.reduce<any>((acc, key) => {
  acc[key] = (token: Token) => token.type === key;
  return acc;
}, {});

export const TokenIs = {
  oneOf: tokenIsOneIf,
  validType: isValidTokenType,
  ...TokenIsType,
  Ponctuation: tokenIsPonctuation,
  Identifier: tokenIsIdentifier,
};

export const CreateToken: {
  [K in TokenType]: (range: Range, data: Tokens[K]) => Token<K>;
} = TOKENS.reduce<any>((acc, type) => {
  acc[type] = (range: Range, data: Tokens[TokenType]) => ({
    type,
    range,
    ...(data as any),
  });
  return acc;
}, {});

function tokenIsOneIf<T extends TokenType>(
  token: Token,
  types: ReadonlyArray<T>
): token is Token<T> {
  return types.includes(token.type as any);
}

function isValidTokenType(type: any): boolean {
  return type && typeof type === 'string' && TOKENS.includes(type as any);
}

function tokenIsPonctuation<T extends Ponctuations>(
  token: Token,
  ponct: T | null = null
): token is Token<'Ponctuation'> {
  return TokenIsType.Ponctuation(token) && (ponct === null ? true : token.ponctuation === ponct);
}

function tokenIsIdentifier(token: Token): token is Token<'Text'> {
  return TokenIsType.Text(token) && isIdentifier(token.value);
}

function isIdentifier(text: string): boolean {
  if (text.length === 0) {
    return false;
  }
  const [first, ...other] = text.split('');
  return isIdentifierStartChar(first) && other.every(isIdentifierChar);
}

function isIdentifierStartChar(ch: string): boolean {
  return IDENTIFIER_START_REGEX.test(ch);
}

function isIdentifierChar(ch: string): boolean {
  return IDENTIFIER_REGEX.test(ch);
}
