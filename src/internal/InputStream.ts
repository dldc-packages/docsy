export interface InputStream {
  get(start: Position, end: Position): string;
  next(count?: number): string;
  peek(length?: number): string;
  eof(): boolean;
  croak(msg: string): never;
  position(): Position;
  saveState(): State;
  restoreState(state: State): void;
}

export type Position = {
  line: number;
  column: number;
  offset: number;
};

export interface State {
  pos: number;
  line: number;
  col: number;
}

export function InputStream(input: string): InputStream {
  let pos = 0;
  let line = 1;
  let col = 1;

  return {
    get,
    next,
    peek,
    eof,
    croak,
    position,
    saveState,
    restoreState,
  };

  function get(start: Position, end: Position): string {
    const [startOff, endOff] =
      start.offset > end.offset ? [end.offset, start.offset] : [start.offset, end.offset];
    return input.slice(startOff, endOff);
  }

  function saveState(): State {
    return {
      col,
      line,
      pos,
    };
  }

  function restoreState(state: State): void {
    col = state.col;
    line = state.line;
    pos = state.pos;
  }

  function position(): Position {
    return {
      line,
      column: col,
      offset: pos,
    };
  }

  function next(count: number = 1): string {
    let val = '';
    for (let i = 0; i < count; i++) {
      const ch = input.charAt(pos++);
      if (ch === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      val += ch;
    }
    return val;
  }

  function peek(length: number = 1): string {
    if (length === 1) {
      return input.charAt(pos);
    }
    let val: string = '';
    for (let i = 0; i < length; i++) {
      val += input.charAt(pos + i);
    }
    return val;
  }

  function eof(): boolean {
    return peek() === '';
  }

  function croak(msg: string): never {
    throw new Error(msg + ' (' + line + ':' + col + ')');
  }
}
