export interface ArrayReader<T> {
  peek(): T;
  peek(size: 1): T;
  peek(size: 2): [T, T];
  peek(size: 3): [T, T, T];
  peek(size: 4): [T, T, T, T];
  peek(size: 5): [T, T, T, T, T];
  peek(size: number): Array<T>;
  take(): [T, ArrayReader<T>];
  take(size: 1): [T, ArrayReader<T>];
  take(size: 2): [[T, T], ArrayReader<T>];
  take(size: 3): [[T, T, T], ArrayReader<T>];
  take(size: 4): [[T, T, T, T], ArrayReader<T>];
  take(size: 5): [[T, T, T, T, T], ArrayReader<T>];
  take(size: number): [Array<T>, ArrayReader<T>];
  skip(size?: number): ArrayReader<T>;
  reverse(): ArrayReader<T>;
  size: number;
}

interface ArrayReaderOptions {
  start: number;
  end: number;
}

export function ArrayReader<T>(items: Array<T>) {
  return ArrayReaderInternal(items, {
    start: 0,
    end: items.length,
  });
}

function ArrayReaderInternal<T>(items: Array<T>, options: ArrayReaderOptions): ArrayReader<T> {
  const size = Math.abs(options.start - options.end);
  const direction = (options.end - options.start) / size; // NaN or 1 or -1

  return {
    reverse,
    size,
    peek,
    take,
    skip,
  };

  function reverse(): ArrayReader<T> {
    return ArrayReaderInternal(items, { start: options.end, end: options.start });
  }

  function peek(): T;
  function peek(size: 1): T;
  function peek(size: 2): [T, T];
  function peek(size: 3): [T, T, T];
  function peek(size: 4): [T, T, T, T];
  function peek(size: 5): [T, T, T, T, T];
  function peek(size: number): Array<T>;
  function peek(s: number = 1): T | Array<T> {
    if (s < 1 || s > size) {
      throw new Error(`Cannot peek ${s} item`);
    }
    const result = items.slice(options.start, options.start + direction * s);
    if (s === 1) {
      return result[0];
    }
    return result;
  }

  function take(): [T, ArrayReader<T>];
  function take(size: 1): [T, ArrayReader<T>];
  function take(size: 2): [[T, T], ArrayReader<T>];
  function take(size: 3): [[T, T, T], ArrayReader<T>];
  function take(size: 4): [[T, T, T, T], ArrayReader<T>];
  function take(size: 5): [[T, T, T, T, T], ArrayReader<T>];
  function take(size: number): [Array<T>, ArrayReader<T>];
  function take(s: number = 1): [T | Array<T>, ArrayReader<T>] {
    if (s < 1 || s > size) {
      throw new Error(`Cannot peek ${s} item`);
    }
    const nextStart = options.start + direction * s;
    const result = peek(s);
    return [result, ArrayReaderInternal(items, { start: nextStart, end: options.end })];
  }

  function skip(s: number = 1): ArrayReader<T> {
    if (s < 1 || s > size) {
      throw new Error(`Cannot peek ${s} item`);
    }
    const nextStart = options.start + direction * s;
    return ArrayReaderInternal(items, { start: nextStart, end: options.end });
  }
}
