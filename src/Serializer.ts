import { Node, NodeIs, Child, ObjectPart, Prop } from './internal/Node';
import { SINGLE_QUOTE, DOUBLE_QUOTE, BACKTICK } from './internal/constants';

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

  function serializeInternal(item: Node | null): string {
    if (item === null) {
      return '';
    }
    if (NodeIs.Document(item)) {
      return serializeChildren(item.nodes.children, false);
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
        serializeInternal(item.nodes.whitespaceBefore) +
        serializeInternal(item.nodes.item) +
        serializeInternal(item.nodes.whitespaceAfter)
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
      return serializeInternal(item.nodes.target) + '.' + serializeInternal(item.nodes.property);
    }
    if (NodeIs.BracketMember(item)) {
      return serializeInternal(item.nodes.target) + `[${serializeInternal(item.nodes.property)}]`;
    }
    if (NodeIs.FunctionCall(item)) {
      return serializeInternal(item.nodes.target) + serializeArguments(item.nodes.arguments);
    }
    if (NodeIs.ElementTypeMember(item)) {
      return serializeInternal(item.nodes.target) + '.' + serializeInternal(item.nodes.property);
    }
    if (NodeIs.oneOf(item, CHILDREN_TYPE)) {
      return serializeChild(item, false);
    }
    throw new Error(`Unsuported node ${item.type}`);
  }

  function serializeElement(elem: Node<'Element'>): string {
    let childrenStr = serializeChildren(elem.nodes.children, false);
    return [
      `<|`,
      serializeInternal(elem.nodes.component),
      serializeProps(elem.nodes.props),
      '>',
      childrenStr,
      elem.meta.namedCloseTag ? `<${serializeInternal(elem.nodes.component)}|>` : `|>`,
    ].join('');
  }

  function serializeRawElement(elem: Node<'RawElement'>): string {
    let childrenStr = serializeChildren(elem.nodes.children, true);
    return [
      `<#`,
      serializeInternal(elem.nodes.component),
      serializeProps(elem.nodes.props),
      '>',
      childrenStr,
      elem.meta.namedCloseTag ? `<${serializeInternal(elem.nodes.component)}#>` : `#>`,
    ].join('');
  }

  function serializeSelfClosingElement(elem: Node<'SelfClosingElement'>): string {
    return [
      `<|`,
      serializeInternal(elem.nodes.component),
      serializeProps(elem.nodes.props),
      '|>',
    ].join('');
  }

  function serializeObject(item: Node<'Object'>): string {
    return (
      `{` +
      item.nodes.items
        .map((objectItem) => {
          return (
            serializeInternal(objectItem.nodes.whitespaceBefore) +
            serializeObjectPart(objectItem.nodes.item) +
            serializeInternal(objectItem.nodes.whitespaceAfter)
          );
        })
        .join(',') +
      `}`
    );
  }

  function serializeArray(item: Node<'Array'>): string {
    return `[` + item.nodes.items.map(serializeInternal).join(',') + `]`;
  }

  function serializeArguments(items: Array<Node<'ArrayItem'>>): string {
    return `(` + items.map(serializeInternal).join(',') + `)`;
  }

  function serializeObjectPart(item: ObjectPart): string {
    if (NodeIs.Spread(item)) {
      return `...${serializeInternal(item.nodes.target)}`;
    }
    if (NodeIs.PropertyShorthand(item)) {
      return serializeInternal(item.nodes.name);
    }
    if (NodeIs.Property(item)) {
      return serializeInternal(item.nodes.name) + ': ' + serializeInternal(item.nodes.value);
    }
    if (NodeIs.ComputedProperty(item)) {
      return `[${serializeInternal(item.nodes.expression)}]: ${serializeInternal(
        item.nodes.value
      )}`;
    }
    throw new Error(`Unsuported node ${(item as any).type}`);
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
    throw new Error(`Invalid Qutote type on Str`);
  }

  function serializeChildren(items: null | Array<Child>, isInRaw: boolean): string {
    if (!items || items.length === 0) {
      return '';
    }
    return items.map((sub) => serializeChild(sub, isInRaw)).join('');
  }

  function serializeChild(item: Child, isInRaw: boolean): string {
    if (NodeIs.Whitespace(item)) {
      return item.meta.content;
    }
    if (NodeIs.Text(item)) {
      return item.meta.content;
    }
    if (NodeIs.Inject(item)) {
      return (
        '{' +
        serializeInternal(item.nodes.whitespaceBefore) +
        serializeInternal(item.nodes.value) +
        serializeInternal(item.nodes.whitespaceAfter) +
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
      if (isInRaw) {
        return `<#>${serializeChildren(item.nodes.children, false)}<#>`;
      }
      return `<|>${serializeChildren(item.nodes.children, false)}<|>`;
    }
    if (NodeIs.RawFragment(item)) {
      return `<#>${serializeChildren(item.nodes.children, false)}<#>`;
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
      return `//${item.meta.content}\n`;
    }
    if (NodeIs.BlockComment(item)) {
      return `/*${item.meta.content}*/`;
    }
    throw new Error(`Unsuported node ${item.type}`);
  }

  function serializeProps(props: Node<'Props'>): string {
    return (
      props.nodes.items
        .map((prop) => {
          return serializeInternal(prop.nodes.whitespaceBefore) + serializeProp(prop.nodes.item);
        })
        .join('') + serializeInternal(props.nodes.whitespaceAfter)
    );
  }

  function serializeProp(prop: Prop): string {
    if (NodeIs.PropValue(prop)) {
      return `${serializeInternal(prop.nodes.name)}=${serializeInternal(prop.nodes.value)}`;
    }
    if (NodeIs.PropNoValue(prop)) {
      return `${serializeInternal(prop.nodes.name)}`;
    }
    if (NodeIs.PropLineComment(prop)) {
      return `//${prop.meta.content}\n`;
    }
    if (NodeIs.PropBlockComment(prop)) {
      return `/*${prop.meta.content}*/`;
    }
    throw new Error(`Unsuported ${(prop as any).type}`);
  }
}
