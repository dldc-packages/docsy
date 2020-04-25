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

it(`Parse double whitespaces`, () => {
  const file = `<|Demo|>\n\n`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(2);
  expect(result.nodes.children[0].type).toEqual('SelfClosingElement');
  expect(result.nodes.children[1].type).toEqual('Whitespace');
});

it(`Parse single whitespaces`, () => {
  const file = `<|Demo|>\n`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(2);
  expect(result.nodes.children[0].type).toEqual('SelfClosingElement');
  expect(result.nodes.children[1].type).toEqual('Whitespace');
});

it(`Parse single whitespaces between two tag`, () => {
  const file = `<|Demo|> <|Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(3);
  expect(result.nodes.children[0].type).toEqual('SelfClosingElement');
  expect(result.nodes.children[1].type).toEqual('Whitespace');
  expect(result.nodes.children[2].type).toEqual('SelfClosingElement');
});

it('Parse multiple text paragrpahs', () => {
  const file = `First text  <== Two spaces\n\n<== Two new lines`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(5);
  expect(result.nodes.children.map((v: any) => v.type)).toEqual([
    'Text',
    'Whitespace',
    'Text',
    'Whitespace',
    'Text',
  ]);
});

it(`Parse many elements`, () => {
  const file = readFile('elements');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.nodes.children.length).toBe(10);
  expect(result.nodes.children.map((v: any) => v.type)).toEqual([
    'SelfClosingElement',
    'Whitespace',
    'SelfClosingElement',
    'Whitespace',
    'SelfClosingElement',
    'Whitespace',
    'Text',
    'Whitespace',
    'SelfClosingElement',
    'Whitespace',
  ]);
  expect(result.nodes.children[6].meta.content).toEqual('Foo');
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

it(`Parse self closing`, () => {
  const file = `<|Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

it(`Parse simple element`, () => {
  const file = `<|Demo>Hello<Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

it(`Parse simple element with no content`, () => {
  const file = `<|Demo><Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

it(`Throw when you close the wrong tag`, () => {
  const file = `<|Demo>Something<Yolo|>`;
  expect(() => DocsyParser.parseDocument(file)).toThrow('Unexpected close tag, wrong tag !');
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
  expect(props.map((item: any) => item.type)).toEqual([
    'PropItem',
    'PropItem',
    'PropItem',
    'PropItem',
    'PropItem',
    'PropItem',
  ]);
  const propsInner = props.map((item: any) => item.nodes.item);
  expect(propsInner.map((item: any) => item.type)).toEqual([
    'PropNoValue',
    'PropValue',
    'PropValue',
    'PropValue',
    'PropValue',
    'PropValue',
  ]);
  expect(propsInner[0].nodes.name.meta.name).toBe('bold');
  expect(propsInner[1].nodes.name.meta.name).toBe('foo');
  expect(propsInner[1].nodes.value.type).toBe('Str');
  expect(propsInner[1].nodes.value.meta.value).toBe('bar');
  expect(propsInner[2].nodes.value.type).toBe('Num');
  expect(propsInner[2].nodes.value.meta.value).toBe(-3.14);
  expect(propsInner[3].nodes.value.type).toBe('Bool');
  expect(propsInner[3].nodes.value.meta.value).toBe(true);
  expect(propsInner[4].nodes.value.type).toBe('Null');
  expect(propsInner[5].nodes.value.type).toBe('Undefined');
});

it(`Parse props with object`, () => {
  const file = readFile('props-object');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  const firstChild = result.nodes.children[0];
  expect(firstChild.type).toBe('Element');
  const propsItems = firstChild.nodes.props.nodes.items;
  expect(propsItems.length).toBe(1);
  expect(propsItems[0].type).toBe('PropItem');
  expect(propsItems[0].nodes.item.nodes.value.type).toBe('Object');
  expect(propsItems[0].nodes.item.nodes.value.nodes.items.length).toBe(5);
  expect(
    propsItems[0].nodes.item.nodes.value.nodes.items.map((v: any) => v.nodes.item.type)
  ).toEqual(['Property', 'ComputedProperty', 'PropertyShorthand', 'Spread', 'Property']);
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
  expect(result.nodes.children.map((item: any) => item.type)).toEqual([
    'LineComment',
    'SelfClosingElement',
    'Whitespace',
    'LineComment',
  ]);
  expect(result.nodes.children[0].meta.content).toBe(' some comment');
  expect(result.nodes.children[2].meta.content).toBe(' ');
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
    'Whitespace',
    'LineComment',
    'Whitespace',
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
  const children = result.nodes.children[0].nodes.children;
  expect(children.map((v: any) => v.type)).toEqual(['Text', 'SelfClosingElement', 'Text']);
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

it(`Parse inject`, () => {
  const file = '{34}';
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.type).toBe('Document');
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toBe('Inject');
  expect(result.nodes.children[0].nodes.value.type).toBe('Num');
  expect(result.nodes.children[0].nodes.value.meta.value).toBe(34);
});

it(`Parse inject with spaces`, () => {
  const file = '{\n34   \n}';
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.type).toBe('Document');
  expect(result.nodes.children.length).toBe(1);
  expect(result.nodes.children[0].type).toBe('Inject');
  expect(result.nodes.children[0].nodes.value.type).toBe('Num');
  expect(result.nodes.children[0].nodes.value.meta.value).toBe(34);
});
