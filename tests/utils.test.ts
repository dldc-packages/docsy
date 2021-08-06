import { DocsyParser, DocsySerializer, DocsyUtils, NodeIs } from '../src';

test('should filter item', () => {
  const doc = `Hello <|Component|> Foo <|Bar|><|Content>Hello <|Bold|> |>`;
  const parsed = DocsyParser.parseDocument(doc);
  expect(parsed.document.children.length).toBe(5);
  const withoutComponent = DocsyUtils.filter(parsed.document, (node) => NodeIs.SelfClosingElement(node) === false);
  expect(DocsySerializer.serialize(withoutComponent)).toBe('Hello  Foo <|Content>Hello  |>');
});

test('should clone at paths', () => {
  const obj = {
    foo: [1, 2, 3],
    bar: {
      arr: [{ num: 1 }, { num: 2 }, { num: 3 }],
    },
  };
  const copy1 = DocsyUtils.cloneAtPaths(obj, []);
  expect(copy1).toBe(obj);
  const copy2 = DocsyUtils.cloneAtPaths(obj, [['foo']]);
  expect(copy2).not.toBe(obj);
  expect(copy2.bar).toBe(obj.bar);
  const copy3 = DocsyUtils.cloneAtPaths(obj, [['bar', 'arr', 0]]);
  expect(copy3).not.toBe(obj);
  expect(copy3.foo).toBe(obj.foo);
  expect(copy3.bar).not.toBe(obj.bar);
  expect(copy3.bar.arr).not.toBe(obj.bar.arr);
  expect(copy3.bar.arr[0]).not.toBe(obj.bar.arr[0]);
  expect(copy3.bar.arr[1]).toBe(obj.bar.arr[1]);
});

test('should transform item', () => {
  const doc = `Hello <|Component|> Foo <|Bar|><|Content>Hello <|Bold|> |>`;
  const parsed = DocsyParser.parseDocument(doc);
  const before = JSON.stringify(parsed.document);
  const updated = DocsyUtils.transform(parsed.document, (node) => {
    if (NodeIs.Identifier(node) && node.meta.name === 'Bold') {
      return DocsyUtils.updateNodeMeta(node, (meta) => ({ ...meta, name: 'Italic' }));
    }
    return node;
  });
  expect(before).toEqual(JSON.stringify(parsed.document));
  expect(DocsySerializer.serialize(updated)).toEqual(`Hello <|Component|> Foo <|Bar|><|Content>Hello <|Italic|> |>`);
});

test('should component name and props', () => {
  const doc = `<|SomeComponent foo="bar" num=41>Inner content|>`;
  const parsed = DocsyParser.parseDocument(doc);
  const updated = DocsyUtils.transform(parsed.document, (node) => {
    if (NodeIs.Identifier(node) && node.meta.name === 'SomeComponent') {
      return DocsyUtils.updateNodeMeta(node, (meta) => ({ ...meta, name: 'UpdatedComponent' }));
    }
    if (NodeIs.PropValue(node) && node.children.name.meta.name === 'num') {
      return DocsyUtils.updateNodeChildren(node, (children) => ({
        ...children,
        value: DocsyUtils.createNodeFromValue(42),
      }));
    }
    return node;
  });
  expect(DocsySerializer.serialize(updated)).toEqual(`<|UpdatedComponent foo="bar" num=42>Inner content|>`);
});

test('should override sub changes', () => {
  const doc = `<|SomeComponent foo="bar" num=41>Inner content|>`;
  const parsed = DocsyParser.parseDocument(doc);
  const updated = DocsyUtils.transform(parsed.document, (node) => {
    if (NodeIs.Num(node)) {
      return DocsyUtils.createNodeFromValue(42);
    }
    if (NodeIs.PropValue(node) && node.children.name.meta.name === 'num') {
      return DocsyUtils.updateNodeChildren(node, (children) => ({
        ...children,
        value: DocsyUtils.createNodeFromValue('Will override'),
      }));
    }
    return node;
  });
  expect(DocsySerializer.serialize(updated)).toEqual(`<|SomeComponent foo="bar" num='Will override'>Inner content|>`);
});
