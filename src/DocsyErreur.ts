import { createErreurStore, type TErreurStore } from "@dldc/erreur";
import type { Node } from "./Ast.ts";
import type { IParsedBase, Parsed } from "./Parsed.ts";
import { stackToString } from "./internal/Parser.ts";
import type { StringReader } from "./internal/StringReader.ts";
import type { Stack } from "./internal/types.ts";
import { offsetToPosition } from "./internal/utils.ts";

export type TDocsyErreurData =
  | { kind: "ParsingError"; file: string; source: string; docsyStack: Stack }
  | { kind: "NotEOF"; rest: StringReader }
  | { kind: "CannotTransformValue"; value: unknown }
  | { kind: "UnexpectedError"; message: string }
  | { kind: "ParserNotImplemented"; parserName: string }
  | { kind: "ResolverNotImplemented"; resolverName: string }
  | { kind: "ParsedNotReady"; fileName: string }
  | {
    kind: "FileError";
    file: IParsedBase | undefined;
    node: Node;
    errorLocation: string;
  };

const DocsyErreurInternal: TErreurStore<TDocsyErreurData> = createErreurStore<
  TDocsyErreurData
>();

export const DocsyErreur = DocsyErreurInternal.asReadonly;

export type TDocsyFileErreurData =
  | { kind: "MissingGlobal" }
  | { kind: "TypeError" }
  | { kind: "CannotResolveNode" }
  | { kind: "CannotResolveInject" }
  | { kind: "MissingJsxFunction" }
  | { kind: "MissingFragment" }
  | { kind: "CannotSerializeNode" };

const DocsyFileErreurInternal: TErreurStore<TDocsyFileErreurData> =
  createErreurStore<TDocsyFileErreurData>();

export const DocsyFileErreur = DocsyFileErreurInternal.asReadonly;

export function createParsingError(
  file: string,
  source: string,
  docsyStack: Stack,
) {
  return DocsyErreurInternal.setAndReturn(
    `Parsing error:\n${stackToString(docsyStack, 2)}`,
    {
      kind: "ParsingError",
      file,
      source,
      docsyStack,
    },
  );
}

export function createNotEOF(rest: StringReader) {
  const restText = (() => {
    const restText = rest.peek(Infinity);
    if (restText.length < 20) {
      return `"${restText}"`;
    }
    return `"${restText.slice(0, 17)}..."`;
  })();

  return DocsyErreurInternal.setAndReturn(
    `Expecting EOF but rest: "${restText}"`,
    { kind: "NotEOF", rest },
  );
}

export function createCannotTransformValue(value: unknown) {
  return DocsyErreurInternal.setAndReturn(
    `Cannot transform value of type: ${typeof value}`,
    {
      kind: "CannotTransformValue",
      value,
    },
  );
}

export function createUnexpectedError(message: string) {
  return DocsyErreurInternal.setAndReturn(message, {
    kind: "UnexpectedError",
    message,
  });
}

export function createParserNotImplemented(parserName: string) {
  return DocsyErreurInternal.setAndReturn(
    `Cannot get parser rule "${parserName}": no parser defined !`,
    {
      kind: "ParserNotImplemented",
      parserName,
    },
  );
}

export function createResolverNotImplemented(resolverName: string) {
  return DocsyErreurInternal.setAndReturn(
    `Cannot get resolver rule "${resolverName}": no resolver defined !`,
    {
      kind: "ResolverNotImplemented",
      resolverName,
    },
  );
}

export function createParsedNotReady(fileName: string) {
  return DocsyErreurInternal.setAndReturn(
    `Parsed not ready for file "${fileName}", did you try to access parsed.result before parsing is done ?`,
    { kind: "ParsedNotReady", fileName },
  );
}

export function createFileError(
  data: Error | string,
  file: IParsedBase | undefined,
  node: Node,
) {
  const errorLocation = getErrorLocation(file, node);
  const error = data instanceof Error
    ? data
    : new Error(data + `\nin file ${errorLocation}`);
  return DocsyErreurInternal.setAndReturn(error, {
    kind: "FileError",
    file,
    node,
    errorLocation,
  });
}

export function createMissingGlobal(
  file: IParsedBase | undefined,
  node: Node,
  message: string,
) {
  return DocsyFileErreurInternal.setAndReturn(
    createFileError(`Missing global: ${message}`, file, node),
    {
      kind: "MissingGlobal",
    },
  );
}

export function createTypeError(
  file: IParsedBase | undefined,
  node: Node,
  message: string,
) {
  return DocsyFileErreurInternal.setAndReturn(
    createFileError(`Type error: ${message}`, file, node),
    {
      kind: "TypeError",
    },
  );
}

export function createCannotResolveNode(
  file: Parsed | undefined,
  node: Node,
  message: string,
) {
  return DocsyFileErreurInternal.setAndReturn(
    createFileError(
      `Cannot resolve node ${node.kind}${message ? ": " + message : ""}`,
      file,
      node,
    ),
    {
      kind: "CannotResolveNode",
    },
  );
}

export function createCannotResolveInject(
  file: Parsed | undefined,
  node: Node,
) {
  return DocsyFileErreurInternal.setAndReturn(
    createFileError(`Inject content should resolve to string`, file, node),
    {
      kind: "CannotResolveInject",
    },
  );
}

export function createMissingJsxFunction(file: Parsed | undefined, node: Node) {
  return DocsyFileErreurInternal.setAndReturn(
    createFileError(
      `Missing global: No JSX function provided, you need a jsx(type, props, key) function to resolve components.`,
      file,
      node,
    ),
    {
      kind: "MissingJsxFunction",
    },
  );
}

export function createMissingFragment(file: Parsed | undefined, node: Node) {
  return DocsyFileErreurInternal.setAndReturn(
    createFileError(`Missing global: No Fragment provided.`, file, node),
    {
      kind: "MissingFragment",
    },
  );
}

export function createCannotSerializeNode(
  file: Parsed | undefined,
  node: Node,
  message?: string,
) {
  return DocsyFileErreurInternal.setAndReturn(
    createFileError(
      `Cannot serialize node ${node.kind}${message ? ": " + message : ""}`,
      file,
      node,
    ),
    {
      kind: "CannotSerializeNode",
    },
  );
}

function getErrorLocation(file: IParsedBase | undefined, node: Node) {
  if (!file) {
    return ``;
  }
  const pos = file.ranges.get(node);
  if (!pos) {
    return `\n  ${file.filename}`;
  }
  const { line, column } = offsetToPosition(file.source, pos.start);
  return `\n  ${file.filename}:${line}:${column}`;
}
