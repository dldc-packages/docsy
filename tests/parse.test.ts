import { DocsyParser, DocsyError } from '../src/mod';
import { readFile } from './utils';
// @ts-expect-error unused but fine
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { logNode } from './utils';

test(`Parse a document with text`, () => {
  const file = `Hello`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Text');
  expect(result.children[0].meta.content).toEqual('Hello');
});

test(`Parse a document with whitespaces`, () => {
  const file = `\n \n `;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Whitespace');
  expect(result.children[0].meta.content).toEqual('\n \n ');
});

test(`Parse a document with text and whitespaces`, () => {
  const file = `\n \n Hello`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Text');
  expect(result.children[0].meta.content).toEqual('\n \n Hello');
});

test(`Parse a document with multiple text and whitespaces`, () => {
  const file = `\n \n Hello Foo \n Bar`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Text');
  expect(result.children[0].meta.content).toEqual('\n \n Hello Foo \n Bar');
});

test(`Parse SelfClosingElement`, () => {
  const file = `<|Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[0].children.component).toEqual({
    kind: 'Identifier',
    meta: { name: 'Demo' },
    children: {},
  });
});

test(`Parse Element`, () => {
  const file = `<|Demo><Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Element');
  expect(result.children[0].children.component).toEqual({
    kind: 'Identifier',
    meta: { name: 'Demo' },
    children: {},
  });
});

test(`Parse Element unamed close`, () => {
  const file = `<|Demo>Test|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Element');
  expect(result.children[0].meta).toEqual({ namedCloseTag: false });
  expect(result.children[0].children.component).toEqual({
    kind: 'Identifier',
    meta: { name: 'Demo' },
    children: {},
  });
});

test(`Parse single whitespaces between two tag`, () => {
  const file = `<|Demo|> <|Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(3);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[1].kind).toEqual('Whitespace');
  expect(result.children[2].kind).toEqual('SelfClosingElement');
});

test(`Parse double whitespaces`, () => {
  const file = `<|Demo|>\n\n`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[1].kind).toEqual('Whitespace');
});

test(`Parse single whitespaces`, () => {
  const file = `<|Demo|>\n`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[1].kind).toEqual('Whitespace');
});

test(`Parse element name with ElementTypeMember`, () => {
  const file = `<|Demo.Foo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[0].children.component.kind).toBe('ElementTypeMember');
  expect(result.children[0].children.component.children.target.meta.name).toBe('Demo');
  expect(result.children[0].children.component.children.property.meta.name).toBe('Foo');
});

test(`Parse element name with ElementTypeMember`, () => {
  const file = `<|Demo.Foo.Bar|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[0].children.component.kind).toBe('ElementTypeMember');
  expect(result.children[0].children.component.children.property.meta.name).toBe('Bar');
  expect(result.children[0].children.component.children.target.kind).toBe('ElementTypeMember');
});

