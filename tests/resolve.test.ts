import { expect } from "@std/expect";
import { parseDocument, parseExpression, resolve } from "../mod.ts";

Deno.test("Resolve simple text", () => {
  const node = parseDocument("Hello", "source.docsy");
  const resolved = resolve(node.result, {});
  expect(resolved).toEqual("Hello");
});

Deno.test("Resolve Inject text", () => {
  const node = parseDocument(`Hello {'Paul'}`, "source.docsy");
  const resolved = resolve(node.result, {});
  expect(resolved).toEqual("Hello Paul");
});

Deno.test("Resolve variable", () => {
  const node = parseDocument(`The sky is {color}`, "source.docsy");
  const resolved = resolve(node.result, {
    globals: {
      color: "Blue",
    },
  });
  expect(resolved).toEqual("The sky is Blue");
});

Deno.test("Resolve element", () => {
  const node = parseDocument(`</Demo/>`, "source.docsy");
  const Demo = "DemoType";
  const resolved = resolve(node.result, {
    jsx: (type, props, key) => ({ type, props, key }),
    globals: { Demo },
  });
  expect(resolved).toEqual({
    key: undefined,
    props: { children: undefined },
    type: "DemoType",
  });
});

Deno.test("Resolve function", () => {
  const node = parseExpression(`getNum()`, "source.docsy");
  const resolved = resolve(node.result, {
    globals: { getNum: () => 42 },
  });
  expect(resolved).toEqual(42);
});

Deno.test("Resolve function with params", () => {
  const node = parseExpression(`add(2, 8)`, "source.docsy");
  const resolved = resolve(node.result, {
    globals: { add: (a: number, b: number) => a + b },
  });
  expect(resolved).toEqual(10);
});

Deno.test("Resolve parenthesis", () => {
  const node = parseExpression(`(42)`, "source.docsy");
  const resolved = resolve(node.result);
  expect(resolved).toEqual(42);
});

Deno.test("Resolve boolean", () => {
  const node = parseExpression(`true`, "source.docsy");
  const resolved = resolve(node.result);
  expect(resolved).toEqual(true);
});

Deno.test("Resolve Object", () => {
  const node = parseExpression(`{ foo: 'bar', baz: true }`, "source.docsy");
  const resolved = resolve(node.result);
  expect(resolved).toEqual({ foo: "bar", baz: true });
});
