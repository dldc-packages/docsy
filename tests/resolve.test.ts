import { resolveNode, parseDocument } from '../src/mod';

test('Resolve simple text', () => {
  const node = parseDocument('Hello');
  const resolved = resolveNode(node.document, {});
  expect(resolved).toEqual('Hello');
});

test('Resolve Inject text', () => {
  const node = parseDocument(`Hello {'Paul'}`);
  const resolved = resolveNode(node.document, {});
  expect(resolved).toEqual('Hello Paul');
});

test('Resolve variable', () => {
  const node = parseDocument(`The sky is {color}`);
  const resolved = resolveNode(node.document, {
    globals: {
      color: 'Blue',
    },
  });
  expect(resolved).toEqual('The sky is Blue');
});

test('Resolve element', () => {
  const node = parseDocument(`</Demo/>`);
  const Demo = 'DemoType';
  const resolved = resolveNode(node.document, {
    jsx: (type, props, key) => ({ type, props, key }),
    globals: { Demo },
  });
  expect(resolved).toEqual({
    key: undefined,
    props: { children: undefined },
    type: 'DemoType',
  });
});
