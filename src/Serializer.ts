import { Node, NodeIs, Prop, ObjectItem, Expression, Children } from './utils/Node';
import { SINGLE_QUOTE, DOUBLE_QUOTE, BACKTICK } from './utils/constants';

export function serialize(node: Node): string {
  return serializeInternal(node);

  function serializeInternal(item: Node): string {
    if (NodeIs.Document(item)) {
      return serializeChildren(item.children);
    }
    if (NodeIs.Text(item)) {
      return item.content;
    }
    if (NodeIs.Element(item)) {
      return serializeElement(item);
    }
    if (NodeIs.SelfClosingElement(item)) {
      return serializeSelfClosingElement(item);
    }
    if (NodeIs.Identifier(item)) {
      return item.name;
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
    if (NodeIs.Bool(item)) {
      return item.value ? 'true' : 'false';
    }
    if (NodeIs.Num(item)) {
      return item.rawValue;
    }
    if (NodeIs.Null(item)) {
      return `null`;
    }
    if (NodeIs.DotMember(item)) {
      return serializeInternal(item.target) + '.' + serializeInternal(item.property);
    }
    if (NodeIs.FunctionCall(item)) {
      return serializeInternal(item.target) + serializeArguments(item.arguments);
    }
    if (NodeIs.ElementTypeMember(item)) {
      return serializeInternal(item.target) + '.' + serializeInternal(item.property);
    }
    if (NodeIs.LineComment(item)) {
      // should not add \n if eof
      return `//${item.content}\n`;
    }
    if (NodeIs.BlockComment(item)) {
      return `/*${item.content}*/`;
    }
    throw new Error(`Unsuported node ${item.type}`);
  }

  function serializeElement(elem: Node<'Element'>): string {
    let childrenStr = serializeChildren(elem.children);
    return [
      `<|`,
      serializeInternal(elem.component),
      serializeProps(elem.props),
      '>',
      childrenStr,
      elem.namedCloseTag ? `<${serializeInternal(elem.component)}|>` : `|>`,
    ].join('');
  }

  function serializeSelfClosingElement(elem: Node<'SelfClosingElement'>): string {
    return [`<|`, serializeInternal(elem.component), serializeProps(elem.props), '|>'].join('');
  }

  function serializeObject(item: Node<'Object'>): string {
    return `{ ` + item.items.map(serializeObjectItem).join(', ') + ` }`;
  }

  function serializeArray(item: Node<'Array'>): string {
    return `[` + item.items.map(serializeInternal).join(', ') + `]`;
  }

  function serializeArguments(items: Array<Expression>): string {
    return `(` + items.map(serializeInternal).join(', ') + `)`;
  }

  function serializeObjectItem(item: ObjectItem): string {
    if (NodeIs.Spread(item)) {
      return `...${serializeInternal(item.target)}`;
    }
    if (NodeIs.PropertyShorthand(item)) {
      return serializeInternal(item.name);
    }
    if (NodeIs.Property(item)) {
      return serializeInternal(item.name) + ': ' + serializeInternal(item.value);
    }
    if (NodeIs.ComputedProperty(item)) {
      return `[${serializeInternal(item.expression)}]: ${serializeInternal(item.value)}`;
    }
    throw new Error(`Unsuported node ${(item as any).type}`);
  }

  function serializeString(item: Node<'Str'>) {
    const hasSingle = item.value.indexOf(SINGLE_QUOTE) >= 0;
    // remove quote char
    if (!hasSingle) {
      return `'${item.value}'`;
    }
    const hasDouble = item.value.indexOf(DOUBLE_QUOTE) >= 0;
    if (!hasDouble) {
      return `"${item.value}"`;
    }
    const hasBacktick = item.value.indexOf(BACKTICK) >= 0;
    if (!hasBacktick) {
      return '`' + item.value + '`';
    }
    return `'${item.value.replace(/'/g, `\\'`)}'`;
  }

  function serializeChildren(items: null | Array<Children>): string {
    if (!items || items.length === 0) {
      return '';
    }
    return items.map(sub => serializeInternal(sub)).join('');
  }

  function serializeProps(props: Array<Prop>): string {
    if (props.length === 0) {
      return '';
    }
    return (
      ' ' +
      props
        .map(prop => {
          if (NodeIs.Prop(prop)) {
            return `${serializeInternal(prop.name)}=${serializeInternal(prop.value)}`;
          }
          if (NodeIs.NoValueProp(prop)) {
            return `${serializeInternal(prop.name)}`;
          }
          throw new Error(`Unsuported ${(prop as any).type}`);
        })
        .join(' ')
    );
  }
}
