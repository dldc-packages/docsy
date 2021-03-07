import { DocsyResolver, DocsyParser } from '../src';

test('Resolve simple text', () => {
  const node = DocsyParser.parseDocumentSync('Hello');
  const resolved = DocsyResolver.resolve(node.document, {});
  expect(resolved).toEqual('Hello');
});

test('Resolve Inject text', () => {
  const node = DocsyParser.parseDocumentSync(`Hello {'Paul'}`);
  const resolved = DocsyResolver.resolve(node.document, {});
  expect(resolved).toEqual('Hello Paul');
});

test('Resolve variable', () => {
  const node = DocsyParser.parseDocumentSync(`The sky is {color}`);
  const resolved = DocsyResolver.resolve(node.document, {
    globals: {
      color: 'Blue',
    },
  });
  expect(resolved).toEqual('The sky is Blue');
});

test('Resolve element', () => {
  const node = DocsyParser.parseDocumentSync(`<|Demo|>`);
  const Demo = 'DemoType';
  const resolved = DocsyResolver.resolve(node.document, {
    jsx: (type, props, key) => ({ type, props, key }),
    globals: { Demo },
  });
  expect(resolved).toEqual({
    key: undefined,
    props: { children: undefined },
    type: 'DemoType',
  });
});
