import { Node, NodeContent, NodeIs, NodeKind } from './Ast';
import * as t from './internal/tokens';

export function format(node: Node): Node {
  return formatInternal(node);

  function formatInternal(item: Node): Node {
    if (NodeIs.Str(item)) {
      return formatString(item);
    }
    return node;
  }

  function formatString(item: Node<'Str'>): Node<'Str'> {
    // if new line & backtick => keep backtick
    if (item.value.indexOf('\n') && item.quote === 'Backtick') {
      return item;
    }
    const hasSingle = item.value.indexOf(t.SINGLE_QUOTE) >= 0;
    const hasDouble = item.value.indexOf(t.DOUBLE_QUOTE) >= 0;
    const hasBacktick = item.value.indexOf(t.BACKTICK) >= 0;
    // No single => use single
    if (hasSingle === false) {
      if (item.quote !== 'Single') {
        return item;
      }
      return createNode('Str', {
        value: item.value,
        quote: 'Single',
      });
    }
    // no double quote => use double
    if (hasDouble === false) {
      if (item.quote !== 'Double') {
        return item;
      }
      return createNode('Str', {
        value: item.value,
        quote: 'Double',
      });
    }
    // at this point there are both single and double
    // if not backtick => use backtick
    if (hasBacktick === false) {
      if (item.quote !== 'Backtick') {
        return item;
      }
      return createNode('Str', {
        value: item.value,
        quote: 'Backtick',
      });
    }
    // fallback to single quote with escape
    if (item.quote === 'Single') {
      return item;
    }
    // escape unscaped single quote
    return createNode('Str', {
      value: item.value.replace(/([^\\]')/g, "\\'"),
      quote: 'Single',
    });
  }

  function createNode<K extends NodeKind>(kind: K, content: NodeContent<K>): Node<K> {
    const node: Node<K> = { kind, ...content } as any;
    return node;
  }
}
