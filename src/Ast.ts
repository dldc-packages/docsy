import { Parsed } from './Parsed';
import { IntermediateResolvedValue as IRV } from './resolve';

export type QuoteType = 'Single' | 'Double' | 'Backtick';

export type NodeChildrenBase = null | Node | ReadonlyArray<Node> | { [key: string]: NodeChildrenBase };
export type NodeChildrenRoot = { [key: string]: NodeChildrenBase };

export type NodeMetaBase = { [key: string]: string | number | null | boolean };

export interface CreateNodeData<Resolved, Children extends NodeChildrenRoot, Meta extends NodeMetaBase = {}> {
  children: Children;
  meta: Meta;
  resolved: Resolved;
}

export type NodeDataBase = CreateNodeData<any, NodeChildrenRoot, NodeMetaBase>;

type CreateNodes<Nodes extends { [key: string]: NodeDataBase }> = Nodes;

export type JsxElement = any;

export type JsxElements = Array<JsxElement> | JsxElement | undefined;

// Is this anoying ?
export type NonEmptyArray<T> = readonly [T, ...T[]];

export type ResolveSpread = { kind: 'spread'; target: any };
export type ResolvedObjProperty = { kind: 'property'; name: string; value: any };
export type ResolvedListValue = { kind: 'value'; value: any };
export type ResolvedAttribute = { name: string; value: any };

export type ResolveObjItem = ResolvedObjProperty | ResolveSpread;
export type ResolveListItem = ResolvedListValue | ResolveSpread;

export type Nodes = CreateNodes<{
  Document: CreateNodeData<JsxElements, { children: ReadonlyArray<Child> }>;
  ExpressionDocument: CreateNodeData<any, { before?: WhitespaceLike; value?: Expression; after?: WhitespaceLike }>;
  Whitespace: CreateNodeData<string, {}, { content: string; hasNewLine: boolean }>;
  // Expression
  // -- Identifier
  Identifier: CreateNodeData<any, {}, { name: string }>;
  // -- Literal values
  Str: CreateNodeData<string, {}, { value: string; quote: QuoteType }>;
  Bool: CreateNodeData<boolean, {}, { value: boolean }>;
  Num: CreateNodeData<number, {}, { value: number; rawValue: string }>;
  Null: CreateNodeData<null, {}>;
  Undefined: CreateNodeData<undefined, {}>;

  Arr: CreateNodeData<Array<any>, { items?: ListItems | WhitespaceLike }, {}>;

  // Used for array and arguments
  ListItems: CreateNodeData<
    IRV<Array<ResolveListItem>>,
    { items: NonEmptyArray<ListItem>; trailingComma?: TrailingComma },
    {}
  >;
  TrailingComma: CreateNodeData<never, { whitespaceAfter?: WhitespaceLike }, {}>;
  ListItem: CreateNodeData<
    IRV<ResolveListItem>,
    {
      whitespaceBefore?: WhitespaceLike;
      item: Expression | Spread;
      whitespaceAfter?: WhitespaceLike;
    }
  >;

  Spread: CreateNodeData<IRV<ResolveSpread>, { target: Expression }>;

  Obj: CreateNodeData<Record<string, any>, { items?: ObjItems | WhitespaceLike }, {}>;
  ObjItems: CreateNodeData<
    IRV<Array<ResolveObjItem>>,
    { properties: NonEmptyArray<ObjItem>; trailingComma?: TrailingComma },
    {}
  >;
  ObjItem: CreateNodeData<
    IRV<ResolveObjItem>,
    {
      whitespaceBefore?: WhitespaceLike;
      property: AnyObjProperty;
      whitespaceAfter?: WhitespaceLike;
    }
  >;
  ObjProperty: CreateNodeData<
    IRV<ResolvedObjProperty>,
    {
      name: Str | Identifier;
      whitespaceBeforeColon?: WhitespaceLike;
      whitespaceAfterColon?: WhitespaceLike;
      value: Expression;
    }
  >;
  ObjComputedProperty: CreateNodeData<
    IRV<ResolvedObjProperty>,
    {
      whitespaceBeforeExpression?: WhitespaceLike;
      expression: Expression;
      whitespaceAfterExpression?: WhitespaceLike;
      whitespaceBeforeColon?: WhitespaceLike;
      whitespaceAfterColon?: WhitespaceLike;
      value: Expression;
    }
  >;
  ObjPropertyShorthand: CreateNodeData<
    IRV<ResolvedObjProperty>,
    {
      whitespaceBefore?: WhitespaceLike;
      name: Identifier;
      whitespaceAfter?: WhitespaceLike;
    }
  >;

  // -- Function call
  CallExpression: CreateNodeData<any, { target: ChainableExpression; arguments?: ListItems | WhitespaceLike }, {}>;
  // -- Member & Parenthesis
  MemberExpression: CreateNodeData<any, { target: ChainableExpression; property: Identifier }>;
  ComputedMemberExpression: CreateNodeData<
    any,
    {
      target: ChainableExpression;
      whitespaceBefore?: WhitespaceLike;
      property: Expression;
      whitespaceAfter?: WhitespaceLike;
    }
  >;
  Parenthesis: CreateNodeData<
    any,
    {
      whitespaceBefore?: WhitespaceLike;
      value: Expression;
      whitespaceAfter?: WhitespaceLike;
    }
  >;

  // Comments
  LineComment: CreateNodeData<null, {}, { content: string }>;
  BlockComment: CreateNodeData<null, {}, { content: string }>;

  // Element
  Element: CreateNodeData<
    JsxElement,
    {
      name: ElementName;
      attributes: ReadonlyArray<Attribute>;
      whitespaceAfterAttributes?: WhitespaceLike;
      children: ReadonlyArray<Child>;
    },
    { namedCloseTag: boolean }
  >;
  RawElement: CreateNodeData<
    JsxElement,
    { name: ElementName; attributes: ReadonlyArray<Attribute>; whitespaceAfterAttributes?: WhitespaceLike },
    { namedCloseTag: boolean; content: string }
  >;
  SelfClosingElement: CreateNodeData<
    JsxElement,
    {
      name: ElementName;
      attributes: ReadonlyArray<Attribute>;
      whitespaceAfterAttributes?: WhitespaceLike;
    }
  >;
  LineElement: CreateNodeData<
    JsxElement,
    {
      name: ElementName;
      attributes: ReadonlyArray<Attribute>;
      whitespaceAfterAttributes?: WhitespaceLike;
      children: ReadonlyArray<Child>;
    },
    {}
  >;

  // Fragments
  Fragment: CreateNodeData<JsxElement, { children: ReadonlyArray<Child> }>;
  RawFragment: CreateNodeData<string, {}, { content: string }>;

  Text: CreateNodeData<string, {}, { content: string }>;

  Inject: CreateNodeData<
    any,
    { whitespaceBefore?: WhitespaceLike; value: Expression; whitespaceAfter?: WhitespaceLike }
  >;

  // Attributes
  Attribute: CreateNodeData<
    IRV<ResolvedAttribute>,
    { whitespaceBefore: WhitespaceLike; name: Identifier; value?: Expression },
    {}
  >;

  // Tag name member </foo.bar/>
  ElementNameMember: CreateNodeData<any, { target: ElementName; property: Identifier }>;
}>;

