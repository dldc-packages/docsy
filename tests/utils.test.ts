import { Utils, parseDocument, serialize, Ast } from '../src/mod';

test.skip('should filter item', () => {
  const doc = `Hello </Component/> Foo </Bar/><|Content>Hello </Bold/> </>`;
  const parsed = parseDocument(doc);
  expect(parsed.document.children.length).toBe(5);
  const withoutComponent = Utils.filter(parsed.document, (node) => Ast.NodeIs.SelfClosingElement(node) === false);
  expect(serialize(withoutComponent)).toBe('Hello  Foo <|Content>Hello  </>');
});

test('should clone at paths', () => {
  const obj = {
    foo: [1, 2, 3],
    bar: {
      arr: [{ num: 1 }, { num: 2 }, { num: 3 }],
    },
  };
  const copy1 = Utils.cloneAtPaths(obj, []);
  expect(copy1).toBe(obj);
  const copy2 = Utils.cloneAtPaths(obj, [['foo']]);
  expect(copy2).not.toBe(obj);
  expect(copy2.bar).toBe(obj.bar);
  const copy3 = Utils.cloneAtPaths(obj, [['bar', 'arr', 0]]);
  expect(copy3).not.toBe(obj);
  expect(copy3.foo).toBe(obj.foo);
  expect(copy3.bar).not.toBe(obj.bar);
  expect(copy3.bar.arr).not.toBe(obj.bar.arr);
  expect(copy3.bar.arr[0]).not.toBe(obj.bar.arr[0]);
  expect(copy3.bar.arr[1]).toBe(obj.bar.arr[1]);
});

test.skip('should transform item', () => {
  const doc = `Hello <|Component|> Foo <|Bar|><|Content>Hello <|Bold|> |>`;
  const parsed = parseDocument(doc);
  const before = JSON.stringify(parsed.document);
  const updated = Utils.transform(parsed.document, (node) => {
    if (Ast.NodeIs.Identifier(node) && node.meta.name === 'Bold') {
      return Utils.updateNodeMeta(node, (meta) => ({ ...meta, name: 'Italic' }));
    }
    return node;
  });
  expect(before).toEqual(JSON.stringify(parsed.document));
  expect(serialize(updated)).toEqual(`Hello <|Component|> Foo <|Bar|><|Content>Hello <|Italic|> |>`);
});

// test('should component name and props', () => {
//   const doc = `<|SomeComponent foo="bar" num=41>Inner content|>`;
//   const parsed = parseDocument(doc);
//   const updated = Utils.transform(parsed.document, (node) => {
//     if (NodeIs.Identifier(node) && node.meta.name === 'SomeComponent') {
//       return Utils.updateNodeMeta(node, (meta) => ({ ...meta, name: 'UpdatedComponent' }));
//     }
//     if (NodeIs.PropValue(node) && node.children.name.meta.name === 'num') {
//       return Utils.updateNodeChildren(node, (children) => ({
//         ...children,
//         value: Utils.createNodeFromValue(42),
//       }));
//     }
//     return node;
//   });
//   expect(DocsySerializer.serialize(updated)).toEqual(`<|UpdatedComponent foo="bar" num=42>Inner content|>`);
// });

// test('should override sub changes', () => {
//   const doc = `<|SomeComponent foo="bar" num=41>Inner content|>`;
//   const parsed = parseDocument(doc);
//   const updated = Utils.transform(parsed.document, (node) => {
//     if (NodeIs.Num(node)) {
//       return Utils.createNodeFromValue(42);
//     }
//     if (NodeIs.PropValue(node) && node.children.name.meta.name === 'num') {
//       return Utils.updateNodeChildren(node, (children) => ({
//         ...children,
//         value: Utils.createNodeFromValue('Will override'),
//       }));
//     }
//     return node;
//   });
//   expect(DocsySerializer.serialize(updated)).toEqual(`<|SomeComponent foo="bar" num='Will override'>Inner content|>`);
// });
