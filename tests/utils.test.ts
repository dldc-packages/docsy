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

// test('should transform item', () => {
//   const doc = `Hello <|Component|> Foo <|Bar|><|Content>Hello <|Bold|> |>`;
//   const parsed = DocsyParser.parseDocument(doc);
//   const before = JSON.stringify(parsed.document);
//   const updated = DocsyUtils.transform(parsed.document, (node) => node);
// });
