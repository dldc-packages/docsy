import { DocsyParser } from '../src';
import {
  readFile,
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logNode,
} from './utils';

it(`Parse an element`, () => {
  const file = `<|Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toEqual('SelfClosingElement');
  expect(result.nodes.children[0].nodes.component).toEqual({
    type: 'Identifier',
    meta: { name: 'Demo' },
    nodes: {},
  });
});

it(`Parse many elements`, () => {
  const file = readFile('elements');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(8);
  expect(result.nodes.children.map((v: any) => v.type)).toEqual([
    'SelfClosingElement',
    'Text',
    'SelfClosingElement',
    'Text',
    'SelfClosingElement',
    'Text',
    'SelfClosingElement',
    'Text',
  ]);
  expect(result.nodes.children[5].meta.content).toEqual('\n\nFoo\n\n');
});

it(`Parse open/close tag`, () => {
  const file = readFile('open-close');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(2);
  expect(result.nodes.children[0].type).toBe('Element');
  const component = result.nodes.children[0].nodes.component;
  expect(component.type).toBe('Identifier');
  expect(component.meta.name).toBe('Demo');
  expect(result.nodes.children[0].nodes.children.length).toBe(1);
  expect(result.nodes.children[0].nodes.children[0].type).toBe('Text');
  expect(result.nodes.children[0].nodes.children[0].meta.content).toBe('Something');
});

it(`Parse named close tag`, () => {
  const file = readFile('open-close-named');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(2);
  expect(result.nodes.children[0].type).toBe('Element');
  const component = result.nodes.children[0].nodes.component;
  expect(component.type).toBe('Identifier');
  expect(component.meta.name).toBe('Demo');
  expect(result.nodes.children[0].nodes.children.length).toBe(1);
  expect(result.nodes.children[0].nodes.children[0].type).toBe('Text');
  expect(result.nodes.children[0].nodes.children[0].meta.content).toBe('Something');
});

it(`Throw when you close the wrong tag`, () => {
  const file = `<|Demo>Something<Yolo|>`;
  expect(() => DocsyParser.parseDocument(file)).toThrow();
});

it(`Parse props`, () => {
  const file = readFile('props');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(2);
  expect(result.nodes.children[0].type).toBe('Element');
  expect(result.nodes.children[0].nodes.component.meta.name).toBe('Title');
  expect(result.nodes.children[0].nodes.children.length).toBe(1);
  const props = result.nodes.children[0].nodes.props.nodes.items;
  expect(props.length).toBe(6);
  expect(props[0].type).toBe('NoValueProp');
  expect(props[0].nodes.name.meta.name).toBe('bold');
  expect(props[1].type).toBe('Prop');
  expect(props[1].nodes.name.meta.name).toBe('foo');
  expect(props[1].nodes.value.type).toBe('Str');
  expect(props[1].nodes.value.meta.value).toBe('bar');
  expect(props[2].nodes.value.type).toBe('Num');
  expect(props[2].nodes.value.meta.value).toBe(-3.14);
  expect(props[3].nodes.value.type).toBe('Bool');
  expect(props[3].nodes.value.meta.value).toBe(true);
  expect(props[4].nodes.value.type).toBe('Null');
  expect(props[5].nodes.value.type).toBe('Undefined');
});

it(`Parse props with object`, () => {
  const file = readFile('props-object');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  const firstChild = result.nodes.children[0];
  expect(firstChild.type).toBe('Element');
  const propsItems = firstChild.nodes.props.nodes.items;
  expect(propsItems.length).toBe(1);
  expect(propsItems[0].type).toBe('Prop');
  expect(propsItems[0].nodes.value.type).toBe('Object');
  expect(propsItems[0].nodes.value.nodes.items.length).toBe(5);
  expect(propsItems[0].nodes.value.nodes.items.map((v: any) => v.type)).toEqual([
    'Property',
    'ComputedProperty',
    'PropertyShorthand',
    'Spread',
    'Property',
  ]);
});

it(`Parse a line comment`, () => {
  const file = `// some comment`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children[0].type).toBe('LineComment');
});

it(`Parse ending <`, () => {
  const file = `<|Foo|><`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children[0].type).toBe('SelfClosingElement');
  expect(result.nodes.children[1].type).toBe('Text');
  expect(result.nodes.children[1].meta.content).toBe('<');
});

it(`Parse ending /`, () => {
  const file = `<|Foo|>/`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children[0].type).toBe('SelfClosingElement');
  expect(result.nodes.children[1].type).toBe('Text');
  expect(result.nodes.children[1].meta.content).toBe('/');
});

