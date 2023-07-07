import { Node } from './Ast';
import { stackToString } from './internal/Parser';
import { StringReader } from './internal/StringReader';
import { Stack } from './internal/types';
import { offsetToPosition } from './internal/utils';
import { Parsed, ParsedBase } from './Parsed';

export class DocsyError extends Error {
  constructor(message: string) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }

  public static ParsingError: typeof DocsyParsingError;
  public static NotEOF: typeof DocsyNotEOF;
  public static CannotTransformValue: typeof DocsyCannotTransformValue;
  public static UnexpectedError: typeof DocsyUnexpectedError;
  public static ParserNotImplemented: typeof DocsyParserNotImplemented;
  public static ResolverNotImplemented: typeof DocsyResolverNotImplemented;
  public static ParsedNotReady: typeof DocsyParsedNotReady;

  public static FileError: typeof DocsyFileError;
  // These error extends FileError
  public static MissingGlobal: typeof DocsyMissingGlobal;
  public static TypeError: typeof DocsyTypeError;
  public static CannotResolveNode: typeof DocsyCannotResolveNode;
  public static CannotResolveInject: typeof DocsyCannotResolveInject;
  public static MissingJsxFunction: typeof DocsyMissingJsxFunction;
  public static MissingFragment: typeof DocsyMissingFragment;
  public static CannotSerializeNode: typeof DocsyCannotSerializeNode;
}

class DocsyParsingError extends DocsyError {
  constructor(
    public readonly file: string,
    public readonly source: string,
    public readonly docsyStack: Stack,
  ) {
    super(`Parsing error:\n${stackToString(docsyStack, 2)}`);
  }
}

class DocsyNotEOF extends DocsyError {
  constructor(public rest: StringReader) {
    super(
      `Expectinf EOF but rest: ${(() => {
        const restText = rest.peek(Infinity);
        if (restText.length < 20) {
          return `"${restText}"`;
        }
        return `"${restText.slice(0, 17)}..."`;
      })()}`,
    );
  }
}

class DocsyCannotTransformValue extends DocsyError {
  constructor(public value: unknown) {
    super(`Cannot transform value of type: ${typeof value}`);
  }
}

class DocsyUnexpectedError extends DocsyError {
  constructor(message: string) {
    super(`Unexpected: ${message}`);
  }
}

class DocsyParserNotImplemented extends DocsyError {
  constructor(public parserName: string) {
    super(`Cannot get parser rule "${parserName}": no parser defined !`);
  }
}

class DocsyResolverNotImplemented extends DocsyError {
  constructor(public parserName: string) {
    super(`Cannot get parser rule "${parserName}": no parser defined !`);
  }
}

class DocsyParsedNotReady extends DocsyError {
  constructor(public fileName: string) {
    super(`Parsed not ready for file "${fileName}", did you try to access parsed.result before parsing is done ?`);
  }
}

class DocsyFileError extends DocsyError {
  constructor(
    public readonly file: ParsedBase | undefined,
    public readonly node: Node,
    public readonly docsyMessage: string,
  ) {
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
    const message = `Error in Docsy file: ${docsyMessage}${errorLocation}`;
    super(message);
  }
}

class DocsyMissingGlobal extends DocsyFileError {
  constructor(file: Parsed | undefined, node: Node, message: string) {
    super(file, node, `Missing global: ${message}`);
  }
}

class DocsyTypeError extends DocsyFileError {
  constructor(file: Parsed | undefined, node: Node, message: string) {
    super(file, node, `TypeError: ${message}`);
  }
}

class DocsyCannotResolveNode extends DocsyFileError {
  constructor(file: Parsed | undefined, node: Node, message?: string) {
    super(file, node, `Cannot resolve node ${node.kind}${message ? ': ' + message : ''}`);
  }
}

class DocsyCannotResolveInject extends DocsyFileError {
  constructor(file: Parsed | undefined, node: Node) {
    super(file, node, `Inject content should resolve to string`);
  }
}

class DocsyMissingJsxFunction extends DocsyFileError {
  constructor(file: Parsed | undefined, node: Node) {
    super(
      file,
      node,
      `Missing global: No JSX function provided, you need a jsx(type, props, key) function to resolve components.`,
    );
  }
}

class DocsyMissingFragment extends DocsyFileError {
  constructor(file: Parsed | undefined, node: Node) {
    super(file, node, `Missing global: No Fragment provided.`);
  }
}

class DocsyCannotSerializeNode extends DocsyFileError {
  constructor(file: Parsed | undefined, node: Node, message?: string) {
    super(file, node, `Cannot serialize node ${node.kind}${message ? ': ' + message : ''}`);
  }
}

const ERRORS: Omit<typeof DocsyError, keyof typeof Error> = {
  ParsingError: DocsyParsingError,
  NotEOF: DocsyNotEOF,
  CannotTransformValue: DocsyCannotTransformValue,
  UnexpectedError: DocsyUnexpectedError,
  ParserNotImplemented: DocsyParserNotImplemented,
  ResolverNotImplemented: DocsyResolverNotImplemented,

  ParsedNotReady: DocsyParsedNotReady,
  FileError: DocsyFileError,
  MissingGlobal: DocsyMissingGlobal,
  TypeError: DocsyTypeError,
  CannotResolveNode: DocsyCannotResolveNode,
  CannotResolveInject: DocsyCannotResolveInject,
  MissingJsxFunction: DocsyMissingJsxFunction,
  MissingFragment: DocsyMissingFragment,
  CannotSerializeNode: DocsyCannotSerializeNode,
};

Object.assign(DocsyError, ERRORS);
