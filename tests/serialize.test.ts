import { DocsyParser, DocsySerializer } from '../src/mod';
import { readFile } from './utils';

test(`Parse then serialize an element`, () => {
  const file = `<|Demo|>\n`;
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize elements`, () => {
  const file = readFile('elements');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize open-close tags`, () => {
  const file = readFile('open-close');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize props`, () => {
  const file = `<|Title config=[34, 'foo', Theme.bar]>Hello <|B>world|> !|>`;
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize big file`, () => {
  const file = readFile('all');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize raw`, () => {
  const file = `<#>Foo <|Bar|> <#>`;
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize tag-in-raw file`, () => {
  const file = readFile('tag-in-raw');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize tag-in-raw file`, () => {
  const file = [`<#Code><#>`, `// comment here`, `<#><Code#>`].join('\n');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize tag-in-raw file`, () => {
  const file = readFile('complex-raw');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize raw file`, () => {
  const file = readFile('raw');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize complete file`, () => {
  const file = readFile('complete');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize long file`, () => {
  const file = readFile('long');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize content file`, () => {
  const file = readFile('content');
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});

test(`Parse then serialize expression doc`, () => {
  const file = '  { foo: "Bar", component: <|Hello>Test|> } \n';
  const result = DocsyParser.parseDocument(file).document;
  expect(() => DocsySerializer.serialize(result)).not.toThrow();
  expect(DocsySerializer.serialize(result)).toBe(file);
});
