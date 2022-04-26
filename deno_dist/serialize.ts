import * as Ast from './Ast.ts';
import { DocsyError } from './DocsyError.ts';
import * as t from './internal/tokens.ts';

export function serialize(node: Ast.Node): string {
  return serializeInternal(node);

  function serializeInternal(item: Array<Ast.Node> | Ast.Node | null | undefined): string {
    if (item === null || item === undefined) {
      return '';
    }
    if (Array.isArray(item)) {
      return item.map(serializeInternal).join('');
    }
    if (Ast.NodeIs.Document(item)) {
      return serializeChildren(item.children);
    }
    if (Ast.NodeIs.ExpressionDocument(item)) {
      return (
        serializeWhitespaceLike(item.children.before) +
        serializeInternal(item.children.value) +
        serializeWhitespaceLike(item.children.after)
      );
    }
    if (Ast.NodeIs.Whitespace(item)) {
      return item.meta.content;
    }
    if (Ast.NodeIs.Identifier(item)) {
      return item.meta.name;
    }
    if (Ast.NodeIs.Str(item)) {
      return serializeString(item);
    }
    if (Ast.NodeIs.Obj(item)) {
      return serializeObj(item);
    }
    if (Ast.NodeIs.Arr(item)) {
      return serializeArr(item);
    }
    if (Ast.NodeIs.ListItems(item)) {
      return (
        item.children.items.map((item) => serializeInternal(item)).join(',') +
        (item.children.trailingComma ? serializeInternal(item.children.trailingComma) : '')
      );
    }
    if (Ast.NodeIs.ListItem(item)) {
      return (
        serializeWhitespaceLike(item.children.whitespaceBefore) +
        serializeInternal(item.children.item) +
        serializeWhitespaceLike(item.children.whitespaceAfter)
      );
    }
    if (Ast.NodeIs.TrailingComma(item)) {
      return `,${serializeWhitespaceLike(item.children.whitespaceAfter)}`;
    }
    if (Ast.NodeIs.Bool(item)) {
      return item.meta.value ? 'true' : 'false';
    }
    if (Ast.NodeIs.Num(item)) {
      return item.meta.rawValue;
    }
    if (Ast.NodeIs.Null(item)) {
      return `null`;
    }
    if (Ast.NodeIs.MemberExpression(item)) {
      return serializeInternal(item.children.target) + '.' + serializeInternal(item.children.property);
    }
    if (Ast.NodeIs.ComputedMemberExpression(item)) {
      return serializeInternal(item.children.target) + `[${serializeInternal(item.children.property)}]`;
    }
    if (Ast.NodeIs.CallExpression(item)) {
      return serializeInternal(item.children.target) + `(${serializeInternal(item.children.arguments)})`;
    }
    if (Ast.NodeIs.ElementNameMember(item)) {
      return serializeInternal(item.children.target) + '.' + serializeInternal(item.children.property);
    }
    if (Ast.NodeIs.AnyComment(item)) {
      return serializeChild(item);
    }
    throw new DocsyError.CannotSerializeNodeError(item, `serializer not implemented`);
  }

  function serializeElement(elem: Ast.Element): string {
    const childrenStr = serializeChildren(elem.children.children);
    return [
      `<|`,
      serializeInternal(elem.children.name),
      serializeAttributes(elem.children.attributes),
      serializeInternal(elem.children.whitespaceAfterAttributes),
      '>',
      childrenStr,
      elem.meta.namedCloseTag ? `<${serializeInternal(elem.children.name)}/>` : `</>`,
    ].join('');
  }

  function serializeLineElement(elem: Ast.LineElement): string {
    const childrenStr = serializeChildren(elem.children.children);
    return [
      `<`,
      serializeInternal(elem.children.name),
      serializeAttributes(elem.children.attributes),
      serializeInternal(elem.children.whitespaceAfterAttributes),
      '>',
      childrenStr,
    ].join('');
  }

  function serializeRawElement(elem: Ast.RawElement): string {
    return [
      `<#`,
      serializeInternal(elem.children.name),
      serializeAttributes(elem.children.attributes),
      serializeInternal(elem.children.whitespaceAfterAttributes),
      '>',
      elem.meta.content,
      elem.meta.namedCloseTag ? `<${serializeInternal(elem.children.name)}/>` : `</>`,
    ].join('');
  }

  function serializeSelfClosingElement(elem: Ast.SelfClosingElement): string {
    return [
      `</`,
      serializeInternal(elem.children.name),
      serializeAttributes(elem.children.attributes),
      serializeInternal(elem.children.whitespaceAfterAttributes),
      '/>',
    ].join('');
  }

  function serializeObj(item: Ast.Obj): string {
    return `{` + serializeObjItems(item.children.items) + `}`;
  }

  function serializeObjItems(item: Ast.ObjItems | Ast.WhitespaceLike | undefined): string {
    if (item === undefined) {
      return '';
    }
    if (Array.isArray(item)) {
      return serializeWhitespaceLike(item);
    }
    if (Ast.NodeIs.ObjItems(item)) {
      item.children.properties;
      return (
        item.children.properties.map((item) => serializeObjItem(item)).join(',') +
        (item.children.trailingComma ? serializeInternal(item.children.trailingComma) : '')
      );
    }
    return serializeWhitespaceLike(item);
  }

  function serializeObjItem(item: Ast.ObjItem): string {
    return [
      serializeWhitespaceLike(item.children.whitespaceBefore),
      serializeAnyObjProperty(item.children.property),
      serializeWhitespaceLike(item.children.whitespaceAfter),
    ].join('');
  }

  function serializeAnyObjProperty(prop: Ast.AnyObjProperty): string {
    if (Ast.NodeIs.ObjProperty(prop)) {
      return [
        serializeInternal(prop.children.name),
        serializeWhitespaceLike(prop.children.whitespaceBeforeColon),
        ':',
        serializeWhitespaceLike(prop.children.whitespaceAfterColon),
        serializeInternal(prop.children.value),
      ].join('');
    }
    if (Ast.NodeIs.ObjComputedProperty(prop)) {
      return [
        '[',
        serializeWhitespaceLike(prop.children.whitespaceBeforeExpression),
        serializeInternal(prop.children.expression),
        serializeWhitespaceLike(prop.children.whitespaceAfterExpression),
        ']',
        serializeWhitespaceLike(prop.children.whitespaceBeforeColon),
        ':',
        serializeWhitespaceLike(prop.children.whitespaceAfterColon),
        serializeInternal(prop.children.value),
      ].join('');
    }
    if (Ast.NodeIs.ObjPropertyShorthand(prop)) {
      return [
        serializeWhitespaceLike(prop.children.whitespaceBefore),
        serializeInternal(prop.children.name),
        serializeWhitespaceLike(prop.children.whitespaceAfter),
      ].join('');
    }
    if (Ast.NodeIs.Spread(prop)) {
      return `...${serializeInternal(prop.children.target)}`;
    }
    throw new DocsyError.CannotSerializeNodeError(prop, `Invalid property`);
  }

  function serializeArr(item: Ast.Arr): string {
    return `[` + serializeInternal(item.children.items) + `]`;
  }

  // function serializeListItems(items: Array<Ast.ListItem> | Ast.Whitespace | undefined): string {
  //   if (items === undefined) {
  //     return '';
  //   }
  //   if (Array.isArray(items)) {
  //     return items
  //       .map((objectItem) => {
  //         return (
  //           serializeInternal(objectItem.children.whitespaceBefore) +
  //           serializeInternal(objectItem.children.item) +
  //           serializeInternal(objectItem.children.whitespaceAfter)
  //         );
  //       })
  //       .join(',');
  //   }
  //   return serializeInternal(items);
  // }

  // function serializeArguments(items: Array<Ast.ListItem> | Ast.Whitespace | undefined): string {
  //   if (items === undefined) {
  //     return '()';
  //   }
  //   if (Array.isArray(items)) {
  //     return `(` + items.map(serializeInternal).join(',') + `)`;
  //   }
  //   return `(` + serializeInternal(items) + `)`;
  // }

  // function serializeAnyObjProperty(item: Ast.AnyObjProperty): string {
  //   if (Ast.NodeIs.ObjProperty(item)) {
  //     return serializeInternal(item.children.name) + ': ' + serializeInternal(item.children.value);
  //   }
  //   if (Ast.NodeIs.ObjComputedProperty(item)) {
  //     return `[${serializeInternal(item.children.expression)}]: ${serializeInternal(item.children.value)}`;
  //   }
  //   if (Ast.NodeIs.ObjPropertyShorthand(item)) {
  //     return serializeInternal(item.children.name);
  //   }
  //   if (Ast.NodeIs.Spread(item)) {
  //     return `...${serializeInternal(item.children.target)}`;
  //   }
  //   throw new DocsyError.CannotSerializeNodeError(item, `serializer not implemented`);
  // }

  function serializeWhitespaceLike(whitespace: Ast.WhitespaceLike | undefined): string {
    if (whitespace === undefined) {
      return '';
    }
    if (Array.isArray(whitespace)) {
      return whitespace.map(serializeInternal).join('');
    }
    return serializeInternal(whitespace);
  }

  function serializeString(item: Ast.Str) {
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
  }

  function serializeChildren(items: null | Array<Ast.Child>): string {
    if (!items || items.length === 0) {
      return '';
    }
    return items.map((sub) => serializeChild(sub)).join('');
  }

  function serializeChild(item: Ast.Child): string {
    if (Ast.NodeIs.Whitespace(item)) {
      return item.meta.content;
    }
    if (Ast.NodeIs.Text(item)) {
      return item.meta.content;
    }
    if (Ast.NodeIs.Inject(item)) {
      return (
        '{' +
        serializeInternal(item.children.whitespaceBefore) +
        serializeInternal(item.children.value) +
        serializeInternal(item.children.whitespaceAfter) +
        '}'
      );
    }
    if (Ast.NodeIs.Element(item)) {
      return serializeElement(item);
    }
    if (Ast.NodeIs.RawElement(item)) {
      return serializeRawElement(item);
    }
    if (Ast.NodeIs.Fragment(item)) {
      return `<|>${serializeChildren(item.children)}</>`;
    }
    if (Ast.NodeIs.RawFragment(item)) {
      return `<#>${item.meta.content}</>`;
    }
    if (Ast.NodeIs.SelfClosingElement(item)) {
      return serializeSelfClosingElement(item);
    }
    if (Ast.NodeIs.LineElement(item)) {
      return serializeLineElement(item);
    }
    if (Ast.NodeIs.AnyComment(item)) {
      return serializeComment(item);
    }
    throw new DocsyError.CannotSerializeNodeError(item, `serializer not implemented`);
  }

  function serializeComment(item: Ast.AnyComment): string {
    if (Ast.NodeIs.LineComment(item)) {
      return `//${item.meta.content}`;
    }
    if (Ast.NodeIs.BlockComment(item)) {
      return `/*${item.meta.content}*/`;
    }
    throw new DocsyError.CannotSerializeNodeError(item, `serializer not implemented`);
  }

  function serializeAttributes(attributes: Array<Ast.Attribute>): string {
    return attributes.map((attr) => serializeAttribute(attr)).join('');
  }

  function serializeAttribute(attr: Ast.Attribute): string {
    if (attr.children.value === undefined) {
      return serializeInternal(attr.children.whitespaceBefore) + serializeInternal(attr.children.name);
    }
    return (
      serializeInternal(attr.children.whitespaceBefore) +
      `${serializeInternal(attr.children.name)}=${serializeInternal(attr.children.value)}`
    );
  }
}
