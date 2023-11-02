import type { TKey, TVoidKey } from '@dldc/erreur';
import { Erreur, Key } from '@dldc/erreur';
import type { Node } from './Ast';
import type { IParsedBase, Parsed } from './Parsed';
import { stackToString } from './internal/Parser';
import type { StringReader } from './internal/StringReader';
import type { Stack } from './internal/types';
import { offsetToPosition } from './internal/utils';

export interface FileErrorData {
  file: IParsedBase | undefined;
  node: Node;
  message: string;
  errorLocation: string;
}

export interface ParsingErrorData {
  file: string;
  source: string;
  docsyStack: Stack;
}

export const DocsyErreur = (() => {
  const DocsyErreurBaseKey: TVoidKey = Key.createEmpty('DocsyErreur');

  const ParsingErrorKey: TKey<ParsingErrorData, false> = Key.create('ParsingError');
  const NotEOFKey: TKey<{ rest: StringReader }, false> = Key.create('NotEOF');
  const CannotTransformValueKey: TKey<{ value: unknown }, false> = Key.create('CannotTransformValue');
  const UnexpectedErrorKey: TKey<{ message: string }, false> = Key.create('UnexpectedError');
  const ParserNotImplementedKey: TKey<{ parserName: string }, false> = Key.create('ParserNotImplemented');
  const ResolverNotImplementedKey: TKey<{ resolverName: string }, false> = Key.create('ResolverNotImplemented');
  const ParsedNotReadyKey: TKey<{ fileName: string }, false> = Key.create('ParsedNotReady');

  const FileErrorKey: TKey<FileErrorData, false> = Key.create('FileError');
  const MissingGlobalKey: TVoidKey = Key.createEmpty('MissingGlobal');
  const TypeErrorKey: TVoidKey = Key.createEmpty('TypeError');
  const CannotResolveNodeKey: TVoidKey = Key.createEmpty('CannotResolveNode');
  const CannotResolveInjectKey: TVoidKey = Key.createEmpty('CannotResolveInject');
  const MissingJsxFunctionKey: TVoidKey = Key.createEmpty('MissingJsxFunction');
  const MissingFragmentKey: TVoidKey = Key.createEmpty('MissingFragment');
  const CannotSerializeNodeKey: TVoidKey = Key.createEmpty('CannotSerializeNode');

  return {
    ParsingError: {
      Key: ParsingErrorKey,
      create(file: string, source: string, docsyStack: Stack) {
        return createBase(new Error(`Parsing error:\n${stackToString(docsyStack, 2)}`)).with(
          ParsingErrorKey.Provider({ file, source, docsyStack }),
        );
      },
    },
    NotEOF: {
      Key: NotEOFKey,
      create(rest: StringReader) {
        const restText = (() => {
          const restText = rest.peek(Infinity);
          if (restText.length < 20) {
            return `"${restText}"`;
          }
          return `"${restText.slice(0, 17)}..."`;
        })();

        return createBase(new Error(`Expecting EOF but rest: "${restText}"`)).with(NotEOFKey.Provider({ rest }));
      },
    },
    CannotTransformValue: {
      Key: CannotTransformValueKey,
      create(value: unknown) {
        return createBase(new Error())
          .with(CannotTransformValueKey.Provider({ value }))
          .withMessage(`Cannot transform value of type: ${typeof value}`);
      },
    },
    UnexpectedError: {
      Key: UnexpectedErrorKey,
      create(message: string) {
        return createBase(new Error())
          .with(UnexpectedErrorKey.Provider({ message }))
          .withMessage(`Unexpected: ${message}`);
      },
    },
    ParserNotImplemented: {
      Key: ParserNotImplementedKey,
      create(parserName: string) {
        return createBase(new Error(`Cannot get parser rule "${parserName}": no parser defined !`)).with(
          ParserNotImplementedKey.Provider({ parserName }),
        );
      },
    },
    ResolverNotImplemented: {
      Key: ResolverNotImplementedKey,
      create(resolverName: string) {
        return createBase(new Error(`Cannot get resolver rule "${resolverName}": no resolver defined !`)).with(
          ResolverNotImplementedKey.Provider({ resolverName }),
        );
      },
    },
    ParsedNotReady: {
      Key: ParsedNotReadyKey,
      create(fileName: string) {
        return createBase(
          new Error(
            `Parsed not ready for file "${fileName}", did you try to access parsed.result before parsing is done ?`,
          ),
        ).with(ParsedNotReadyKey.Provider({ fileName }));
      },
    },

    FileError: {
      Key: FileErrorKey,
      create: createFileError,
    },
    MissingGlobal: {
      Key: MissingGlobalKey,
      create(file: IParsedBase | undefined, node: Node, message: string) {
        return createFileError(new Error(`Missing global: ${message}`), file, node).with(MissingGlobalKey.Provider());
      },
    },
    TypeError: {
      Key: TypeErrorKey,
      create(file: Parsed | undefined, node: Node, message: string) {
        return createFileError(new Error(`TypeError: ${message}`), file, node).with(TypeErrorKey.Provider());
      },
    },
    CannotResolveNode: {
      Key: CannotResolveNodeKey,
      create(file: Parsed | undefined, node: Node, message: string) {
        return createFileError(
          new Error(`Cannot resolve node ${node.kind}${message ? ': ' + message : ''}`),
          file,
          node,
        ).with(CannotResolveNodeKey.Provider());
      },
    },
    CannotResolveInject: {
      Key: CannotResolveInjectKey,
      create(file: Parsed | undefined, node: Node) {
        return createFileError(new Error(`Inject content should resolve to string`), file, node).with(
          CannotResolveInjectKey.Provider(),
        );
      },
    },
    MissingJsxFunction: {
      Key: MissingJsxFunctionKey,
      create(file: Parsed | undefined, node: Node) {
        return createFileError(
          new Error(
            `Missing global: No JSX function provided, you need a jsx(type, props, key) function to resolve components.`,
          ),
          file,
          node,
        ).with(MissingJsxFunctionKey.Provider());
      },
    },
    MissingFragment: {
      Key: MissingFragmentKey,
      create(file: Parsed | undefined, node: Node) {
        return createFileError(new Error(`Missing global: No Fragment provided.`), file, node).with(
          MissingFragmentKey.Provider(),
        );
      },
    },
    CannotSerializeNode: {
      Key: CannotSerializeNodeKey,
      create(file: Parsed | undefined, node: Node, message?: string) {
        return createFileError(
          new Error(`Cannot serialize node ${node.kind}${message ? ': ' + message : ''}`),
          file,
          node,
        ).with(CannotSerializeNodeKey.Provider());
      },
    },
  };

  function createFileError(cause: Error, file: IParsedBase | undefined, node: Node) {
    const errorLocation = getErrorLocation(file, node);
    return createBase(cause)
      .with(FileErrorKey.Provider({ file, node, message: cause.message, errorLocation }))
      .withMessage(`Error in Docsy file: ${cause.message}${errorLocation}`);
  }

  function createBase(cause: Error) {
    return Erreur.create(cause).with(DocsyErreurBaseKey.Provider()).withName('DocsyErreur');
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
})();
