import { parse } from '../src';
import {
  readFile,
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logNode,
} from './utils';

it(`Parse an element`, () => {
  const file = `<|Demo|>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].type).toEqual('SelfClosingElement');
  expect(result.children[0].component).toEqual({
    name: 'Demo',
    position: {
      end: { column: 6, line: 1, offset: 6 },
      start: { column: 2, line: 1, offset: 2 },
    },
    type: 'Identifier',
  });
});

it(`Parse many elements`, () => {
  const file = readFile('elements');
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(8);
  expect(result.children.map((v: any) => v.type)).toEqual([
    'SelfClosingElement',
    'Text',
    'SelfClosingElement',
    'Text',
    'SelfClosingElement',
    'Text',
    'SelfClosingElement',
    'Text',
  ]);
  expect(result.children[5].content).toEqual('\n\nFoo\n\n');
});

it(`Parse open/close tag`, () => {
  const file = readFile('open-close');
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].type).toBe('Element');
  const component = result.children[0].component;
  expect(component.type).toBe('Identifier');
  expect(component.name).toBe('Demo');
  expect(result.children[0].children.length).toBe(1);
  expect(result.children[0].children[0].type).toBe('Text');
  expect(result.children[0].children[0].content).toBe('Something');
});

it(`Parse named close tag`, () => {
  const file = readFile('open-close-named');
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].type).toBe('Element');
  const component = result.children[0].component;
  expect(component.type).toBe('Identifier');
  expect(component.name).toBe('Demo');
  expect(result.children[0].children.length).toBe(1);
  expect(result.children[0].children[0].type).toBe('Text');
  expect(result.children[0].children[0].content).toBe('Something');
});

it(`Throw when you close the wrong tag`, () => {
  const file = `<|Demo>Something<Yolo|>`;
  expect(() => parse(file)).toThrow();
});

it(`Parse props`, () => {
  const file = readFile('props');
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].type).toBe('Element');
  expect(result.children[0].component.name).toBe('Title');
  expect(result.children[0].children.length).toBe(1);
  const props = result.children[0].props.items;
  expect(props.length).toBe(6);
  expect(props[0].type).toBe('NoValueProp');
  expect(props[0].name.name).toBe('bold');
  expect(props[1].type).toBe('Prop');
  expect(props[1].name.name).toBe('foo');
  expect(props[1].value.type).toBe('Str');
  expect(props[1].value.value).toBe('bar');
  expect(props[2].value.type).toBe('Num');
  expect(props[2].value.value).toBe(-3.14);
  expect(props[3].value.type).toBe('Bool');
  expect(props[3].value.value).toBe(true);
  expect(props[4].value.type).toBe('Null');
  expect(props[5].value.type).toBe('Undefined');
});

it(`Parse props with object`, () => {
  const file = readFile('props-object');
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children[0].type).toBe('Element');
  expect(result.children[0].props.items.length).toBe(1);
  expect(result.children[0].props.items[0].type).toBe('Prop');
  expect(result.children[0].props.items[0].value.type).toBe('Object');
  expect(result.children[0].props.items[0].value.items.length).toBe(5);
  expect(result.children[0].props.items[0].value.items.map((v: any) => v.type)).toEqual([
    'Property',
    'ComputedProperty',
    'PropertyShorthand',
    'Spread',
    'Property',
  ]);
});

it(`Parse a line comment`, () => {
  const file = `// some comment`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children[0].type).toBe('LineComment');
});

it(`Parse ending <`, () => {
  const file = `<|Foo|><`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children[0].type).toBe('SelfClosingElement');
  expect(result.children[1].type).toBe('Text');
  expect(result.children[1].content).toBe('<');
});

it(`Parse ending /`, () => {
  const file = `<|Foo|>/`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children[0].type).toBe('SelfClosingElement');
  expect(result.children[1].type).toBe('Text');
  expect(result.children[1].content).toBe('/');
});

it(`Parse a line in context`, () => {
  const file = [`// some comment`, '<|Foo|> // demo'].join('\n');
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children[0].type).toBe('LineComment');
  expect(result.children[0].content).toBe(' some comment');
  expect(result.children[2].type).toBe('Text');
  expect(result.children[2].content).toBe(' ');
  expect(result.children[3].type).toBe('LineComment');
  expect(result.children[3].content).toBe(' demo');
});

it(`Does not parse element in comment`, () => {
  const file = `// <|Foo|>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children[0].type).toBe('LineComment');
  expect(result.children[0].content).toBe(' <|Foo|>');
});

it('Parse more comments', () => {
  const file = [
    `<|Title bold>Hello world !|>`,
    ``,
    `// some comment`,
    ``,
    `/*`,
    `More comments !`,
    `*/`,
  ].join('\n');
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(5);
  expect(result.children.map((v: any) => v.type)).toEqual([
    'Element',
    'Text',
    'LineComment',
    'Text',
    'BlockComment',
  ]);
});

it(`Parse all.docsy file`, () => {
  const file = readFile('all');
  expect(() => parse(file)).not.toThrow();
});

it(`Fragment`, () => {
  const file = `<|>Demo<|>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].type).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].type).toEqual('Text');
  expect(result.children[0].children[0].content).toEqual('Demo');
});

it(`Fragment with content`, () => {
  const file = `<|>Foo <|Demo|> Bar <|>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].type).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(3);
  expect(result.children[0].children.map((v: any) => v.type)).toEqual([
    'Text',
    'SelfClosingElement',
    'Text',
  ]);
});

it(`Two Fragment side by side`, () => {
  const file = `<|>Foo<|><|>Bar<|>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].type).toEqual('Fragment');
  expect(result.children[1].type).toEqual('Fragment');
});

it(`Fragment > Element > Fragment`, () => {
  const file = `<|>A1<|Demo>B1<|>C1<|>B2|>A2<|>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].type).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(3);
  expect(result.children[0].children[1].type).toEqual('Element');
  expect(result.children[0].children[1].children.length).toEqual(3);
  expect(result.children[0].children[1].children[1].type).toEqual('Fragment');
});

it('RawFragment <#>', () => {
  const file = `<#>Foo<#>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].type).toEqual('RawFragment');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].type).toEqual('Text');
  expect(result.children[0].children[0].content).toEqual('Foo');
});

it('Element in Raw Fragment is text', () => {
  const file = `<#> <|Demo|> <#>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].type).toEqual('RawFragment');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].type).toEqual('Text');
  expect(result.children[0].children[0].content).toEqual(' <|Demo|> ');
});

it('RawElement', () => {
  const file = `<#Foo> Hello #>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].type).toEqual('RawElement');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].type).toEqual('Text');
  expect(result.children[0].children[0].content).toEqual(' Hello ');
});

it('RawElement name close', () => {
  const file = `<#Foo> Hello <Foo#>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].type).toEqual('RawElement');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].type).toEqual('Text');
  expect(result.children[0].children[0].content).toEqual(' Hello ');
});

it('Element in RawElement is text', () => {
  const file = `<#Foo> <|Hello|> <Foo#>`;
  expect(() => parse(file)).not.toThrow();
  const result = parse(file) as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].type).toEqual('RawElement');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].type).toEqual('Text');
  expect(result.children[0].children[0].content).toEqual(' <|Hello|> ');
});

it(`Parse raw.docsy file`, () => {
  const file = readFile('raw');
  expect(() => parse(file)).not.toThrow();
  // const result = parse(file) as any;
});

it(`Parse complete.docsy file`, () => {
  const file = readFile('complete');
  expect(() => parse(file)).not.toThrow();
});
