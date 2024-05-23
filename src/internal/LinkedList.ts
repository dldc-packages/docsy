export class LinkedList<T> {
  static root: LinkedList<any> = new LinkedList<any>(null);

  static create<T>(): LinkedList<T> {
    return LinkedList.root;
  }

  private constructor(
    private readonly internal: { parent: LinkedList<T>; value: T } | null,
  ) {}

  public get value(): T | null {
    return this.internal?.value ?? null;
  }

  public get parent(): LinkedList<T> | null {
    return this.internal?.parent ?? null;
  }

  public add(value: T): LinkedList<T> {
    return new LinkedList({ parent: this, value });
  }

  public toArray(): Array<T> {
    const result: Array<T> = [];
    // deno-lint-ignore no-this-alias
    let current: LinkedList<T> | null = this;
    while (current.internal !== null) {
      result.unshift(current.internal.value);
      current = current.internal.parent;
    }
    return result;
  }
}
