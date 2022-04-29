import * as Ast from './Ast';
import * as t from './internal/tokens';
import { DocsyError } from './DocsyError';
import { isReadonlyArray } from './internal/utils';
import { ParserResultBase } from './ParserResult';

export type SerializeOptions = {
  file?: ParserResultBase;
};

export function serialize(item: Ast.Node, options: SerializeOptions = {}): any {
  return serializeNode(item, options);
}

const NODE_SERIALIZER: { [K in Ast.NodeKind]: (item: Ast.Node<K>, options: SerializeOptions) => string } = {
  Document(item, options) {
    return serializeNodes(item.children, options);
  },
  ExpressionDocument(item, options) {
    return (
      serializeWhitespaceLike(item.before, options) +
      serializeNode(item.value, options) +
      serializeWhitespaceLike(item.after, options)
    );
  },
  Whitespace(item) {
    return item.meta.content;
  },
  Identifier(item) {
    return item.meta.name;
  },
  Str(item) {
    if (item.meta.quote === 'Single') {
      return t.SINGLE_QUOTE + item.meta.value.replace(/'/g, `\\'`) + t.SINGLE_QUOTE;
    }
    if (item.meta.quote === 'Double') {
      return t.DOUBLE_QUOTE + item.meta.value.replace(/"/g, `\\"`) + t.DOUBLE_QUOTE;
    }
    if (item.meta.quote === 'Backtick') {
      return t.BACKTICK + item.meta.value.replace(/`/g, '\\`') + t.BACKTICK;
    }
    throw new DocsyError.UnexpectedError(`Invalid Qutote type on Str`);
  },
  Bool(item) {
    return item.meta.value ? 'true' : 'false';
  },
  Num(item) {
    return item.meta.rawValue;
  },
  Null() {
    return `null`;
  },
  Undefined() {
    return `undefined`;
  },
  Arr(item, options) {
    return `[` + serializeNodeOrWhitespaceLike(item.items, options) + `]`;
  },
  ListItems(item, options) {
    return [serializeNodes(item.items, options, ','), serializeNode(item.trailingComma, options)].join('');
  },
  TrailingComma(item, options) {
    return `,` + serializeWhitespaceLike(item.whitespaceAfter, options);
  },
  ListItem(item, options) {
    return [
      serializeWhitespaceLike(item.whitespaceBefore, options),
      serializeNode(item.item, options),
      serializeWhitespaceLike(item.whitespaceAfter, options),
    ].join('');
  },
  Spread(item, options) {
    return `...${serializeNode(item.target, options)}`;
  },
  Obj(item, options) {
    return `{` + serializeNodeOrWhitespaceLike(item.items, options) + `}`;
  },
  ObjItems(item, options) {
    return [serializeNodes(item.properties, options), serializeNode(item.trailingComma, options)].join('');
  },
  ObjItem(item, options) {
    return [
      serializeWhitespaceLike(item.whitespaceBefore, options),
      serializeNode(item.property, options),
      serializeWhitespaceLike(item.whitespaceAfter, options),
    ].join('');
  },
  ObjProperty(item, options) {
    return [
      serializeNode(item.name, options),
      serializeWhitespaceLike(item.whitespaceBeforeColon, options),
      ':',
      serializeWhitespaceLike(item.whitespaceAfterColon, options),
      serializeNode(item.value, options),
    ].join('');
  },
  ObjComputedProperty(item, options) {
    return [
      '[',
      serializeWhitespaceLike(item.whitespaceBeforeExpression, options),
      serializeNode(item.expression, options),
      serializeWhitespaceLike(item.whitespaceAfterExpression, options),
      ']',
      serializeWhitespaceLike(item.whitespaceBeforeColon, options),
      ':',
      serializeWhitespaceLike(item.whitespaceAfterColon, options),
      serializeNode(item.value, options),
    ].join('');
  },
  ObjPropertyShorthand(item, options) {
    return [
      serializeWhitespaceLike(item.whitespaceBefore, options),
      serializeNode(item.name, options),
      serializeWhitespaceLike(item.whitespaceAfter, options),
    ].join('');
  },
  CallExpression(item, options) {
    return serializeNode(item.target, options) + `(${serializeNodeOrWhitespaceLike(item.arguments, options)})`;
  },
  MemberExpression(item, options) {
    return serializeNode(item.target, options) + '.' + serializeNode(item.property, options);
  },
  ComputedMemberExpression(item, options) {
    return serializeNode(item.target, options) + `[${serializeNode(item.property, options)}]`;
  },
  Parenthesis(item, options) {
    return [
      '(',
      serializeWhitespaceLike(item.whitespaceBefore, options),
      serializeNode(item.value, options),
      serializeWhitespaceLike(item.whitespaceAfter, options),
      ')',
    ].join('');
  },
  LineComment(item) {
    return `//${item.meta.content}`;
  },
  BlockComment(item) {
    return `/*${item.meta.content}*/`;
  },
  Element(item, options) {
    return [
      `<|`,
      serializeNode(item.name, options),
      serializeNodes(item.attributes, options),
      serializeWhitespaceLike(item.whitespaceAfterAttributes, options),
      '>',
      serializeNodes(item.children, options),
      item.meta.namedCloseTag ? `<${serializeNode(item.name, options)}/>` : `</>`,
    ].join('');
  },
  RawElement(item, options) {
    return [
      `<#`,
      serializeNode(item.name, options),
      serializeNodes(item.attributes, options),
      serializeWhitespaceLike(item.whitespaceAfterAttributes, options),
      '>',
      item.meta.content,
      item.meta.namedCloseTag ? `<${serializeNode(item.name, options)}/>` : `</>`,
    ].join('');
  },
  SelfClosingElement(item, options) {
    return [
      `</`,
      serializeNode(item.name, options),
      serializeNodes(item.attributes, options),
      serializeWhitespaceLike(item.whitespaceAfterAttributes, options),
      '/>',
    ].join('');
  },
  LineElement(item, options) {
    return [
      `<`,
      serializeNode(item.name, options),
      serializeNodes(item.attributes, options),
      serializeWhitespaceLike(item.whitespaceAfterAttributes, options),
      '>',
      serializeNodes(item.children, options),
    ].join('');
  },
  Fragment(item, options) {
    return `<|>${serializeNodes(item.children, options)}</>`;
  },
  RawFragment(item) {
    return `<#>${item.meta.content}</>`;
  },
  Text(item) {
    return item.meta.content;
  },
  Inject(item, options) {
    return [
      '{',
      serializeWhitespaceLike(item.whitespaceBefore, options),
      serializeNode(item.value, options),
      serializeWhitespaceLike(item.whitespaceAfter, options),
      '}',
    ].join('');
  },
  Attribute(item, options) {
    return [
      serializeWhitespaceLike(item.whitespaceBefore, options),
      serializeNode(item.name, options),
      item.value ? `=${serializeNode(item.value, options)}` : '',
    ].join('');
  },
  ElementNameMember(item, options) {
    return serializeNode(item.target, options) + '.' + serializeNode(item.property, options);
  },
};

// -- Utils

function serializeNode(item: Ast.Node | undefined | null, options: SerializeOptions): any {
  if (item === undefined || item === null) {
    return '';
  }
  const serializer = NODE_SERIALIZER[item.kind] as any;
  if (serializer === undefined) {
    throw new DocsyError.CannotSerializeNode(options.file, item, `Invalid node kind: ${item.kind}`);
  }
  return serializer(item, options);
}

function serializeNodes(items: null | ReadonlyArray<Ast.Node>, options: SerializeOptions, joiner: string = ''): string {
  if (!items || items.length === 0) {
    return '';
  }
  return items.map((sub) => serializeNode(sub, options)).join(joiner);
}

function serializeWhitespaceLike(whitespace: Ast.WhitespaceLike | undefined, options: SerializeOptions): string {
  if (whitespace === undefined) {
    return '';
  }
  if (isReadonlyArray(whitespace)) {
    return whitespace.map((item) => serializeNode(item, options)).join('');
  }
  return serializeNode(whitespace, options);
}

function serializeNodeOrWhitespaceLike(
  item: Ast.Node | Ast.WhitespaceLike | undefined,
  options: SerializeOptions
): string {
  if (item === undefined) {
    return '';
  }
  if (isReadonlyArray(item)) {
    return serializeWhitespaceLike(item, options);
  }
  if (Ast.NodeIs.ObjItems(item)) {
    item.properties;
    return (
      item.properties.map((item) => serializeNode(item, options)).join(',') + serializeNode(item.trailingComma, options)
    );
  }
  return serializeNode(item, options);
}
