import { resolve, parseDocument } from '../src/mod';

test('Resolve simple text', () => {
  const node = parseDocument('Hello', 'source.docsy');
  const resolved = resolve(node.result, {});
  expect(resolved).toEqual('Hello');
});

test('Resolve Inject text', () => {
  const node = parseDocument(`Hello {'Paul'}`, 'source.docsy');
  const resolved = resolve(node.result, {});
  expect(resolved).toEqual('Hello Paul');
});

test('Resolve variable', () => {
  const node = parseDocument(`The sky is {color}`, 'source.docsy');
  const resolved = resolve(node.result, {
    globals: {
      color: 'Blue',
    },
  });
  expect(resolved).toEqual('The sky is Blue');
});

test('Resolve element', () => {
  const node = parseDocument(`</Demo/>`, 'source.docsy');
  const Demo = 'DemoType';
  const resolved = resolve(node.result, {
    jsx: (type, props, key) => ({ type, props, key }),
    globals: { Demo },
  });
  expect(resolved).toEqual({
    key: undefined,
    props: { children: undefined },
    type: 'DemoType',
  });
});
