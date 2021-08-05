import { Node } from './internal/Node.js';
import { stackToString } from './internal/Parser.js';
import { StringReader } from './internal/StringReader.js';
import { Stack } from './internal/types.js';

export class DocsyError extends Error {
  constructor(message: string) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }

  public static ParsingError: typeof DocsyParsingError;
  public static NotEOF: typeof DocsyNotEOF;
  public static NotImplementedError: typeof DocsyNotImplementedError;
  public static CannotTransformValueError: typeof DocsyCannotTransformValueError;
  public static UnexpectedError: typeof DocsyUnexpectedError;
  public static MissingGlobalError: typeof DocsyMissingGlobalError;
  public static CannotResolveInjectError: typeof DocsyCannotResolveInjectError;
  public static CannotResolveNodeError: typeof DocsyCannotResolveNodeError;
  public static MissingJsxFunctionError: typeof DocsyMissingJsxFunctionError;
  public static CannotSerializeNodeError: typeof DocsyCannotSerializeNodeError;
}

class DocsyParsingError extends DocsyError {
  constructor(public docsyStack: Stack) {
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

class DocsyNotImplementedError extends DocsyError {
  constructor(message: string) {
    super(`Not Implemented: ${message}`);
  }
}

class DocsyCannotTransformValueError extends DocsyError {
  constructor(public value: unknown) {
    super(`Cannot transform value of type: ${typeof value}`);
  }
}

class DocsyCannotResolveNodeError extends DocsyError {
  constructor(public docsyNode: Node, message?: string) {
    super(`Cannot resolve node ${docsyNode.type}${message ? ': ' + message : ''}`);
  }
}

class DocsyCannotSerializeNodeError extends DocsyError {
  constructor(public docsyNode: Node, message?: string) {
    super(`Cannot serialize node ${docsyNode.type}${message ? ': ' + message : ''}`);
  }
}

class DocsyUnexpectedError extends DocsyError {
  constructor(message: string) {
    super(`Unexpected: ${message}`);
  }
}

class DocsyMissingGlobalError extends DocsyError {
  constructor(public docsyNode: Node, message: string) {
    super(`Missing global: ${message}`);
  }
}

class DocsyMissingJsxFunctionError extends DocsyError {
  constructor() {
    super(`Missing global: No JSX function provided, you need a jsx(type, props, key) function to resolve components.`);
  }
}

class DocsyCannotResolveInjectError extends DocsyError {
  constructor(public docsyNode: Node) {
    super(`Inject content should resolve to string`);
  }
}

DocsyError.ParsingError = DocsyParsingError;
DocsyError.NotEOF = DocsyNotEOF;
DocsyError.NotImplementedError = DocsyNotImplementedError;
DocsyError.CannotTransformValueError = DocsyCannotTransformValueError;
DocsyError.UnexpectedError = DocsyUnexpectedError;
DocsyError.MissingGlobalError = DocsyMissingGlobalError;
DocsyError.CannotResolveInjectError = DocsyCannotResolveInjectError;
DocsyError.CannotResolveNodeError = DocsyCannotResolveNodeError;
DocsyError.MissingJsxFunctionError = DocsyMissingJsxFunctionError;
DocsyError.CannotSerializeNodeError = DocsyCannotSerializeNodeError;
