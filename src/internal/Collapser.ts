import { Token, TokenIs } from './Token';
import { Range } from './InputStream';
import { ArrayReader } from './ArrayReader';
import { Block, CreateBlock, BlockIs } from './Block';

type CollapseResult =
  | { type: 'next' }
  | { type: 'push'; block: Block }
  | { type: 'pop'; block: Block };

const CollapseResult = {
  next: (): CollapseResult => ({ type: 'next' }),
  push: (block: Block): CollapseResult => ({ type: 'push', block }),
  pop: (block: Block): CollapseResult => ({ type: 'pop', block }),
};

export function Collapser(tokens: Array<Token>) {
  let reader = ArrayReader(tokens);
  const stack: Array<Block> = [CreateBlock.Empty(emptyRange(), {})];

  let command: CollapseResult = { type: 'next' };
  do {
    if (command.type === 'next') {
      const nextToken = reader.peek();
      reader = reader.skip();
      command = collapseTokenForward(stack[stack.length - 1], nextToken);
    } else if (command.type === 'push') {
      stack.push(command.block);
      command = { type: 'next' };
    } else if (command.type === 'pop') {
      if (stack.length === 1) {
        break;
      }
      const current = stack.pop()!;
      stack[stack.length - 1] = collapseBlockForward(stack[stack.length - 1], current);
      command = { type: 'next' };
    }
  } while (reader.size > 0);

  console.log({ stack });

  function collapseTokenForward(current: Block, token: Token): CollapseResult {
    if (reader.size === 0) {
      throw new Error('Todo collapse Stack');
    }
    if (BlockIs.Empty(current)) {
      if (TokenIs.Ponctuation(token, '<')) {
        return CollapseResult.push(CreateBlock.CaretLeft(token.range, {}));
      }
    }
    if (BlockIs.CaretLeft(current)) {
    }
    console.log({
      current,
      token,
    });

    throw new Error('Unhandled collapse');
  }

  function collapseBlockForward(parent: Block, current: Block): Block {
    console.log({
      parent,
      current,
    });
    throw new Error('Unhandled collapse');
  }
}

// function mergeRanges(left: Range, right: Range): Range {
//   if (left.end.offset !== right.start.offset) {
//     throw new Error(`Cannot merge ranges`);
//   }
//   return {
//     start: left.start,
//     end: right.end,
//   };
// }

function emptyRange(): Range {
  return {
    start: {
      column: 1,
      line: 1,
      offset: 0,
    },
    end: {
      column: 1,
      line: 1,
      offset: 0,
    },
  };
}
