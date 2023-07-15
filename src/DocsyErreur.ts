import { ErreurType } from '@dldc/erreur';
import type { Node } from './Ast';
import type { IParsedBase, Parsed } from './Parsed';
import { stackToString } from './internal/Parser';
import type { StringReader } from './internal/StringReader';
import type { Stack } from './internal/types';
import { offsetToPosition } from './internal/utils';

const DocsyErreurBase = ErreurType.defineEmpty('DocsyErreur');

const DocsyFileError = ErreurType.defineWithTransform(
  'FileError',
  (file: IParsedBase | undefined, node: Node, message: string) => {
    const errorLocation = (() => {
      if (!file) {
        return ``;
      }
      const pos = file.ranges.get(node);
      if (!pos) {
        return `\n  ${file.filename}`;
      }
      const { line, column } = offsetToPosition(file.source, pos.start);
      return `\n  ${file.filename}:${line}:${column}`;
    })();
    return {
      file,
      node,
      message,
      errorLocation,
    };
  },
  (err, provider, { message, errorLocation }) => {
    return DocsyErreurBase.append(err).with(provider).withMessage(`Error in Docsy file: ${message}${errorLocation}`);
  },
);

export const DocsyErreur = {
  ParsingError: ErreurType.defineWithTransform(
    'ParsingError',
    (file: string, source: string, docsyStack: Stack) => ({ file, source, docsyStack }),
    (err, provider, { docsyStack }) => {
      return DocsyErreurBase.append(err)
        .with(provider)
        .withMessage(`Parsing error:\n${stackToString(docsyStack, 2)}`);
    },
  ),
  NotEOF: ErreurType.defineWithTransform(
    'NotEOF',
    (rest: StringReader) => ({ rest }),
    (err, provider, { rest }) => {
      const restText = (() => {
        const restText = rest.peek(Infinity);
        if (restText.length < 20) {
          return `"${restText}"`;
        }
        return `"${restText.slice(0, 17)}..."`;
      })();

      return DocsyErreurBase.append(err).with(provider).withMessage(`Expecting EOF but rest: ${restText}`);
    },
  ),
  CannotTransformValue: ErreurType.defineWithTransform(
    'CannotTransformValue',
    (value: unknown) => ({ value }),
    (err, provider, { value }) => {
      return DocsyErreurBase.append(err)
        .with(provider)
        .withMessage(`Cannot transform value of type: ${typeof value}`);
    },
  ),
  UnexpectedError: ErreurType.defineWithTransform(
    'UnexpectedError',
    (message: string) => ({ message }),
    (err, provider, { message }) => {
      return DocsyErreurBase.append(err).with(provider).withMessage(`Unexpected: ${message}`);
    },
  ),
  ParserNotImplemented: ErreurType.defineWithTransform(
    'ParserNotImplemented',
    (parserName: string) => ({ parserName }),
    (err, provider, { parserName }) => {
      return DocsyErreurBase.append(err)
        .with(provider)
        .withMessage(`Cannot get parser rule "${parserName}": no parser defined !`);
    },
  ),
  ResolverNotImplemented: ErreurType.defineWithTransform(
    'ResolverNotImplemented',
    (resolverName: string) => ({ resolverName }),
    (err, provider, { resolverName }) => {
      return DocsyErreurBase.append(err)
        .with(provider)
        .withMessage(`Cannot get resolver rule "${resolverName}": no resolver defined !`);
    },
  ),
  ParsedNotReady: ErreurType.defineWithTransform(
    'ParsedNotReady',
    (fileName: string) => ({ fileName }),
    (err, provider, { fileName }) => {
      return DocsyErreurBase.append(err)
        .with(provider)
        .withMessage(
          `Parsed not ready for file "${fileName}", did you try to access parsed.result before parsing is done ?`,
        );
    },
  ),
  FileError: DocsyFileError,
  MissingGlobal: ErreurType.defineWithTransform(
    'MissingGlobal',
    (file: Parsed | undefined, node: Node, message: string) => ({ file, node, message }),
    (err, provider, { file, node, message }) => {
      return DocsyFileError.append(err, file, node, `Missing global: ${message}`).with(provider);
    },
  ),
  TypeError: ErreurType.defineWithTransform(
    'TypeError',
    (file: Parsed | undefined, node: Node, message: string) => ({ file, node, message }),
    (err, provider, { file, node, message }) => {
      return DocsyFileError.append(err, file, node, `TypeError: ${message}`).with(provider);
    },
  ),
  CannotResolveNode: ErreurType.defineWithTransform(
    'CannotResolveNode',
    (file: Parsed | undefined, node: Node, message: string) => ({ file, node, message }),
    (err, provider, { file, node, message }) => {
      return DocsyFileError.append(
        err,
        file,
        node,
        `Cannot resolve node ${node.kind}${message ? ': ' + message : ''}`,
      ).with(provider);
    },
  ),
  CannotResolveInject: ErreurType.defineWithTransform(
    'CannotResolveInject',
    (file: Parsed | undefined, node: Node) => ({ file, node }),
    (err, provider, { file, node }) => {
      return DocsyFileError.append(err, file, node, `Inject content should resolve to string`).with(provider);
    },
  ),
  MissingJsxFunction: ErreurType.defineWithTransform(
    'MissingJsxFunction',
    (file: Parsed | undefined, node: Node) => ({ file, node }),
    (err, provider, { file, node }) => {
      return DocsyFileError.append(
        err,
        file,
        node,
        `Missing global: No JSX function provided, you need a jsx(type, props, key) function to resolve components.`,
      ).with(provider);
    },
  ),
  MissingFragment: ErreurType.defineWithTransform(
    'MissingFragment',
    (file: Parsed | undefined, node: Node) => ({ file, node }),
    (err, provider, { file, node }) => {
      return DocsyFileError.append(err, file, node, `Missing global: No Fragment provided.`).with(provider);
    },
  ),
  CannotSerializeNode: ErreurType.defineWithTransform(
    'CannotSerializeNode',
    (file: Parsed | undefined, node: Node, message?: string) => ({ file, node, message }),
    (err, provider, { file, node, message }) => {
      return DocsyFileError.append(
        err,
        file,
        node,
        `Cannot serialize node ${node.kind}${message ? ': ' + message : ''}`,
      ).with(provider);
    },
  ),
};
