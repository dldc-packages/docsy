import { expect, test } from 'vitest';
import { parseDocument, serialize } from '../src/mod';
import { readFile } from './utils';

test(`Parse then serialize an element`, () => {
  const file = `</Demo/>\n`;
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize elements`, () => {
  const file = readFile('elements');
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize open-close tags`, () => {
  const file = readFile('open-close');
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize props`, () => {
  const file = `<|Title config=[34, 'foo', Theme.bar]>Hello <|B>world</> !</>`;
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize big file`, () => {
  const file = readFile('all');
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize raw`, () => {
  const file = `<#>Foo </Bar/> </>`;
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize tag-in-raw file`, () => {
  const file = readFile('tag-in-raw');
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize tag-in-raw file`, () => {
  const file = readFile('complex-raw');
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize raw file`, () => {
  const file = readFile('raw');
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize complete file`, () => {
  const file = readFile('complete');
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize long file`, () => {
  const file = readFile('long');
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

test(`Parse then serialize content file`, () => {
  const file = readFile('content');
  const result = parseDocument(file, 'source.docsy').result;
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});
