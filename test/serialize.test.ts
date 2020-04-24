import { DocsyParser, DocsySerializer } from '../src';
import { readFile } from './utils';

it(`Parse then serialize an element`, () => {
  const file = `<|Demo|>\n`;
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

it(`Parse then serialize elements`, () => {
  const file = readFile('elements');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

it(`Parse then serialize open-close tags`, () => {
  const file = readFile('open-close');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

it(`Parse then serialize props`, () => {
  const file = `<|Title config=[34, 'foo', Theme.bar]>Hello <|B>world|> !|>`;
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

it(`Parse then serialize big file`, () => {
  const file = readFile('all');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

it(`Parse then serialize raw file`, () => {
  const file = readFile('raw');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

it(`Parse then serialize raw file`, () => {
  const file = readFile('complete');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});