test(`Parse SelfClosingElement with props`, () => {
  const file = `<|Title bold foo=true demo=-3.14 |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  const props = result.children[0].children.props.children;
  expect(props.items.length).toBe(3);
});

test(`Parse SelfClosingElement with props`, () => {
  const file = `<|Title bold foo="bar" demo=-3.14 admin=true mode=null onClick=undefined |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse backtick props`, () => {
  const file = '<|Title bold=`test\ndemo` |>';
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse empty array props`, () => {
  const file = '<|Title bold=[] foo=[  ] bar=[\n  ] |>';
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse array props`, () => {
  const file = `<|Title bold=[42, true, 'Hello'] |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse array of array`, () => {
  const file = `<|Title bold=[[], [], [[], []]] |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse object`, () => {
  const file = `<|Title obj={ foo: true, bar: 34 } |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse empty object`, () => {
  const file = `<|Title obj={} |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse object with quoted key`, () => {
  const file = `<|Title obj={ 'other': 'blue', [property]: true } |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse many elements`, () => {
  const file = readFile('elements');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(8);
  expect(result.children.map((v: any) => v.kind)).toEqual([
    'SelfClosingElement',
    'Whitespace',
    'SelfClosingElement',
    'Whitespace',
    'SelfClosingElement',
    'Text',
    'SelfClosingElement',
    'Whitespace',
  ]);
  expect(result.children[5].meta.content).toEqual('\n\nFoo\n\n');
});

test(`Parse open/close tag`, () => {
  const file = readFile('open-close');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toBe('Element');
  const component = result.children[0].children.component;
  expect(component.kind).toBe('Identifier');
  expect(component.meta.name).toBe('Demo');
  expect(result.children[0].children.children.length).toBe(1);
  expect(result.children[0].children.children[0].kind).toBe('Text');
  expect(result.children[0].children.children[0].meta.content).toBe('Something');
});

test(`Parse named close tag`, () => {
  const file = readFile('open-close-named');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toBe('Element');
  const component = result.children[0].children.component;
  expect(component.kind).toBe('Identifier');
  expect(component.meta.name).toBe('Demo');
  expect(result.children[0].children.children.length).toBe(1);
  expect(result.children[0].children.children[0].kind).toBe('Text');
  expect(result.children[0].children.children[0].meta.content).toBe('Something');
});

test(`Parse self closing`, () => {
  const file = `<|Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

test(`Parse simple element`, () => {
  const file = `<|Demo>Hello<Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

test(`Parse simple element with no content`, () => {
  const file = `<|Demo><Demo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

test(`Throw when you close the wrong tag`, () => {
  const file = `<|Demo>Something<Yolo|>`;
  expect(() => DocsyParser.parseDocument(file)).toThrow(DocsyError.ParsingError);
});

test(`Throw when you invalid tag`, () => {
  const file = `<|Demo>Something<Demo`;
  expect(() => DocsyParser.parseDocument(file)).toThrow(DocsyError.ParsingError);
  expect(() => DocsyParser.parseDocument(file)).toThrow('"|>" did not match');
});

test(`Parse function call`, () => {
  const file = `<|Demo foo=getProps() |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

test(`Parse dot member`, () => {
  const file = `<|Demo foo=Utils.size |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

test(`Parse dot function call`, () => {
  const file = `<|Demo foo=Utils.getSize(5) |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

test(`Parse dot function call`, () => {
  const file = `<|Demo foo=Utils.getSize(5).foo |>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

test(`Parse props`, () => {
  const file = readFile('props');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toBe('Element');
  expect(result.children[0].children.component.meta.name).toBe('Title');
  expect(result.children[0].children.children.length).toBe(1);
  const props = result.children[0].children.props.children.items;
  expect(props.length).toBe(6);
  expect(props.map((item: any) => item.kind)).toEqual([
    'PropItem',
    'PropItem',
    'PropItem',
    'PropItem',
    'PropItem',
    'PropItem',
  ]);
  const propsInner = props.map((item: any) => item.children.item);
  expect(propsInner.map((item: any) => item.kind)).toEqual([
    'PropNoValue',
    'PropValue',
    'PropValue',
    'PropValue',
    'PropValue',
    'PropValue',
  ]);
  expect(propsInner[0].children.name.meta.name).toBe('bold');
  expect(propsInner[1].children.name.meta.name).toBe('foo');
  expect(propsInner[1].children.value.kind).toBe('Str');
  expect(propsInner[1].children.value.meta.value).toBe('bar');
  expect(propsInner[2].children.value.kind).toBe('Num');
  expect(propsInner[2].children.value.meta.value).toBe(-3.14);
  expect(propsInner[3].children.value.kind).toBe('Bool');
  expect(propsInner[3].children.value.meta.value).toBe(true);
  expect(propsInner[4].children.value.kind).toBe('Null');
  expect(propsInner[5].children.value.kind).toBe('Undefined');
});

test(`Parse props with object`, () => {
  const file = readFile('props-object');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  const firstChild = result.children[0];
  expect(firstChild.kind).toBe('Element');
  const propsItems = firstChild.children.props.children.items;
  expect(propsItems.length).toBe(1);
  expect(propsItems[0].kind).toBe('PropItem');
  expect(propsItems[0].children.item.children.value.kind).toBe('Object');
  expect(propsItems[0].children.item.children.value.children.items.length).toBe(5);
  expect(propsItems[0].children.item.children.value.children.items.map((v: any) => v.children.item.kind)).toEqual([
    'Property',
    'ComputedProperty',
    'PropertyShorthand',
    'Spread',
    'Property',
  ]);
});

test(`Parse a line comment`, () => {
  const file = `// some comment`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children[0].kind).toBe('LineComment');
});

test(`Parse an empty line comment`, () => {
  const file = `//\n`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children[0].kind).toBe('LineComment');
});

test(`Parse an empty line comment then EOF`, () => {
  const file = `//`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children[0].kind).toBe('LineComment');
});

test(`Parse single slash`, () => {
  const file = `/`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children[0].kind).toBe('Text');
});

test(`Ending < throw error`, () => {
  const file = `<|Foo|><`;
  expect(() => DocsyParser.parseDocument(file)).toThrow();
});

test(`Parse ending /`, () => {
  const file = `<|Foo|>/`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children[0].kind).toBe('SelfClosingElement');
  expect(result.children[1].kind).toBe('Text');
  expect(result.children[1].meta.content).toBe('/');
});

test(`Parse a line in context`, () => {
  const file = [`// some comment`, '<|Foo|> // demo'].join('\n');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.map((item: any) => item.kind)).toEqual([
    'LineComment',
    'SelfClosingElement',
    'Whitespace',
    'LineComment',
  ]);
  expect(result.children[0].meta.content).toBe(' some comment');
  expect(result.children[2].meta.content).toBe(' ');
  expect(result.children[3].meta.content).toBe(' demo');
});

test(`Does not parse element in comment`, () => {
  const file = `// <|Foo|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children[0].kind).toBe('LineComment');
  expect(result.children[0].meta.content).toBe(' <|Foo|>');
});

test('Parse more comments', () => {
  const file = [`<|Title bold>Hello world !|>`, ``, `// some comment`, ``, `/*`, `More comments !`, `*/`].join('\n');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(5);
  expect(result.children.map((v: any) => v.kind)).toEqual([
    'Element',
    'Whitespace',
    'LineComment',
    'Whitespace',
    'BlockComment',
  ]);
});

test(`Fragment`, () => {
  const file = `<|>Demo<|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].kind).toEqual('Text');
  expect(result.children[0].children[0].meta.content).toEqual('Demo');
});

test(`Fragment with content`, () => {
  const file = `<|>Foo <|Demo|> Bar <|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(3);
  const children = result.children[0].children;
  expect(children.map((v: any) => v.kind)).toEqual(['Text', 'SelfClosingElement', 'Text']);
});

test(`Two Fragment side by side`, () => {
  const file = `<|>Foo<|><|>Bar<|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toEqual('Fragment');
  expect(result.children[1].kind).toEqual('Fragment');
});

test(`Fragment > Element > Fragment`, () => {
  const file = `<|>A1<|Demo>B1<|>C1<|>B2|>A2<|>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(3);
  expect(result.children[0].children[1].kind).toEqual('Element');
  expect(result.children[0].children[1].children.children.length).toEqual(3);
  expect(result.children[0].children[1].children.children[1].kind).toEqual('Fragment');
});

test('RawFragment <#>', () => {
  const file = `<#>Foo<#>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawFragment');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].kind).toEqual('Text');
  expect(result.children[0].children[0].meta.content).toEqual('Foo');
});

test('Element in Raw Fragment is text', () => {
  const file = `<#> <|Demo|> <#>`;
  expect(() => DocsyParser.parseDocument(file).document).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawFragment');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].kind).toEqual('Text');
  expect(result.children[0].children[0].meta.content).toEqual(' <|Demo|> ');
});

test('RawElement', () => {
  const file = `<#Foo> Hello #>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawElement');
  expect(result.children[0].children.children.length).toEqual(1);
  expect(result.children[0].children.children[0].kind).toEqual('Text');
  expect(result.children[0].children.children[0].meta.content).toEqual(' Hello ');
});

test('RawElement name close', () => {
  const file = `<#Foo> Hello <Foo#>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawElement');
  expect(result.children[0].children.children.length).toEqual(1);
  expect(result.children[0].children.children[0].kind).toEqual('Text');
  expect(result.children[0].children.children[0].meta.content).toEqual(' Hello ');
});

test('Element in RawElement is text', () => {
  const file = `<#Foo> <|Hello|> <Foo#>`;
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawElement');
  expect(result.children[0].children.children.length).toEqual(1);
  expect(result.children[0].children.children[0].kind).toEqual('Text');
  expect(result.children[0].children.children[0].meta.content).toEqual(' <|Hello|> ');
});

test(`Parse raw.docsy file`, () => {
  const file = readFile('tag-in-raw');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children.map((c: any) => c.kind)).toEqual(['RawElement', 'Whitespace']);
  expect(result.children[0].children.children.length).toBe(1);
  expect(result.children[0].children.children[0].kind).toBe('Text');
});

test(`Whitespace in unraw`, () => {
  const file = [`<#Code><#>`, `// comment here`, `<#><#>`].join('\n');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  // const result = DocsyParser.parseDocument(file).document as any;
  // logNode(result)
});

test(`Parse raw.docsy file`, () => {
  const file = readFile('complex-raw');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.children[0].children.children.map((c: any) => c.kind)).toEqual([
    'Text',
    'SelfClosingElement',
    'Text',
    'Whitespace',
    'LineComment',
    'SelfClosingElement',
    'Whitespace',
    'BlockComment',
    'SelfClosingElement',
    'Whitespace',
    'Text',
  ]);
});

test(`Parse raw.docsy file`, () => {
  const file = readFile('raw');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  // const result = DocsyParser.parseDocument(file).document as any;
  // logNode(result.children.map((c: any) => c.kind));
});

test(`Parse complete.docsy file`, () => {
  const file = readFile('complete');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

test(`Parse inject`, () => {
  const file = '{34}';
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.kind).toBe('Document');
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toBe('Inject');
  expect(result.children[0].children.value.kind).toBe('Num');
  expect(result.children[0].children.value.meta.value).toBe(34);
});

test(`Parse inject file`, () => {
  const file = readFile('inject');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.kind).toBe('Document');
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toBe('Inject');
  expect(result.children[0].children.value.kind).toBe('Object');
});

test(`Parse inject with spaces`, () => {
  const file = '{\n34   \n}';
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
  const result = DocsyParser.parseDocument(file).document as any;
  expect(result.kind).toBe('Document');
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toBe('Inject');
  expect(result.children[0].children.value.kind).toBe('Num');
  expect(result.children[0].children.value.meta.value).toBe(34);
});

test(`Parse all.docsy file`, () => {
  const file = readFile('all');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

test(`Parse ExpressionDocument`, () => {
  const file = '42';
  expect(() => DocsyParser.parseExpression(file)).not.toThrow();
  const result = DocsyParser.parseExpression(file).expression as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.children.value.kind).toBe('Num');
  expect(result.children.value.meta.value).toBe(42);
});

test(`Parse ExpressionDocument with whitespace`, () => {
  const file = '   42   ';
  expect(() => DocsyParser.parseExpression(file)).not.toThrow();
  const result = DocsyParser.parseExpression(file).expression as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.children.value.kind).toBe('Num');
  expect(result.children.value.meta.value).toBe(42);
  expect(result.children.before.length).toBe(1);
  expect(result.children.after.length).toBe(1);
});

test(`Parse ExpressionDocument with comment`, () => {
  const file = '// some comment\n42';
  expect(() => DocsyParser.parseExpression(file)).not.toThrow();
  const result = DocsyParser.parseExpression(file).expression as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.children.value.kind).toBe('Num');
  expect(result.children.value.meta.value).toBe(42);
  expect(result.children.before.length).toBe(1);
  expect(result.children.after.length).toBe(0);
});

test(`Parse ExpressionDocument with many before and after`, () => {
  const file = '// some comment\n/* Block comment */42  \n  ';
  expect(() => DocsyParser.parseExpression(file)).not.toThrow();
  const result = DocsyParser.parseExpression(file).expression as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.children.value.kind).toBe('Num');
  expect(result.children.value.meta.value).toBe(42);
  expect(result.children.before.length).toBe(2);
  expect(result.children.after.length).toBe(1);
});

test(`Parse long.docsy file`, () => {
  const file = readFile('long');
  expect(() => DocsyParser.parseDocument(file)).not.toThrow();
});

// test(`Parse long.docsy file time`, async () => {
//   const file = readFile('long');
//   const start = Date.now();
//   DocsyParser.parseDocument(file);
//   const time = Date.now() - start;
//   expect(time).toBeLessThan(200);
// });
