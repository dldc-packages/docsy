export interface StringReader {
  peek(size?: number): string;
  take(size?: number): [string, StringReader];
  skip(size?: number): StringReader;
  reverse(): StringReader;
  size: number;
  position: number;
  empty: boolean;
}

interface StringReaderOptions {
  start: number;
  end: number;
}

export function StringReader(input: string): StringReader {
  return StringReaderInternal(input, {
    start: 0,
    end: input.length,
  });
}

export function StringReaderInternal(input: string, options: StringReaderOptions): StringReader {
  const size = Math.abs(options.start - options.end);
  const direction = (options.end - options.start) / size; // NaN or 1 or -1
  const position = direction === 1 ? options.start : options.end;
  const empty = size <= 0;

  return {
    peek,
    take,
    skip,
    reverse,
    size,
    position,
    empty,
  };

  function reverse(): StringReader {
    return StringReaderInternal(input, { start: options.end, end: options.start });
  }

  function peek(s: number = 1): string {
    const peekSize = Math.min(s, size);
    const result = input.slice(options.start, options.start + direction * peekSize);
    if (s === 1) {
      return result[0] || '';
    }
    return result;
  }

  function take(s: number = 1): [string, StringReader] {
    if (s < 1 || s > size) {
      throw new Error(`Cannot peek ${s} item`);
    }
    const nextStart = options.start + direction * s;
    const result = peek(s);
    return [result, StringReaderInternal(input, { start: nextStart, end: options.end })];
  }

  function skip(s: number = 1): StringReader {
    if (s < 1 || s > size) {
      throw new Error(`Cannot peek ${s} item`);
    }
    const nextStart = options.start + direction * s;
    return StringReaderInternal(input, { start: nextStart, end: options.end });
  }
}
