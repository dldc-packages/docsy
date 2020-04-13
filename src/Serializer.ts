import { Node, NodeIs, ObjectItem, Children, ArrayItem } from './utils/Node';
import { SINGLE_QUOTE, DOUBLE_QUOTE, BACKTICK } from './utils/constants';

const COMMONT_TYPE = ['LineComment', 'BlockComment'] as const;

const CHILDREN_TYPE = [
  ...COMMONT_TYPE,
  'Text',
  'Element',
  'SelfClosingElement',
  'Fragment',
  'RawFragment',
  'RawElement',
] as const;

export const DocsySerializer = {
  serialize,
};

function serialize(node: Node): string {
  return serializeInternal(node);

  function serializeInternal(item: Node): string {
    if (NodeIs.Document(item)) {
      return serializeChildren(item.children, false);
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
    if (NodeIs.BracketMember(item)) {
      return serializeInternal(item.target) + `[${serializeInternal(item.property)}]`;
    }
    if (NodeIs.FunctionCall(item)) {
      return serializeInternal(item.target) + serializeArguments(item.arguments);
    }
    if (NodeIs.ElementTypeMember(item)) {
      return serializeInternal(item.target) + '.' + serializeInternal(item.property);
    }
    if (NodeIs.oneOf(item, CHILDREN_TYPE)) {
      return serializeChild(item, false);
    }
    throw new Error(`Unsuported node ${item.type}`);
  }

  function serializeElement(elem: Node<'Element'>): string {
    let childrenStr = serializeChildren(elem.children, false);
    return [
      `<|`,
      serializeInternal(elem.component),
      serializeProps(elem.props),
      '>',
      childrenStr,
      elem.namedCloseTag ? `<${serializeInternal(elem.component)}|>` : `|>`,
    ].join('');
  }

  function serializeRawElement(elem: Node<'RawElement'>): string {
    let childrenStr = serializeChildren(elem.children, true);
    return [
      `<#`,
      serializeInternal(elem.component),
      serializeProps(elem.props),
      '>',
      childrenStr,
      elem.namedCloseTag ? `<${serializeInternal(elem.component)}#>` : `#>`,
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

  function serializeArguments(items: Array<ArrayItem>): string {
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
    if (item.quote === 'Single') {
      return SINGLE_QUOTE + item.value.replace(/'/g, `\\'`) + SINGLE_QUOTE;
    }
    if (item.quote === 'Double') {
      return DOUBLE_QUOTE + item.value.replace(/"/g, `\\"`) + DOUBLE_QUOTE;
    }
    if (item.quote === 'Backtick') {
      return BACKTICK + item.value.replace(/`/g, '\\`') + BACKTICK;
    }
    throw new Error(`Invalid Qutote type on Str`);
  }

  function serializeChildren(items: null | Array<Children>, isInRaw: boolean): string {
    if (!items || items.length === 0) {
      return '';
    }
    return items.map(sub => serializeChild(sub, isInRaw)).join('');
  }

  function serializeChild(item: Children, isInRaw: boolean): string {
    if (NodeIs.Text(item)) {
      return item.content;
    }
    if (NodeIs.Element(item)) {
      return serializeElement(item);
    }
    if (NodeIs.RawElement(item)) {
      return serializeRawElement(item);
    }
    if (NodeIs.Fragment(item)) {
      if (isInRaw) {
        return `<#>${serializeChildren(item.children, false)}<#>`;
      }
      return `<|>${serializeChildren(item.children, false)}<|>`;
    }
    if (NodeIs.RawFragment(item)) {
      return `<#>${serializeChildren(item.children, false)}<#>`;
    }
    if (NodeIs.SelfClosingElement(item)) {
      return serializeSelfClosingElement(item);
    }
    if (NodeIs.oneOf(item, COMMONT_TYPE)) {
      return serializeComment(item);
    }
    throw new Error(`Unsuported node ${item.type}`);
  }

  function serializeComment(item: Node<'BlockComment' | 'LineComment'>): string {
    if (NodeIs.LineComment(item)) {
      // TODO: should not add \n if eof
      return `//${item.content}\n`;
    }
    if (NodeIs.BlockComment(item)) {
      return `/*${item.content}*/`;
    }
    throw new Error(`Unsuported node ${item.type}`);
  }

  function serializeProps(props: Node<'Props'>): string {
    return (
      (props.whitespace || '') +
      props.items
        .map(prop => {
          const whitespace = prop.whitespace || '';
          if (NodeIs.Prop(prop)) {
            return `${serializeInternal(prop.name)}=${serializeInternal(prop.value)}` + whitespace;
          }
          if (NodeIs.NoValueProp(prop)) {
            return `${serializeInternal(prop.name)}` + whitespace;
          }
          if (NodeIs.PropLineComment(prop)) {
            return `//${prop.content}\n` + whitespace;
          }
          if (NodeIs.PropBlockComment(prop)) {
            return `/*${prop.content}*/` + whitespace;
          }
          throw new Error(`Unsuported ${(prop as any).type}`);
        })
        .join('')
    );
  }
}
