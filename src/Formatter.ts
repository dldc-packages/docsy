import { Node, NodeIs, NodeType, Nodes } from './Node';
import { SINGLE_QUOTE, DOUBLE_QUOTE, BACKTICK } from './constants';
import { Position } from './InputStream';

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
    const hasSingle = item.value.indexOf(SINGLE_QUOTE) >= 0;
    const hasDouble = item.value.indexOf(DOUBLE_QUOTE) >= 0;
    const hasBacktick = item.value.indexOf(BACKTICK) >= 0;
    // No single => use single
    if (hasSingle === false) {
      if (item.quote !== 'Single') {
        return item;
      }
      return createNode('Str', item.position, {
        value: item.value,
        quote: 'Single',
      });
    }
    // no double quote => use double
    if (hasDouble === false) {
      if (item.quote !== 'Double') {
        return item;
      }
      return createNode('Str', item.position, {
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
      return createNode('Str', item.position, {
        value: item.value,
        quote: 'Backtick',
      });
    }
    // fallback to single quote with escape
    if (item.quote === 'Single') {
      return item;
    }
    // escape unscaped single quote
    return createNode('Str', item.position, {
      value: item.value.replace(/([^\\]')/g, "\\'"),
      quote: 'Single',
    });
  }

  function createNode<K extends NodeType>(
    type: K,
    position:
      | {
          start: Position;
          end: Position;
        }
      | undefined,
    data: Nodes[K]
  ): Node<K> {
    return {
      type,
      ...data,
      position,
    } as any;
  }
}
