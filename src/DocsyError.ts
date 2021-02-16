import * as Combinator from './internal/Combinator';
import { Node } from './internal/Node';

export class DocsyError extends Error {
  constructor(message: string) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }

  public static ParsingError: typeof DocsyParsingError;
  public static NotImplementedError: typeof DocsyNotImplementedError;
  public static CannotTransformValueError: typeof DocsyCannotTransformValueError;
  public static UnexpectedError: typeof DocsyUnexpectedError;
  public static MissingGlobalError: typeof DocsyMissingGlobalError;
  public static CannotResolveInjectError: typeof DocsyCannotResolveInjectError;
  public static CannotResolveNodeError: typeof DocsyCannotResolveNodeError;
  public static MissingJsxFunctionError: typeof DocsyMissingJsxFunctionError;
  public static CannotSerializeNodeError: typeof DocsyCannotSerializeNodeError;
}

export class DocsyParsingError extends DocsyError {
  constructor(public docsyStack: Combinator.StackItem) {
    super('Parsing error');
  }

  public docsyStackToString(): string {
    return Combinator.printParseError(this.docsyStack);
  }
}

export class DocsyNotImplementedError extends DocsyError {
  constructor(message: string) {
    super(`Not Implemented: ${message}`);
  }
}

export class DocsyCannotTransformValueError extends DocsyError {
  constructor(public value: any) {
    super(`Cannot transform value of type: ${typeof value}`);
  }
}

export class DocsyCannotResolveNodeError extends DocsyError {
  constructor(public docsyNode: Node, message?: string) {
    super(`Cannot resolve node ${docsyNode.type}${message ? ': ' + message : ''}`);
  }
}

export class DocsyCannotSerializeNodeError extends DocsyError {
  constructor(public docsyNode: Node, message?: string) {
    super(`Cannot serialize node ${docsyNode.type}${message ? ': ' + message : ''}`);
  }
}

export class DocsyUnexpectedError extends DocsyError {
  constructor(message: string) {
    super(`Unexpected: ${message}`);
  }
}

export class DocsyMissingGlobalError extends DocsyError {
  constructor(public docsyNode: Node, message: string) {
    super(`Missing global: ${message}`);
  }
}

export class DocsyMissingJsxFunctionError extends DocsyError {
  constructor() {
    super(`Missing global: No JSX function provided, you need a jsx(type, props, key) function to resolve components.`);
  }
}

export class DocsyCannotResolveInjectError extends DocsyError {
  constructor(public docsyNode: Node) {
    super(`Inject content should resolve to string`);
  }
}

DocsyError.ParsingError = DocsyParsingError;
DocsyError.NotImplementedError = DocsyNotImplementedError;
DocsyError.CannotTransformValueError = DocsyCannotTransformValueError;
DocsyError.UnexpectedError = DocsyUnexpectedError;
DocsyError.MissingGlobalError = DocsyMissingGlobalError;
DocsyError.CannotResolveInjectError = DocsyCannotResolveInjectError;
DocsyError.CannotResolveNodeError = DocsyCannotResolveNodeError;
DocsyError.MissingJsxFunctionError = DocsyMissingJsxFunctionError;
DocsyError.CannotSerializeNodeError = DocsyCannotSerializeNodeError;
