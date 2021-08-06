import { Node, NodeIs, NodeKind } from './Ast.js';

const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const BACKTICK = '`';

export const DocsyFomatter = {
  format,
};

function format(node: Node): Node {
  return formatInternal(node);

  function formatInternal(item: Node): Node {
    if (NodeIs.Str(item)) {
      return formatString(item);
    }
    return node;
  }

  function formatString(item: Node<'Str'>): Node<'Str'> {
    // if new line & backtick => keep backtick
    if (item.meta.value.indexOf('\n') && item.meta.quote === 'Backtick') {
      return item;
    }
    const hasSingle = item.meta.value.indexOf(SINGLE_QUOTE) >= 0;
    const hasDouble = item.meta.value.indexOf(DOUBLE_QUOTE) >= 0;
    const hasBacktick = item.meta.value.indexOf(BACKTICK) >= 0;
    // No single => use single
    if (hasSingle === false) {
      if (item.meta.quote !== 'Single') {
        return item;
      }
      return createNode(
        'Str',
        {},
        {
          value: item.meta.value,
          quote: 'Single',
        }
      );
    }
    // no double quote => use double
    if (hasDouble === false) {
      if (item.meta.quote !== 'Double') {
        return item;
      }
      return createNode(
        'Str',
        {},
        {
          value: item.meta.value,
          quote: 'Double',
        }
      );
    }
    // at this point there are both single and double
    // if not backtick => use backtick
    if (hasBacktick === false) {
      if (item.meta.quote !== 'Backtick') {
        return item;
      }
      return createNode(
        'Str',
        {},
        {
          value: item.meta.value,
          quote: 'Backtick',
        }
      );
    }
    // fallback to single quote with escape
    if (item.meta.quote === 'Single') {
      return item;
    }
    // escape unscaped single quote
    return createNode(
      'Str',
      {},
      {
        value: item.meta.value.replace(/([^\\]')/g, "\\'"),
        quote: 'Single',
      }
    );
  }

  function createNode<K extends NodeKind>(kind: K, children: Node<K>['children'], meta: Node<K>['meta']): Node<K> {
    const node: Node<K> = {
      kind,
      children,
      meta,
    } as any;
    return node;
  }
}
