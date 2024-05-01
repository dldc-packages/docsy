/* eslint-disable @typescript-eslint/no-unsafe-call */

import { expect, test } from 'vitest';
import { DocsyErreur, parseDocument, parseExpression } from '../src/mod';
import { readFile } from './utils';
import { getError } from './utils/errors';

test(`Parse Empty Document`, () => {
  const file = '';
  expect(() => parseDocument(file, 'empty-file.docsy')).not.toThrow();
  const result = parseDocument(file, 'empty-file.docsy').result as any;
  expect(result.kind).toBe('Document');
});

test(`Parse Empty ExpressionDocument`, () => {
  const file = '';
  expect(() => parseExpression(file, 'empty.docsy')).not.toThrow();
  const result = parseExpression(file, 'empty.docsy').result as any;
  expect(result.kind).toBe('ExpressionDocument');
});

test(`Parse ExpressionDocument`, () => {
  const file = '42';
  expect(() => parseExpression(file, 'expression.docsy')).not.toThrow();
  const result = parseExpression(file, 'expression.docsy').result as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.value.kind).toBe('Num');
  expect(result.value.value).toBe(42);
});

test(`Parse ExpressionDocument with whitespace`, () => {
  const file = '   42   ';
  expect(() => parseExpression(file, 'expression.docsy')).not.toThrow();
  const result = parseExpression(file, 'expression.docsy').result as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.value.kind).toBe('Num');
  expect(result.value.value).toBe(42);
  expect(result.before.kind).toBe('Whitespace');
  expect(result.after.kind).toBe('Whitespace');
});

test(`Parse ExpressionDocument with comment`, () => {
  const file = '// some comment\n42';
  expect(() => parseExpression(file, 'expression-comments.docsy')).not.toThrow();
  const result = parseExpression(file, 'expression-comments.docsy').result as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.value.kind).toBe('Num');
  expect(result.value.value).toBe(42);
  expect(result.before).toHaveLength(2);
  expect(result.after).toBeUndefined();
});

test(`Parse comment at end of file`, () => {
  const file = '// some comment';
  expect(() => parseExpression(file, 'expression.docsy')).not.toThrow();
  const result = parseExpression(file, 'expression.docsy').result as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.value).toBeUndefined();
  expect(result.before.kind).toBe('LineComment');
  expect(result.after).toBeUndefined();
});

test(`Parse ExpressionDocument object`, () => {
  const file = '{ foo: true, bar: 34 }';
  expect(() => parseExpression(file, 'expression.docsy')).not.toThrow();
  const result = parseExpression(file, 'expression.docsy').result as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.value.kind).toBe('Obj');
});

test(`Parse ExpressionDocument with many before and after`, () => {
  const file = '// some comment\n/* Block comment */42  \n  ';
  expect(() => parseExpression(file, 'expression.docsy')).not.toThrow();
  const result = parseExpression(file, 'expression.docsy').result as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.value.kind).toBe('Num');
  expect(result.value.value).toBe(42);
  expect(result.before.length).toBe(3);
  expect(result.after.kind).toBe('Whitespace');
});

test(`Parse function call`, () => {
  const file = 'add(6, 9)';
  expect(() => parseExpression(file, 'expression.docsy')).not.toThrow();
  const result = parseExpression(file, 'expression.docsy').result as any;
  expect(result.kind).toBe('ExpressionDocument');
  expect(result.value.kind).toBe('CallExpression');
  expect(result.value.arguments).toMatchObject({
    kind: 'ListItems',
    items: [
      { kind: 'ListItem', item: { kind: 'Num' } },
      { kind: 'ListItem', item: { kind: 'Num' } },
    ],
  });
});

test(`Parse a document with text`, () => {
  const file = `Hello`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Text');
  expect(result.children[0].content).toEqual('Hello');
});

test(`Parse a document with whitespaces`, () => {
  const file = `\n \n `;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Whitespace');
  expect(result.children[0].content).toEqual('\n \n ');
});

