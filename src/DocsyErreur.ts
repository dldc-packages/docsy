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
        return createBase()
          .with(ParsingErrorKey.Provider({ file, source, docsyStack }))
          .withMessage(`Parsing error:\n${stackToString(docsyStack, 2)}`);
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

        return createBase().with(NotEOFKey.Provider({ rest })).withMessage(`Expecting EOF but rest: "${restText}"`);
      },
    },
    CannotTransformValue: {
      Key: CannotTransformValueKey,
      create(value: unknown) {
        return createBase()
          .with(CannotTransformValueKey.Provider({ value }))
          .withMessage(`Cannot transform value of type: ${typeof value}`);
      },
    },
    UnexpectedError: {
      Key: UnexpectedErrorKey,
      create(message: string) {
        return createBase().with(UnexpectedErrorKey.Provider({ message })).withMessage(`Unexpected: ${message}`);
      },
    },
    ParserNotImplemented: {
      Key: ParserNotImplementedKey,
      create(parserName: string) {
        return createBase()
          .with(ParserNotImplementedKey.Provider({ parserName }))
          .withMessage(`Cannot get parser rule "${parserName}": no parser defined !`);
      },
    },
    ResolverNotImplemented: {
      Key: ResolverNotImplementedKey,
      create(resolverName: string) {
        return createBase()
          .with(ResolverNotImplementedKey.Provider({ resolverName }))
          .withMessage(`Cannot get resolver rule "${resolverName}": no resolver defined !`);
      },
    },
    ParsedNotReady: {
      Key: ParsedNotReadyKey,
      create(fileName: string) {
        return createBase()
          .with(ParsedNotReadyKey.Provider({ fileName }))
          .withMessage(
            `Parsed not ready for file "${fileName}", did you try to access parsed.result before parsing is done ?`,
          );
      },
    },

    FileError: {
      Key: FileErrorKey,
      create: createFileError,
    },
    MissingGlobal: {
      Key: MissingGlobalKey,
      create(file: IParsedBase | undefined, node: Node, message: string) {
        return createFileError(file, node, `Missing global: ${message}`).with(MissingGlobalKey.Provider());
      },
    },
    TypeError: {
      Key: TypeErrorKey,
      create(file: Parsed | undefined, node: Node, message: string) {
        return createFileError(file, node, `TypeError: ${message}`).with(TypeErrorKey.Provider());
      },
    },
    CannotResolveNode: {
      Key: CannotResolveNodeKey,
      create(file: Parsed | undefined, node: Node, message: string) {
        return createFileError(file, node, `Cannot resolve node ${node.kind}${message ? ': ' + message : ''}`).with(
          CannotResolveNodeKey.Provider(),
        );
      },
    },
    CannotResolveInject: {
      Key: CannotResolveInjectKey,
      create(file: Parsed | undefined, node: Node) {
        return createFileError(file, node, `Inject content should resolve to string`).with(
          CannotResolveInjectKey.Provider(),
        );
      },
    },
    MissingJsxFunction: {
      Key: MissingJsxFunctionKey,
      create(file: Parsed | undefined, node: Node) {
        return createFileError(
          file,
          node,
          `Missing global: No JSX function provided, you need a jsx(type, props, key) function to resolve components.`,
        ).with(MissingJsxFunctionKey.Provider());
      },
    },
    MissingFragment: {
      Key: MissingFragmentKey,
      create(file: Parsed | undefined, node: Node) {
        return createFileError(file, node, `Missing global: No Fragment provided.`).with(MissingFragmentKey.Provider());
      },
    },
    CannotSerializeNode: {
      Key: CannotSerializeNodeKey,
      create(file: Parsed | undefined, node: Node, message?: string) {
        return createFileError(file, node, `Cannot serialize node ${node.kind}${message ? ': ' + message : ''}`).with(
          CannotSerializeNodeKey.Provider(),
        );
      },
    },
  };

  function createFileError(file: IParsedBase | undefined, node: Node, message: string) {
    const errorLocation = getErrorLocation(file, node);
    return createBase()
      .with(FileErrorKey.Provider({ file, node, message, errorLocation }))
      .withMessage(`Error in Docsy file: ${message}${errorLocation}`);
  }

  function createBase() {
    return Erreur.createWith(DocsyErreurBaseKey).withName('DocsyErreur');
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
