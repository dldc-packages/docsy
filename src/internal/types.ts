export type Position = {
  line: number;
  column: number;
  offset: number;
};

export interface Range {
  start: Position;
  end: Position;
}

export interface StackItem {
  message: string;
  position: number;
  stack: StackOrNull;
}

export type Stack = StackItem | Array<StackItem>;

export type StackOrNull = null | Stack;