test(`Parse a document with text and whitespaces`, () => {
  const file = `\n \n Hello`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Text');
  expect(result.children[0].content).toEqual('\n \n Hello');
});

test(`Parse a document with multiple text and whitespaces`, () => {
  const file = `\n \n Hello Foo \n Bar`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Text');
  expect(result.children[0].content).toEqual('\n \n Hello Foo \n Bar');
});

test(`Parse SelfClosingElement`, () => {
  const file = `</Demo/>`;
  expect(() => parseDocument(file, 'self-closing.docsy')).not.toThrow();
  const result = parseDocument(file, 'self-closing.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse SelfClosingElement then whitespace`, () => {
  const file = `</Demo/> `;
  expect(() => parseDocument(file, 'self-closing-whitespace.docsy')).not.toThrow();
  const result = parseDocument(file, 'self-closing-whitespace.docsy').result as any;
  // expect(result.children).toBe(null);
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[1].kind).toEqual('Whitespace');
});

test(`Parse Element`, () => {
  const file = `<|Demo><Demo/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Element');
  expect(result.children[0].name).toMatchObject({ kind: 'Identifier', name: 'Demo' });
});

test(`Parse Element unamed close`, () => {
  const file = `<|Demo>Test</>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Element');
  expect(result.children[0]).toMatchObject({ namedCloseTag: false, name: { kind: 'Identifier', name: 'Demo' } });
});

test(`Parse single whitespaces between two tag`, () => {
  const file = `</Demo/> </Demo/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(3);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[1].kind).toEqual('Whitespace');
  expect(result.children[2].kind).toEqual('SelfClosingElement');
});

test(`Parse double whitespaces`, () => {
  const file = `</Demo/>\n\n`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[1].kind).toEqual('Whitespace');
});

test(`Parse Line element`, () => {
  const file = `<Demo> Hello\n`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toEqual('LineElement');
  expect(result.children[1].kind).toEqual('Whitespace');
});

test(`Parse Line element eof`, () => {
  const file = `<Demo> Hello`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('LineElement');
});

test(`Parse Line element with elem inside`, () => {
  const file = `<Demo> Hello </Demo \n /> End`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('LineElement');
  expect(result.children[0].children.length).toBe(3);
});

test(`Parse single whitespaces`, () => {
  const file = `</Demo/>\n`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[1].kind).toEqual('Whitespace');
});

test(`Parse element name with ElementNameMember`, () => {
  const file = `</Demo.Foo/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[0].name.kind).toBe('ElementNameMember');
  expect(result.children[0].name.target.name).toBe('Demo');
  expect(result.children[0].name.property.name).toBe('Foo');
});

test(`Parse element name with ElementNameMember`, () => {
  const file = `</Demo.Foo.Bar/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  expect(result.children[0].name.kind).toBe('ElementNameMember');
  expect(result.children[0].name.property.name).toBe('Bar');
  expect(result.children[0].name.target.kind).toBe('ElementNameMember');
});

test(`Parse SelfClosingElement with attributes`, () => {
  const file = `</Title bold foo=true demo=-3.14 />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
  const attributes = result.children[0].attributes;
  expect(attributes.length).toBe(3);
});