it(`Parse a line in context`, () => {
  const file = [`// some comment`, '<|Foo|> // demo'].join('\n');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children[0].type).toBe('LineComment');
  expect(result.nodes.children[0].meta.content).toBe(' some comment');
  expect(result.nodes.children[2].type).toBe('Text');
  expect(result.nodes.children[2].meta.content).toBe(' ');
  expect(result.nodes.children[3].type).toBe('LineComment');
  expect(result.nodes.children[3].meta.content).toBe(' demo');
});

it(`Does not parse element in comment`, () => {
  const file = `// <|Foo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children[0].type).toBe('LineComment');
  expect(result.nodes.children[0].meta.content).toBe(' <|Foo|>');
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
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(5);
  expect(result.nodes.children.map((v: any) => v.type)).toEqual([
    'Element',
    'Text',
    'LineComment',
    'Text',
    'BlockComment',
  ]);
});

it(`Parse all.docsy file`, () => {
  const file = readFile('all');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

it(`Fragment`, () => {
  const file = `<|>Demo<|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toEqual('Fragment');
  expect(result.nodes.children[0].nodes.children.length).toEqual(1);
  expect(result.nodes.children[0].nodes.children[0].type).toEqual('Text');
  expect(result.nodes.children[0].nodes.children[0].meta.content).toEqual('Demo');
});

it(`Fragment with content`, () => {
  const file = `<|>Foo <|Demo|> Bar <|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toEqual('Fragment');
  expect(result.nodes.children[0].nodes.children.length).toEqual(3);
  expect(result.nodes.children[0].nodes.children.map((v: any) => v.type)).toEqual([
    'Text',
    'SelfClosingElement',
    'Text',
  ]);
});

it(`Two Fragment side by side`, () => {
  const file = `<|>Foo<|><|>Bar<|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(2);
  expect(result.nodes.children[0].type).toEqual('Fragment');
  expect(result.nodes.children[1].type).toEqual('Fragment');
});

it(`Fragment > Element > Fragment`, () => {
  const file = `<|>A1<|Demo>B1<|>C1<|>B2|>A2<|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toEqual('Fragment');
  expect(result.nodes.children[0].nodes.children.length).toEqual(3);
  expect(result.nodes.children[0].nodes.children[1].type).toEqual('Element');
  expect(result.nodes.children[0].nodes.children[1].nodes.children.length).toEqual(3);
  expect(result.nodes.children[0].nodes.children[1].nodes.children[1].type).toEqual('Fragment');
});

it('RawFragment <#>', () => {
  const file = `<#>Foo<#>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toEqual('RawFragment');
  expect(result.nodes.children[0].nodes.children.length).toEqual(1);
  expect(result.nodes.children[0].nodes.children[0].type).toEqual('Text');
  expect(result.nodes.children[0].nodes.children[0].meta.content).toEqual('Foo');
});

it('Element in Raw Fragment is text', () => {
  const file = `<#> <|Demo|> <#>`;
  expect(() => DocsyParser.parseDocument(file).document).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toEqual('RawFragment');
  expect(result.nodes.children[0].nodes.children.length).toEqual(1);
  expect(result.nodes.children[0].nodes.children[0].type).toEqual('Text');
  expect(result.nodes.children[0].nodes.children[0].meta.content).toEqual(' <|Demo|> ');
});

it('RawElement', () => {
  const file = `<#Foo> Hello #>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toEqual('RawElement');
  expect(result.nodes.children[0].nodes.children.length).toEqual(1);
  expect(result.nodes.children[0].nodes.children[0].type).toEqual('Text');
  expect(result.nodes.children[0].nodes.children[0].meta.content).toEqual(' Hello ');
});

it('RawElement name close', () => {
  const file = `<#Foo> Hello <Foo#>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toEqual('RawElement');
  expect(result.nodes.children[0].nodes.children.length).toEqual(1);
  expect(result.nodes.children[0].nodes.children[0].type).toEqual('Text');
  expect(result.nodes.children[0].nodes.children[0].meta.content).toEqual(' Hello ');
});

it('Element in RawElement is text', () => {
  const file = `<#Foo> <|Hello|> <Foo#>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toEqual('RawElement');
  expect(result.nodes.children[0].nodes.children.length).toEqual(1);
  expect(result.nodes.children[0].nodes.children[0].type).toEqual('Text');
  expect(result.nodes.children[0].nodes.children[0].meta.content).toEqual(' <|Hello|> ');
});

it(`Parse raw.docsy file`, () => {
  const file = readFile('raw');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  // const result = DocsyParser.parseDocument(file).document as any;
});

it(`Parse complete.docsy file`, () => {
  const file = readFile('complete');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});
