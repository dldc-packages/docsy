import { Position, Range } from './types';

export interface StringStream {
  get(start: Position, end: Position): string;
  next(count?: number): string;
  peek(length?: number): string;
  eof(): boolean;
  croak(msg: string): never;
  position(): Position;
  rangeSinceLastRange(): Range;
  saveState(): State;
  restoreState(state: State): void;
}

export interface State {
  offset: number;
  line: number;
  column: number;
}

export function StringStream(input: string): StringStream {
  let offset = 0;
  let line = 1;
  let column = 1;

  let lastRangePosition: Position = position();

  return {
    next,
    peek,
    get,
    eof,
    croak,
    position,
    saveState,
    restoreState,
    rangeSinceLastRange,
  };

  function rangeSinceLastRange(): Range {
    const newPos = position();
    const range: Range = {
      start: lastRangePosition,
      end: newPos,
    };
    lastRangePosition = newPos;
    return range;
  }

  function get(start: Position, end: Position): string {
    const [startOff, endOff] =
      start.offset > end.offset ? [end.offset, start.offset] : [start.offset, end.offset];
    return input.slice(startOff, endOff);
  }

  function saveState(): State {
    return {
      column,
      line,
      offset,
    };
  }

  function restoreState(state: State): void {
    column = state.column;
    line = state.line;
    offset = state.offset;
  }

  function position(): Position {
    return {
      line,
      column,
      offset,
    };
  }

  function next(count: number = 1): string {
    let val = '';
    for (let i = 0; i < count; i++) {
      const ch = input.charAt(offset++);
      if (ch === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
      val += ch;
    }
    return val;
  }

  function peek(length: number = 1): string {
    if (length === 1) {
      return input.charAt(offset);
    }
    let val: string = '';
    for (let i = 0; i < length; i++) {
      val += input.charAt(offset + i);
    }
    return val;
  }

  function eof(): boolean {
    return peek() === '';
  }

  function croak(msg: string): never {
    throw new Error(msg + ' (' + line + ':' + column + ')');
  }
}
