export type QuoteType = 'Single' | 'Double' | 'Backtick';

export type NodeChildrenBase = null | Node | Array<Node> | { [key: string]: NodeChildrenBase };

export type NodeMetaBase = { [key: string]: string | number | null | boolean };

export interface CreateNodeData<Children extends NodeChildrenBase, Meta extends NodeMetaBase = {}> {
  children: Children;
  meta: Meta;
}

export interface NodeBase {
  children: NodeChildrenBase;
  meta: NodeMetaBase;
}

type CreateNodes<Nodes extends { [key: string]: NodeBase }> = Nodes;

type Nodes = CreateNodes<{
  Document: { children: Array<Child>; meta: {} };
  Fragment: { children: Array<Child>; meta: {} };
  SelfClosingElement: CreateNodeData<{ component: ComponentType; props: Node<'Props'> }>;
  UnrawFragment: { children: Array<Child>; meta: {} };
  RawFragment: { children: Array<RawChild>; meta: {} };
  Whitespace: CreateNodeData<{}, { content: string; hasNewLine: boolean }>;
  Props: CreateNodeData<{ items: Array<Node<'PropItem'>>; whitespaceAfter: MaybeWhitespace }, {}>;
  PropItem: CreateNodeData<{ whitespaceBefore: Node<'Whitespace'>; item: Prop }, {}>;
  PropValue: CreateNodeData<{ name: Node<'Identifier'>; value: Expression }, {}>;
  PropNoValue: CreateNodeData<{ name: Node<'Identifier'> }, {}>;
  PropLineComment: CreateNodeData<{}, { content: string }>;
  PropBlockComment: CreateNodeData<{}, { content: string }>;
  LineComment: CreateNodeData<{}, { content: string }>;
  BlockComment: CreateNodeData<{}, { content: string }>;
  Null: CreateNodeData<{}>;
  Undefined: CreateNodeData<{}>;
  Text: CreateNodeData<{}, { content: string }>;
  RawText: CreateNodeData<{}, { content: string }>;
  Str: CreateNodeData<{}, { value: string; quote: QuoteType }>;
  Bool: CreateNodeData<{}, { value: boolean }>;
  Num: CreateNodeData<{}, { value: number; rawValue: string }>;
  Object: CreateNodeData<{ items: Array<Node<'ObjectItem'>> }, { trailingComma: boolean }>;
  EmptyObject: CreateNodeData<{ whitespace: MaybeWhitespace }>;
  ObjectItem: CreateNodeData<{ whitespaceBefore: MaybeWhitespace; item: ObjectPart; whitespaceAfter: MaybeWhitespace }>;
  PropertyShorthand: CreateNodeData<{ name: Node<'Identifier'> }>;
  Identifier: CreateNodeData<{}, { name: string }>;
  DotMember: CreateNodeData<{ target: ChainExpression; property: Node<'Identifier'> }>;
  Parenthesis: CreateNodeData<{ value: Expression }>;
  Array: CreateNodeData<{ items: Array<Node<'ArrayItem'>> }, { trailingComma: boolean }>;
  EmptyArray: CreateNodeData<{ whitespace: MaybeWhitespace }>;
  ElementTypeMember: CreateNodeData<{ target: Node<'Identifier' | 'ElementTypeMember'>; property: Node<'Identifier'> }>;
  Spread: CreateNodeData<{ target: Expression }>;
  Inject: CreateNodeData<{ whitespaceBefore: MaybeWhitespace; value: Expression; whitespaceAfter: MaybeWhitespace }>;
  ExpressionDocument: CreateNodeData<{
    before: Array<WhitespaceOrComment>;
    value: Expression;
    after: Array<WhitespaceOrComment>;
  }>;
  RawElement: CreateNodeData<
    { component: ComponentType; props: Node<'Props'>; children: Array<RawChild> },
    { namedCloseTag: boolean }
  >;
  Element: CreateNodeData<
    { component: ComponentType; props: Node<'Props'>; children: Array<Child> },
    { namedCloseTag: boolean }
  >;
  Property: CreateNodeData<{
    name: Node<'Str' | 'Identifier'>;
    whitespaceBeforeColon: MaybeWhitespace;
    whitespaceAfterColon: MaybeWhitespace;
    value: Expression;
  }>;
  ComputedProperty: CreateNodeData<{
    expression: Expression;
    whitespaceBeforeColon: MaybeWhitespace;
    whitespaceAfterColon: MaybeWhitespace;
    value: Expression;
  }>;
  FunctionCall: CreateNodeData<
    { target: ChainExpression; arguments: Array<Node<'ArrayItem'>> },
    { trailingComma: boolean }
  >;
  BracketMember: CreateNodeData<{
    target: ChainExpression;
    property: Expression;
  }>;
  ArrayItem: CreateNodeData<{
    whitespaceBefore: MaybeWhitespace;
    item: Expression | Node<'Spread'>;
    whitespaceAfter: MaybeWhitespace;
  }>;
}>;

