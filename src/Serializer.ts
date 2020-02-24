import { Node, NodeIs, Prop, ObjectItem, Expression, Children } from './Node';
import { SINGLE_QUOTE, DOUBLE_QUOTE, BACKTICK, MORE_THAN_ONE_NEW_LINE } from './constants';

export function serialize(node: Node): string {
  return serializeInternal(node);

  function serializeInternal(item: Node): string {
    if (NodeIs.Document(item)) {
      return serializeChildren(item.children) + '\n';
    }
    if (NodeIs.Text(item)) {
      return item.content;
    }
    if (NodeIs.Element(item)) {
      return serializeElement(item);
    }
    if (NodeIs.EmptyLine(item)) {
      return '\n';
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
      return String(item.value);
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
    throw new Error(`Unsuported node ${item.type}`);
  }

  function serializeElement(elem: Node<'Element'>): string {
    let childrenStr = serializeChildren(elem.children);
    if (elem.children && elem.children.length) {
      if (elem.children[0].type !== 'Text') {
        childrenStr = '\n' + childrenStr;
      }
      if (elem.children[elem.children.length - 1].type !== 'Text') {
        childrenStr = childrenStr + '\n';
      }
    }
    return [
      `<|`,
      serializeInternal(elem.component),
      serializeProps(elem.props),
      childrenStr.length === 0
        ? '|>'
        : '>' +
          childrenStr +
          (childrenStr.match(MORE_THAN_ONE_NEW_LINE)
            ? `<${serializeInternal(elem.component)}|>`
            : `|>`),
    ].join('');
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
    return items.reduce<string>((acc, item, index, arr) => {
      if (index === 0) {
        return serializeInternal(item);
      }
      // add \n if two children do not start / end with one
      const prev = arr[index - 1];
      const prevIsText = prev.type === 'Text' || prev.type === 'EmptyLine';
      const itemIsText = item.type === 'Text';

      if (!prevIsText && !itemIsText) {
        return acc + '\n' + serializeInternal(item);
      }
      return acc + serializeInternal(item);
    }, '');
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
