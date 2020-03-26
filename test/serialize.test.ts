import { parse, serialize } from '../src';
import { readFile } from './utils';

it(`Parse then serialize an element`, () => {
  const file = `<|Demo|>\n`;
  const result = parse(file);
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

it(`Parse then serialize elements`, () => {
  const file = readFile('elements');
  const result = parse(file);
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

it(`Parse then serialize open-close tags`, () => {
  const file = readFile('open-close');
  const result = parse(file);
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

it(`Parse then serialize big file`, () => {
  const file = readFile('all');
  const result = parse(file);
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

it(`Parse then serialize raw file`, () => {
  const file = readFile('raw');
  const result = parse(file);
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});

it(`Parse then serialize raw file`, () => {
  const file = readFile('complete');
  const result = parse(file);
  expect(() => serialize(result)).not.toThrow();
  expect(serialize(result)).toBe(file);
});