test(`Parse SelfClosingElement with attributes`, () => {
  const file = `</Title bold foo="bar" demo=-3.14 admin=true mode=null onClick=undefined />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse backtick attributes`, () => {
  const file = '</Title bold=`test\ndemo` />';
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse empty array attribute`, () => {
  const file = '</Title bold=[] foo=[  ] bar=[\n  ] />';
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse array attribute`, () => {
  const file = `</Title bold=[42, true, 'Hello'] />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse array of array`, () => {
  const file = `</Title bold=[[], [], [[], []]] />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse object attribute`, () => {
  const file = `</Title obj={ foo: true, bar: 34 } />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse empty object`, () => {
  const file = `</Title obj={} />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse object with quoted key`, () => {
  const file = `</Title obj={ 'other': 'blue', [property]: true } />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('SelfClosingElement');
});

test(`Parse many elements`, () => {
  const file = readFile('elements');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
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
  expect(result.children[5].content).toEqual('\n\nFoo\n\n');
});

test(`Parse open/close tag`, () => {
  const file = readFile('open-close');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toBe('Element');
  const component = result.children[0].name;
  expect(component.kind).toBe('Identifier');
  expect(component.name).toBe('Demo');
  expect(result.children[0].children.length).toBe(1);
  expect(result.children[0].children[0].kind).toBe('Text');
  expect(result.children[0].children[0].content).toBe('Something');
});

test(`Parse named close tag`, () => {
  const file = readFile('open-close-named');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toBe('Element');
  const component = result.children[0].name;
  expect(component.kind).toBe('Identifier');
  expect(component.name).toBe('Demo');
  expect(result.children[0].children.length).toBe(1);
  expect(result.children[0].children[0].kind).toBe('Text');
  expect(result.children[0].children[0].content).toBe('Something');
});

test(`Parse self closing`, () => {
  const file = `</Demo/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Parse simple element`, () => {
  const file = `<|Demo>Hello<Demo/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Parse simple element with no content`, () => {
  const file = `<|Demo><Demo/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Throw when you close the wrong tag`, () => {
  const file = `<|Demo>Something<Yolo/>`;
  expect(() => parseDocument(file, 'source.docsy')).toThrow(Error);
  const error = getError(() => parseDocument(file, 'source.docsy'));
  expect(DocsyErreur.get(error)).toEqual({
    docsyStack: [
      { message: 'Invalid close tag: wrong component', name: 'Element', position: 21 },
      { message: 'Parser at index 1 did not match', name: 'Document.1', position: 0 },
    ],
    file: 'source.docsy',
    kind: 'ParsingError',
    source: '<|Demo>Something<Yolo/>',
  });
});

test(`Throw when you invalid tag`, () => {
  const file = `<|Demo>Something<Demo`;
  expect(() => parseDocument(file, 'source.docsy')).toThrow(Error);
  expect(() => parseDocument(file, 'source.docsy')).toThrow('21 EOF reached');
  const error = getError(() => parseDocument(file, 'source.docsy'));
  expect(DocsyErreur.get(error)).toEqual({
    docsyStack: [
      { message: 'EOF reached', name: "LineElement.4.Exact('>')", position: 21 },
      { message: 'Parser at index 4 did not match', name: 'LineElement.4', position: 21 },
      { message: 'Parser at index 6 did not match', name: 'Element.6', position: 16 },
      { message: 'Parser at index 1 did not match', name: 'Document.1', position: 0 },
    ],
    file: 'source.docsy',
    kind: 'ParsingError',
    source: '<|Demo>Something<Demo',
  });
});

test(`Parse function call`, () => {
  const file = `</Demo foo=getProps() />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Parse dot member`, () => {
  const file = `</Demo foo=Utils.size />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Parse dot function call`, () => {
  const file = `</Demo foo=Utils.getSize(5) />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Parse dot function call`, () => {
  const file = `</Demo foo=Utils.getSize(5).foo />`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Parse props`, () => {
  const file = readFile('props');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toBe('Element');
  expect(result.children[0].name.name).toBe('Title');
  expect(result.children[0].children.length).toBe(1);
  const attributes = result.children[0].attributes;
  expect(attributes.length).toBe(6);
  expect(attributes.map((item: any) => item.kind)).toEqual([
    'Attribute',
    'Attribute',
    'Attribute',
    'Attribute',
    'Attribute',
    'Attribute',
  ]);
  expect(attributes[0].name.name).toBe('bold');
  expect(attributes[0].value).toBe(undefined);
  expect(attributes[1].name.name).toBe('foo');
  expect(attributes[1].value.kind).toBe('Str');
  expect(attributes[1].value.value).toBe('bar');
  expect(attributes[2].value.kind).toBe('Num');
  expect(attributes[2].value.value).toBe(-3.14);
  expect(attributes[3].value.kind).toBe('Bool');
  expect(attributes[3].value.value).toBe(true);
  expect(attributes[4].value.kind).toBe('Null');
  expect(attributes[5].value.kind).toBe('Undefined');
});

test(`Parse props with object`, () => {
  const file = readFile('props-object');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  const firstChild = result.children[0];
  expect(firstChild.kind).toBe('Element');
  const attributes = firstChild.attributes;
  expect(attributes.length).toBe(1);
  expect(attributes[0].kind).toBe('Attribute');
  expect(attributes[0].value.kind).toBe('Obj');
  const items = attributes[0].value.items.properties;
  expect(items.length).toBe(5);
  const inner = items.map((item: any) => item.property);
  expect(inner.map((v: any) => v.kind)).toEqual([
    'ObjProperty',
    'ObjComputedProperty',
    'ObjPropertyShorthand',
    'Spread',
    'ObjProperty',
  ]);
});

test(`Parse a line comment`, () => {
  const file = `// some comment`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children[0].kind).toBe('LineComment');
});

test(`Parse an empty line comment`, () => {
  const file = `//\n`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children[0].kind).toBe('LineComment');
});

test(`Parse an empty line comment then EOF`, () => {
  const file = `//`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children[0].kind).toBe('LineComment');
});

test(`Parse block comment`, () => {
  const file = `/* some comment */`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children[0].kind).toBe('BlockComment');
});

test(`Parse block comment ended with EOF`, () => {
  const file = `/* some comment \n\n`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children[0].kind).toBe('BlockComment');
});

test(`Parse single slash`, () => {
  const file = `/`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children[0].kind).toBe('Text');
});

test(`Ending < does not throw error`, () => {
  const file = `</Foo/><`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children[0].kind).toBe('SelfClosingElement');
  expect(result.children[1].kind).toBe('Text');
});