export type NodeKind = keyof Nodes;

export type Node<K extends NodeKind = NodeKind> = Readonly<Nodes[K]['children']> & {
  readonly kind: K;
  readonly meta: Readonly<Nodes[K]['meta']>;
  // When the node is created by a parser you get the Parsed instance
  readonly parsed?: Parsed<Node>;
};

export type NodeResolved<K extends NodeKind = NodeKind> = Nodes[K]['resolved'];

export type NodeData<K extends NodeKind = NodeKind> = Nodes[K];

const NODES_OBJ: { [K in NodeKind]: null } = {
  Arr: null,
  Attribute: null,
  BlockComment: null,
  Bool: null,
  CallExpression: null,
  ComputedMemberExpression: null,
  Document: null,
  Element: null,
  ElementNameMember: null,
  ExpressionDocument: null,
  Fragment: null,
  Identifier: null,
  Inject: null,
  LineComment: null,
  LineElement: null,
  ListItem: null,
  ListItems: null,
  MemberExpression: null,
  Null: null,
  Num: null,
  Obj: null,
  ObjComputedProperty: null,
  ObjItem: null,
  ObjItems: null,
  ObjProperty: null,
  ObjPropertyShorthand: null,
  Parenthesis: null,
  RawElement: null,
  RawFragment: null,
  SelfClosingElement: null,
  Spread: null,
  Str: null,
  Text: null,
  TrailingComma: null,
  Undefined: null,
  Whitespace: null,
};

const NODES = Object.keys(NODES_OBJ) as Array<NodeKind>;

// Alias
export type Arr = Node<'Arr'>;
export type Attribute = Node<'Attribute'>;
export type BlockComment = Node<'BlockComment'>;
export type Bool = Node<'Bool'>;
export type CallExpression = Node<'CallExpression'>;
export type ComputedMemberExpression = Node<'ComputedMemberExpression'>;
export type Document = Node<'Document'>;
export type Element = Node<'Element'>;
export type ElementNameMember = Node<'ElementNameMember'>;
export type ExpressionDocument = Node<'ExpressionDocument'>;
export type Fragment = Node<'Fragment'>;
export type Identifier = Node<'Identifier'>;
export type Inject = Node<'Inject'>;
export type LineComment = Node<'LineComment'>;
export type LineElement = Node<'LineElement'>;
export type ListItem = Node<'ListItem'>;
export type ListItems = Node<'ListItems'>;
export type MemberExpression = Node<'MemberExpression'>;
export type Null = Node<'Null'>;
export type Num = Node<'Num'>;
export type Obj = Node<'Obj'>;
export type ObjComputedProperty = Node<'ObjComputedProperty'>;
export type ObjItem = Node<'ObjItem'>;
export type ObjItems = Node<'ObjItems'>;
export type ObjProperty = Node<'ObjProperty'>;
export type ObjPropertyShorthand = Node<'ObjPropertyShorthand'>;
export type Parenthesis = Node<'Parenthesis'>;
export type RawElement = Node<'RawElement'>;
export type RawFragment = Node<'RawFragment'>;
export type SelfClosingElement = Node<'SelfClosingElement'>;
export type Spread = Node<'Spread'>;
export type Str = Node<'Str'>;
export type Text = Node<'Text'>;
export type TrailingComma = Node<'TrailingComma'>;
export type Undefined = Node<'Undefined'>;
export type Whitespace = Node<'Whitespace'>;

