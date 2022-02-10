import { Node, NodeIs, Child, ObjectPart, Prop, RawChild, AnyComment } from './Ast';
import { DocsyError } from './DocsyError';

const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const BACKTICK = '`';

export const DocsySerializer = {
  serialize,
};

function serialize(node: Node): string {
  return serializeInternal(node);

  function serializeInternal(item: Node | null): string {
    if (item === null) {
      return '';
    }
    if (NodeIs.Document(item)) {
      return serializeChildren(item.children);
    }
    if (NodeIs.ExpressionDocument(item)) {
      return (
        item.children.before.map(serializeInternal).join('') +
        serializeInternal(item.children.value) +
        item.children.after.map(serializeInternal).join('')
      );
    }
    if (NodeIs.Whitespace(item)) {
      return item.meta.content;
    }
    if (NodeIs.Identifier(item)) {
      return item.meta.name;
    }
    if (NodeIs.Str(item)) {
      return serializeString(item);
    }
    if (NodeIs.Object(item)) {
      return serializeObject(item);
    }
    if (NodeIs.Array(item)) {
      return serializeArray(item);
    }
    if (NodeIs.ArrayItem(item)) {
      return (
        serializeInternal(item.children.whitespaceBefore) +
        serializeInternal(item.children.item) +
        serializeInternal(item.children.whitespaceAfter)
      );
    }
    if (NodeIs.Bool(item)) {
      return item.meta.value ? 'true' : 'false';
    }
    if (NodeIs.Num(item)) {
      return item.meta.rawValue;
    }
    if (NodeIs.Null(item)) {
      return `null`;
    }
    if (NodeIs.DotMember(item)) {
      return serializeInternal(item.children.target) + '.' + serializeInternal(item.children.property);
    }
    if (NodeIs.BracketMember(item)) {
      return serializeInternal(item.children.target) + `[${serializeInternal(item.children.property)}]`;
    }
    if (NodeIs.FunctionCall(item)) {
      return serializeInternal(item.children.target) + serializeArguments(item.children.arguments);
    }
    if (NodeIs.ElementTypeMember(item)) {
      return serializeInternal(item.children.target) + '.' + serializeInternal(item.children.property);
    }
    if (NodeIs.AnyComment(item)) {
      return serializeChild(item);
    }
    throw new DocsyError.CannotSerializeNodeError(item, `serializer not implemented`);
  }

  function serializeElement(elem: Node<'Element'>): string {
    const childrenStr = serializeChildren(elem.children.children);
    return [
      `<|`,
      serializeInternal(elem.children.component),
      serializeProps(elem.children.props),
      '>',
      childrenStr,
      elem.meta.namedCloseTag ? `<${serializeInternal(elem.children.component)}|>` : `|>`,
    ].join('');
  }

  function serializeRawElement(elem: Node<'RawElement'>): string {
    const childrenStr = serializeRawChildren(elem.children.children);
    return [
      `<#`,
      serializeInternal(elem.children.component),
      serializeProps(elem.children.props),
      '>',
      childrenStr,
      elem.meta.namedCloseTag ? `<${serializeInternal(elem.children.component)}#>` : `#>`,
    ].join('');
  }

  function serializeSelfClosingElement(elem: Node<'SelfClosingElement'>): string {
    return [`<|`, serializeInternal(elem.children.component), serializeProps(elem.children.props), '|>'].join('');
  }

  function serializeObject(item: Node<'Object'>): string {
    return (
      `{` +
      item.children.items
        .map((objectItem) => {
          return (
            serializeInternal(objectItem.children.whitespaceBefore) +
            serializeObjectPart(objectItem.children.item) +
            serializeInternal(objectItem.children.whitespaceAfter)
          );
        })
        .join(',') +
      `}`
    );
  }

  function serializeArray(item: Node<'Array'>): string {
    return `[` + item.children.items.map(serializeInternal).join(',') + `]`;
  }

  function serializeArguments(items: Array<Node<'ArrayItem'>>): string {
    return `(` + items.map(serializeInternal).join(',') + `)`;
  }

  function serializeObjectPart(item: ObjectPart): string {
    if (NodeIs.Spread(item)) {
      return `...${serializeInternal(item.children.target)}`;
    }
    if (NodeIs.PropertyShorthand(item)) {
      return serializeInternal(item.children.name);
    }
    if (NodeIs.Property(item)) {
      return serializeInternal(item.children.name) + ': ' + serializeInternal(item.children.value);
    }
    if (NodeIs.ComputedProperty(item)) {
      return `[${serializeInternal(item.children.expression)}]: ${serializeInternal(item.children.value)}`;
    }
    throw new DocsyError.CannotSerializeNodeError(item, `serializer not implemented`);
  }

  function serializeString(item: Node<'Str'>) {
    if (item.meta.quote === 'Single') {
      return SINGLE_QUOTE + item.meta.value.replace(/'/g, `\\'`) + SINGLE_QUOTE;
    }
    if (item.meta.quote === 'Double') {
      return DOUBLE_QUOTE + item.meta.value.replace(/"/g, `\\"`) + DOUBLE_QUOTE;
    }
    if (item.meta.quote === 'Backtick') {
      return BACKTICK + item.meta.value.replace(/`/g, '\\`') + BACKTICK;
    }
    throw new DocsyError.UnexpectedError(`Invalid Qutote type on Str`);
  }

  function serializeRawChildren(items: null | Array<RawChild>): string {
    if (!items || items.length === 0) {
      return '';
    }
    return items.map((item) => serializeRawChild(item)).join('');
  }

  function serializeChildren(items: null | Array<Child>): string {
    if (!items || items.length === 0) {
      return '';
    }
    return items.map((sub) => serializeChild(sub)).join('');
  }

  function serializeRawChild(item: RawChild): string {
    if (NodeIs.RawText(item)) {
      return item.meta.content;
    }
    if (NodeIs.UnrawFragment(item)) {
      return `<#>${serializeChildren(item.children)}<#>`;
    }
    throw new DocsyError.CannotSerializeNodeError(item, `serializer not implemented`);
  }

  function serializeChild(item: Child): string {
    if (NodeIs.Whitespace(item)) {
      return item.meta.content;
    }
    if (NodeIs.Text(item)) {
      return item.meta.content;
    }
    if (NodeIs.Inject(item)) {
      return (
        '{' +
        serializeInternal(item.children.whitespaceBefore) +
        serializeInternal(item.children.value) +
        serializeInternal(item.children.whitespaceAfter) +
        '}'
      );
    }
    if (NodeIs.Element(item)) {
      return serializeElement(item);
    }
    if (NodeIs.RawElement(item)) {
      return serializeRawElement(item);
    }
    if (NodeIs.Fragment(item)) {
      return `<|>${serializeChildren(item.children)}<|>`;
    }
    if (NodeIs.RawFragment(item)) {
      return `<#>${serializeRawChildren(item.children)}<#>`;
    }
    if (NodeIs.SelfClosingElement(item)) {
      return serializeSelfClosingElement(item);
    }
    if (NodeIs.AnyComment(item)) {
      return serializeComment(item);
    }
    throw new DocsyError.CannotSerializeNodeError(item, `serializer not implemented`);
  }

  function serializeComment(item: AnyComment): string {
    if (NodeIs.LineComment(item)) {
      // TODO: should not add \n if eof
      return `//${item.meta.content}\n`;
    }
    if (NodeIs.BlockComment(item)) {
      return `/*${item.meta.content}*/`;
    }
    throw new DocsyError.CannotSerializeNodeError(item, `serializer not implemented`);
  }

  function serializeProps(props: Node<'Props'>): string {
    return (
      props.children.items
        .map((prop) => {
          return serializeInternal(prop.children.whitespaceBefore) + serializeProp(prop.children.item);
        })
        .join('') + serializeInternal(props.children.whitespaceAfter)
    );
  }

  function serializeProp(prop: Prop): string {
    if (NodeIs.PropValue(prop)) {
      return `${serializeInternal(prop.children.name)}=${serializeInternal(prop.children.value)}`;
    }
    if (NodeIs.PropNoValue(prop)) {
      return `${serializeInternal(prop.children.name)}`;
    }
    if (NodeIs.PropLineComment(prop)) {
      return `//${prop.meta.content}\n`;
    }
    if (NodeIs.PropBlockComment(prop)) {
      return `/*${prop.meta.content}*/`;
    }
    throw new DocsyError.CannotSerializeNodeError(prop, `serializer not implemented`);
  }
}