test(`Parse ending /`, () => {
  const file = `</Foo/>/`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children[0].kind).toBe('SelfClosingElement');
  expect(result.children[1].kind).toBe('Text');
  expect(result.children[1].content).toBe('/');
});

test(`Parse a line in context`, () => {
  const file = [`// some comment`, '</Foo/> // demo'].join('\n');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.map((item: any) => item.kind)).toEqual([
    'LineComment',
    'Whitespace',
    'SelfClosingElement',
    'Whitespace',
    'LineComment',
  ]);
  expect(result.children[0].content).toBe(' some comment');
  expect(result.children[3].content).toBe(' ');
  expect(result.children[4].content).toBe(' demo');
});

test(`Does not parse element in comment`, () => {
  const file = `// </Foo/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children[0].kind).toBe('LineComment');
  expect(result.children[0].content).toBe(' </Foo/>');
});

test(`Parse block comment`, () => {
  const file = [`/*`, `More comments !`, `</Title bold>Hello world !/>`, '', '*', `*/`].join('\n');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toBe('BlockComment');
  expect(result.children[0].content).toBe(
    ['', 'More comments !', '</Title bold>Hello world !/>', '', '*', ''].join('\n'),
  );
});

test('Parse more comments', () => {
  const file = [`<|Title bold>Hello world !</>`, ``, `// some comment`, ``, `/*`, `More comments !`, `*/`].join('\n');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
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
  const file = `<|>Demo</>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(1);
  expect(result.children[0].children[0].kind).toEqual('Text');
  expect(result.children[0].children[0].content).toEqual('Demo');
});

test(`Fragment with content`, () => {
  const file = `<|>Foo </Demo/> Bar </>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(3);
  const children = result.children[0].children;
  expect(children.map((v: any) => v.kind)).toEqual(['Text', 'SelfClosingElement', 'Text']);
});

test(`Two Fragment side by side`, () => {
  const file = `<|>Foo</><|>Bar</>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toEqual('Fragment');
  expect(result.children[1].kind).toEqual('Fragment');
});

test(`Fragment in Fragment`, () => {
  const file = `<|>A1<|>B1</>A2</>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(3);
  expect(result.children[0].children[1].kind).toEqual('Fragment');
});