export type NodeKind = keyof Nodes;

export type Node<K extends NodeKind = NodeKind> = Nodes[K] & { kind: K };

export type NodeData<K extends NodeKind = NodeKind> = Nodes[K];

const NODES_OBJ: { [K in NodeKind]: null } = {
  Array: null,
  ArrayItem: null,
  BlockComment: null,
  Bool: null,
  BracketMember: null,
  ComputedProperty: null,
  Document: null,
  DotMember: null,
  Element: null,
  ElementTypeMember: null,
  EmptyArray: null,
  EmptyObject: null,
  ExpressionDocument: null,
  Fragment: null,
  FunctionCall: null,
  Identifier: null,
  Inject: null,
  LineComment: null,
  Null: null,
  Num: null,
  Object: null,
  ObjectItem: null,
  Parenthesis: null,
  PropBlockComment: null,
  Property: null,
  PropertyShorthand: null,
  PropItem: null,
  PropLineComment: null,
  PropNoValue: null,
  Props: null,
  PropValue: null,
  RawElement: null,
  RawFragment: null,
  RawText: null,
  SelfClosingElement: null,
  Spread: null,
  Str: null,
  Text: null,
  Undefined: null,
  UnrawFragment: null,
  Whitespace: null,
};

const NODES = Object.keys(NODES_OBJ) as Array<NodeKind>;

// Alias
export type Document = Node<'Document'>;
export type ExpressionDocument = Node<'ExpressionDocument'>;

const ComponentType = combine('ElementTypeMember', 'Identifier');
export type ComponentType = typeof ComponentType['__type'];

const Prop = combine('PropNoValue', 'PropValue', 'PropLineComment', 'PropBlockComment');
export type Prop = typeof Prop['__type'];

export type MaybeWhitespace = Node<'Whitespace'> | null;

const ChildElement = combine('Element', 'SelfClosingElement', 'Fragment', 'RawFragment', 'RawElement');
export type ChildElement = typeof ChildElement['__type'];

const Child = combine('Whitespace', 'Inject', 'Text', 'BlockComment', 'LineComment', ...ChildElement.kinds);
export type Child = typeof Child['__type'];

const RawChild = combine('RawText', 'UnrawFragment');
export type RawChild = typeof RawChild['__type'];

const ObjectOrArray = combine('Array', 'EmptyArray', 'Object', 'EmptyObject');
export type ObjectOrArray = typeof ObjectOrArray['__type'];

const ChainExpression = combine('FunctionCall', 'BracketMember', 'Identifier', 'DotMember', 'Parenthesis');
export type ChainExpression = typeof ChainExpression['__type'];

const Primitive = combine('Null', 'Undefined', 'Bool', 'Num', 'Str');
export type Primitive = typeof Primitive['__type'];

const ObjectPart = combine('PropertyShorthand', 'Property', 'ComputedProperty', 'Spread');
export type ObjectPart = typeof ObjectPart['__type'];

const AnyComment = combine('LineComment', 'BlockComment');
export type AnyComment = typeof AnyComment['__type'];

const WhitespaceOrComment = combine('Whitespace', ...AnyComment.kinds);
export type WhitespaceOrComment = typeof WhitespaceOrComment['__type'];

const Expression = combine(...Primitive.kinds, ...ObjectOrArray.kinds, ...ChainExpression.kinds);
export type Expression = typeof Expression['__type'];

// Internal

function nodeIsOneOf<T extends NodeKind>(node: Node, kinds: ReadonlyArray<T>): node is Node<T> {
  return kinds.includes(node.kind as any);
}

export function isValidNodeKind(kind: unknown): boolean {
  return Boolean(kind && typeof kind === 'string' && NODES.includes(kind as any));
}

const NodeIsInternal: { oneOf: typeof nodeIsOneOf } & {
  [K in NodeKind]: (node: Node) => node is Node<K>;
} = NODES.reduce<any>(
  (acc, key) => {
    acc[key] = (node: Node) => node.kind === key;
    return acc;
  },
  { oneOf: nodeIsOneOf }
);

export const NodeIs = {
  ...NodeIsInternal,
  ComponentType,
  Prop,
  Child,
  Primitive,
  ObjectOrArray,
  ObjectPart,
  ChainExpression,
  Expression,
  ChildElement,
  AnyComment,
};

export const CreateNode: {
  [K in NodeKind]: (children: Nodes[K]['children'], meta: Nodes[K]['meta']) => Node<K>;
} = NODES.reduce<any>((acc, kind) => {
  acc[kind] = (children: Nodes[NodeKind]['children'], meta: Nodes[NodeKind]['meta']) => ({
    kind,
    children,
    meta,
  });
  return acc;
}, {});

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