export type WhitespaceLike = Whitespace | AnyComment | NonEmptyArray<Whitespace | AnyComment>;

// Groups
const ElementName = combine('ElementNameMember', 'Identifier');
export type ElementName = typeof ElementName['__type'];

const AnyElement = combine('Element', 'RawElement', 'SelfClosingElement', 'LineElement', 'Fragment', 'RawFragment');
export type AnyElement = typeof AnyElement['__type'];

const ObjOrArr = combine('Arr', 'Obj');
export type ObjOrArr = typeof ObjOrArr['__type'];

const Primitive = combine('Null', 'Undefined', 'Bool', 'Num', 'Str');
export type Primitive = typeof Primitive['__type'];

const AnyObjProperty = combine('ObjProperty', 'ObjComputedProperty', 'ObjPropertyShorthand', 'Spread');
export type AnyObjProperty = typeof AnyObjProperty['__type'];

const AnyComment = combine('LineComment', 'BlockComment');
export type AnyComment = typeof AnyComment['__type'];

const Child = combine('Whitespace', 'Inject', 'Text', ...AnyComment.kinds, ...AnyElement.kinds);
export type Child = typeof Child['__type'];

// Expression you can access properties / call functions on
const ChainableExpression = combine(
  'CallExpression',
  'ComputedMemberExpression',
  'MemberExpression',
  'Parenthesis',
  'Identifier'
);
export type ChainableExpression = typeof ChainableExpression['__type'];

const Expression = combine(...Primitive.kinds, ...ObjOrArr.kinds, ...ChainableExpression.kinds);
export type Expression = typeof Expression['__type'];

// NodeIs

const NodeIsInternal: { oneOf: typeof nodeIsOneOf } & {
  [K in NodeKind]: (node: Node) => node is Node<K>;
} = NODES.reduce<any>(
  (acc, key) => {
    acc[key] = (node: Node) => node.kind === key;
    return acc;
  },
  { oneOf: nodeIsOneOf }
);

function isWhitespaceLike(node: Node | NonEmptyArray<Node> | Array<Node>): node is WhitespaceLike {
  if (Array.isArray(node)) {
    return node.every(isWhitespaceLike);
  }
  return NodeIsInternal.Whitespace(node as Node) || AnyComment(node as Node);
}

export const NodeIs = {
  ...NodeIsInternal,
  ElementName,
  Child,
  Primitive,
  ObjOrArr,
  AnyObjProperty,
  ChainableExpression,
  Expression,
  AnyElement,
  AnyComment,
  WhitespaceLike: isWhitespaceLike,
};

// CreateNode

export function createNode<K extends NodeKind>(
  kind: K,
  children: Nodes[K]['children'],
  meta: Nodes[K]['meta'],
  parsed?: Parsed
): Node<K> {
  if (parsed) {
    return { kind, parsed, meta, ...children };
  }
  return { kind, meta, ...children };
}

export const NodeBuilder: {
  [K in NodeKind]: (children: Nodes[K]['children'], meta: Nodes[K]['meta']) => Node<K>;
} = NODES.reduce<any>((acc, kind) => {
  acc[kind] = (children: Nodes[NodeKind]['children'], meta: Nodes[NodeKind]['meta']) =>
    createNode(kind, children, meta);
  return acc;
}, {});

// Internal

function nodeIsOneOf<T extends NodeKind>(node: Node, kinds: ReadonlyArray<T>): node is Node<T> {
  return kinds.includes(node.kind as any);
}

export function isValidNodeKind(kind: unknown): boolean {
  return Boolean(kind && typeof kind === 'string' && NODES.includes(kind as any));
}

type NodeTypeFromArray<T extends ReadonlyArray<NodeKind>> = Node<T[number]>;

function combine<T extends ReadonlyArray<NodeKind>>(
  ...kinds: T
): {
  (node: Node): node is NodeTypeFromArray<T>;
  kinds: T;
  __type: NodeTypeFromArray<T>;
} {
  const fn = ((node: Node) => kinds.includes(node.kind)) as any;
  fn.kinds = kinds;
  return fn;
}