test(`Fragment > Element > Fragment`, () => {
  const file = `<|>A1<|Demo>B1<|>C1</>B2</>A2</>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('Fragment');
  expect(result.children[0].children.length).toEqual(3);
  expect(result.children[0].children[1].kind).toEqual('Element');
  expect(result.children[0].children[1].children.length).toEqual(3);
  expect(result.children[0].children[1].children[1].kind).toEqual('Fragment');
});

test('RawFragment <#>', () => {
  const file = `<#>Foo</>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawFragment');
  expect(result.children[0].content).toEqual('Foo');
});

test('Element in Raw Fragment is text', () => {
  const file = `<#> </Demo/> </>`;
  expect(() => parseDocument(file, 'source.docsy').result).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawFragment');
  expect(result.children[0].content).toEqual(' </Demo/> ');
});

test('Parse two Raw fragments', () => {
  const file = `<#>Some raw content</><#>Som raw content</>`;
  expect(() => parseDocument(file, 'source.docsy').result).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toEqual('RawFragment');
  expect(result.children[1].kind).toEqual('RawFragment');
});

test('Parse two Raw fragments with new lines', () => {
  const file = `<#>\n\nSome raw content</>\n<#>Som raw content</>`;
  expect(() => parseDocument(file, 'source.docsy').result).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(3);
  expect(result.children[0].kind).toEqual('RawFragment');
  expect(result.children[1].kind).toEqual('Whitespace');
  expect(result.children[2].kind).toEqual('RawFragment');
});

test('RawElement', () => {
  const file = `<#Foo> Hello </>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawElement');
  expect(result.children[0].content).toEqual(' Hello ');
});

test('RawElement name close', () => {
  const file = `<#Foo> Hello <Foo/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawElement');
  expect(result.children[0].content).toEqual(' Hello ');
});

test('Element in RawElement is text', () => {
  const file = `<#Foo> </Hello/> <Foo/>`;
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toEqual('RawElement');
  expect(result.children[0].content).toEqual(' </Hello/> ');
});

test(`Parse raw.docsy file`, () => {
  const file = readFile('tag-in-raw');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.map((c: any) => c.kind)).toEqual(['RawElement', 'Whitespace']);
});

test(`Parse raw.docsy file`, () => {
  const file = readFile('raw');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.children.map((c: any) => c.kind)).toEqual([
    'RawFragment',
    'Whitespace',
    'RawFragment',
    'Whitespace',
    'RawElement',
    'Whitespace',
    'RawElement',
    'Whitespace',
    'RawElement',
    'Whitespace',
  ]);
});

test(`Parse complex-raw.docsy file`, () => {
  const file = readFile('complex-raw');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  // const result = parseDocument(file, 'source.docsy').result as any;
  // logNode(result.children.map((c: any) => c.kind));
});

test(`Parse complete.docsy file`, () => {
  const file = readFile('complete');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Parse inject`, () => {
  const file = '{34}';
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.kind).toBe('Document');
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toBe('Inject');
  expect(result.children[0].value.kind).toBe('Num');
  expect(result.children[0].value.value).toBe(34);
});

test(`Parse inject file`, () => {
  const file = readFile('inject');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.kind).toBe('Document');
  expect(result.children.length).toBe(2);
  expect(result.children[0].kind).toBe('Inject');
  expect(result.children[0].value.kind).toBe('Obj');
});

test(`Parse inject with spaces`, () => {
  const file = '{\n34   \n}';
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
  const result = parseDocument(file, 'source.docsy').result as any;
  expect(result.kind).toBe('Document');
  expect(result.children.length).toBe(1);
  expect(result.children[0].kind).toBe('Inject');
  expect(result.children[0].value.kind).toBe('Num');
  expect(result.children[0].value.value).toBe(34);
});

test(`Parse all.docsy file`, () => {
  const file = readFile('all');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Parse long.docsy file`, () => {
  const file = readFile('long');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});

test(`Parse code with JSX inside`, () => {
  const file = readFile('code-with-jsx');
  expect(() => parseDocument(file, 'source.docsy')).not.toThrow();
});
