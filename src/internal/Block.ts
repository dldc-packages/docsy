import { Range } from './InputStream';

interface BlockBase {}

type CreateBlocks<Blocks extends { [key: string]: BlockBase }> = Blocks;

export type Blocks = CreateBlocks<{
  Empty: {};
  CaretLeft: {};
  Element: {
    component: Block<'Identifier'> | null;
  };
  Identifier: {
    name: string;
  };
}>;

export type BlockType = keyof Blocks;

export type Block<K extends BlockType = BlockType> = {
  [J in keyof Blocks[K]]: Blocks[K][J];
} & { type: K; range: Range };

const BLOCKS_OBJ: { [K in BlockType]: null } = {
  Empty: null,
  CaretLeft: null,
  Element: null,
  Identifier: null,
};

const BLOCKS = Object.keys(BLOCKS_OBJ) as Array<BlockType>;

const BlockIsType: {
  [K in BlockType]: (block: Block) => block is Block<K>;
} = BLOCKS.reduce<any>((acc, key) => {
  acc[key] = (block: Block) => block.type === key;
  return acc;
}, {});

export const BlockIs = {
  oneOf: blockIsOneIf,
  validType: isValidBlockType,
  ...BlockIsType,
};

export const CreateBlock: {
  [K in BlockType]: (range: Range, data: Blocks[K]) => Block<K>;
} = BLOCKS.reduce<any>((acc, type) => {
  acc[type] = (range: Range, data: Blocks[BlockType]) => ({
    type,
    range,
    ...(data as any),
  });
  return acc;
}, {});

function blockIsOneIf<T extends BlockType>(
  block: Block,
  types: ReadonlyArray<T>
): block is Block<T> {
  return types.includes(block.type as any);
}

function isValidBlockType(type: any): boolean {
  return type && typeof type === 'string' && BLOCKS.includes(type as any);
}
