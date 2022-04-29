import { Node } from './Ast.ts';
import { stackToString } from './internal/Parser.ts';
import { StringReader } from './internal/StringReader.ts';
import { Stack } from './internal/types.ts';
import { offsetToPosition } from './internal/utils.ts';
import { ParserResultBase } from './ParserResult.ts';

export class DocsyError extends Error {
  constructor(message: string) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }

  public static ParsingError: typeof DocsyParsingError;
  public static NotEOF: typeof DocsyNotEOF;
  public static CannotTransformValue: typeof DocsyCannotTransformValue;
  public static UnexpectedError: typeof DocsyUnexpectedError;
  public static ParserNotImplemented: typeof ParserNotImplemented;

  public static FileError: typeof DocsyFileError;
  public static MissingGlobal: typeof DocsyMissingGlobal;
  public static CannotResolveNode: typeof DocsyCannotResolveNode;
  public static CannotResolveInject: typeof DocsyCannotResolveInject;
  public static MissingJsxFunction: typeof DocsyMissingJsxFunction;
  public static CannotSerializeNode: typeof DocsyCannotSerializeNode;
}

class DocsyParsingError extends DocsyError {
  constructor(public readonly file: string, public readonly source: string, public readonly docsyStack: Stack) {
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
      })()}`
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

class ParserNotImplemented extends DocsyError {
  constructor(public parserName: string) {
    super(`Cannot get parser rule "${parserName}": no parser defined !`);
  }
}

class DocsyFileError extends DocsyError {
  constructor(
    public readonly file: ParserResultBase | undefined,
    public readonly node: Node,
    public readonly docsyMessage: string
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
  constructor(file: ParserResultBase | undefined, node: Node, message: string) {
    super(file, node, `Missing global: ${message}`);
  }
}

class DocsyCannotResolveNode extends DocsyFileError {
  constructor(file: ParserResultBase | undefined, node: Node, message?: string) {
    super(file, node, `Cannot resolve node ${node.kind}${message ? ': ' + message : ''}`);
  }
}

class DocsyCannotResolveInject extends DocsyFileError {
  constructor(file: ParserResultBase | undefined, node: Node) {
    super(file, node, `Inject content should resolve to string`);
  }
}

class DocsyMissingJsxFunction extends DocsyFileError {
  constructor(file: ParserResultBase | undefined, node: Node) {
    super(
      file,
      node,
      `Missing global: No JSX function provided, you need a jsx(type, props, key) function to resolve components.`
    );
  }
}

class DocsyCannotSerializeNode extends DocsyFileError {
  constructor(file: ParserResultBase | undefined, node: Node, message?: string) {
    super(file, node, `Cannot serialize node ${node.kind}${message ? ': ' + message : ''}`);
  }
}

DocsyError.ParsingError = DocsyParsingError;
DocsyError.NotEOF = DocsyNotEOF;
DocsyError.CannotTransformValue = DocsyCannotTransformValue;
DocsyError.UnexpectedError = DocsyUnexpectedError;
DocsyError.ParserNotImplemented = ParserNotImplemented;

DocsyError.FileError = DocsyFileError;
DocsyError.MissingGlobal = DocsyMissingGlobal;
DocsyError.CannotResolveNode = DocsyCannotResolveNode;
DocsyError.CannotResolveInject = DocsyCannotResolveInject;
DocsyError.MissingJsxFunction = DocsyMissingJsxFunction;
DocsyError.CannotSerializeNode = DocsyCannotSerializeNode;
