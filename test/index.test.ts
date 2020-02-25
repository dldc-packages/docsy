import { parse, NodeIs, serialize } from '../src';
import fse from 'fs-extra';
import path from 'path';

function readFile(name: string): string {
  const testFileFolder = path.resolve(process.cwd(), 'test/files');
  const filePath = path.resolve(testFileFolder, `${name}.docsy`);
  const file = fse.readFileSync(filePath, { encoding: 'utf8' });
  return file;
}

describe('Parser', () => {
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
    expect(result.children[0].props.length).toBe(6);
    expect(result.children[0].props[0].type).toBe('NoValueProp');
    expect(result.children[0].props[0].name.name).toBe('bold');
    expect(result.children[0].props[1].type).toBe('Prop');
    expect(result.children[0].props[1].name.name).toBe('foo');
    expect(result.children[0].props[1].value.type).toBe('Str');
    expect(result.children[0].props[1].value.value).toBe('bar');
    expect(result.children[0].props[2].value.type).toBe('Num');
    expect(result.children[0].props[2].value.value).toBe(-3.14);
    expect(result.children[0].props[3].value.type).toBe('Bool');
    expect(result.children[0].props[3].value.value).toBe(true);
    expect(result.children[0].props[4].value.type).toBe('Null');
    expect(result.children[0].props[5].value.type).toBe('Undefined');
  });

  it(`Parse props with object`, () => {
    const file = readFile('props-object');
    expect(() => parse(file)).not.toThrow();
    const result = parse(file) as any;
    expect(result.children[0].type).toBe('Element');
    expect(result.children[0].props.length).toBe(1);
    expect(result.children[0].props[0].type).toBe('Prop');
    expect(result.children[0].props[0].value.type).toBe('Object');
    expect(result.children[0].props[0].value.items.length).toBe(5);
    expect(result.children[0].props[0].value.items.map((v: any) => v.type)).toEqual([
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

  it(`Parse a big file`, () => {
    const file = readFile('all');
    expect(() => parse(file)).not.toThrow();
  });
});

describe('Serializer', () => {
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
});

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function log(node: any) {
  console.log(JSON.stringify(removePositions(node), null, 2));
}

function removePositions(item: any): any {
  if (item && item.type && (NodeIs as any)[item.type]) {
    delete item.position;
    let res: any = {};
    Object.keys(item).forEach(key => {
      res[key] = removePositions(item[key]);
    });
    return res;
  }
  if (Array.isArray(item)) {
    return item.map(sub => removePositions(sub));
  }
  return item;
}
