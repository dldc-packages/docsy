export type QuoteType = 'Single' | 'Double' | 'Backtick';

export type NodeChildrenBase = null | Node | Array<Node> | { [key: string]: NodeChildrenBase };

type NodeMetaBase = { [key: string]: string | number | null | boolean };

interface CreateNode<Children, Meta = {}> {
  children: Children;
  meta: Meta;
}

interface NodeBase {
  children: NodeChildrenBase;
  meta: NodeMetaBase;
}

type CreateNodes<Nodes extends { [key: string]: NodeBase }> = Nodes;

type Nodes = CreateNodes<{
  Document: { children: Array<Child>; meta: {} };
  Fragment: { children: Array<Child>; meta: {} };
  RawFragment: { children: Array<Child>; meta: {} };
  ExpressionDocument: CreateNode<{
    before: Array<WhitespaceOrComment>;
    value: Expression;
    after: Array<WhitespaceOrComment>;
  }>;
  SelfClosingElement: CreateNode<{
    component: ComponentType;
    props: Node<'Props'>;
  }>;
  Element: CreateNode<
    { component: ComponentType; props: Node<'Props'>; children: Array<Child> },
    { namedCloseTag: boolean }
  >;
  RawElement: CreateNode<
    { component: ComponentType; props: Node<'Props'>; children: Array<Child> },
    { namedCloseTag: boolean }
  >;
  Whitespace: CreateNode<{}, { content: string; hasNewLine: boolean }>;
  Props: CreateNode<{ items: Array<Node<'PropItem'>>; whitespaceAfter: MaybeWhitespace }, {}>;
  PropItem: CreateNode<{ whitespaceBefore: Node<'Whitespace'>; item: Prop }, {}>;
  PropValue: CreateNode<{ name: Node<'Identifier'>; value: Expression }, {}>;
  PropNoValue: CreateNode<{ name: Node<'Identifier'> }, {}>;
  PropLineComment: CreateNode<{}, { content: string }>;
  PropBlockComment: CreateNode<{}, { content: string }>;
  LineComment: CreateNode<{}, { content: string }>;
  BlockComment: CreateNode<{}, { content: string }>;
  Null: CreateNode<{}>;
  Undefined: CreateNode<{}>;
  Text: CreateNode<{}, { content: string }>;
  Str: CreateNode<{}, { value: string; quote: QuoteType }>;
  Bool: CreateNode<{}, { value: boolean }>;
  Num: CreateNode<{}, { value: number; rawValue: string }>;
  Object: CreateNode<{ items: Array<Node<'ObjectItem'>> }, { trailingComma: boolean }>;
  EmptyObject: CreateNode<{ whitespace: MaybeWhitespace }>;
  ObjectItem: CreateNode<{
    whitespaceBefore: MaybeWhitespace;
    item: ObjectPart;
    whitespaceAfter: MaybeWhitespace;
  }>;
  PropertyShorthand: CreateNode<{ name: Node<'Identifier'> }>;
  Property: CreateNode<{
    name: Node<'Str' | 'Identifier'>;
    whitespaceBeforeColon: MaybeWhitespace;
    whitespaceAfterColon: MaybeWhitespace;
    value: Expression;
  }>;
  ComputedProperty: CreateNode<{
    expression: Expression;
    whitespaceBeforeColon: MaybeWhitespace;
    whitespaceAfterColon: MaybeWhitespace;
    value: Expression;
  }>;
  Array: CreateNode<{ items: Array<Node<'ArrayItem'>> }, { trailingComma: boolean }>;
  EmptyArray: CreateNode<{ whitespace: MaybeWhitespace }>;
  FunctionCall: CreateNode<
    {
      target: CallableExpression;
      arguments: Array<Node<'ArrayItem'>>;
    },
    { trailingComma: boolean }
  >;
  Identifier: CreateNode<{}, { name: string }>;
  DotMember: CreateNode<{
    target: DottableExpression;
    property: Node<'Identifier'>;
  }>;
  Parenthesis: CreateNode<{ value: Expression }>;
  BracketMember: CreateNode<{
    target: DottableExpression;
    property: Expression;
  }>;
  ElementTypeMember: CreateNode<{
    target: Node<'Identifier' | 'ElementTypeMember'>;
    property: Node<'Identifier'>;
  }>;
  Spread: CreateNode<{ target: Expression }>;
  ArrayItem: CreateNode<{
    whitespaceBefore: MaybeWhitespace;
    item: Expression | Node<'Spread'>;
    whitespaceAfter: MaybeWhitespace;
  }>;
  Inject: CreateNode<
    {
      whitespaceBefore: MaybeWhitespace;
      value: Expression;
      whitespaceAfter: MaybeWhitespace;
    },
    {}
  >;
}>;

export type NodeKind = keyof Nodes;

export type Node<K extends NodeKind = NodeKind> = Nodes[K] & { kind: K };

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
  SelfClosingElement: null,
  Spread: null,
  Str: null,
  Text: null,
  Undefined: null,
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

const ElementAny = combine('Element', 'SelfClosingElement', 'Fragment', 'RawFragment', 'RawElement');
export type ElementAny = typeof ElementAny['__type'];

const Child = combine(...ElementAny.kinds, 'Whitespace', 'Inject', 'Text', 'BlockComment', 'LineComment');
export type Child = typeof Child['__type'];

const CallableExpression = combine('FunctionCall', 'BracketMember', 'Identifier', 'DotMember', 'Parenthesis');
export type CallableExpression = typeof CallableExpression['__type'];

const Primitive = combine('Null', 'Undefined', 'Bool', 'Num', 'Str');
export type Primitive = typeof Primitive['__type'];

const ObjectOrArray = combine('Array', 'EmptyArray', 'Object', 'EmptyObject');
export type ObjectOrArray = typeof ObjectOrArray['__type'];

const ObjectPart = combine('PropertyShorthand', 'Property', 'ComputedProperty', 'Spread');
export type ObjectPart = typeof ObjectPart['__type'];

const DottableExpression = combine(...ElementAny.kinds, ...CallableExpression.kinds, ...ObjectOrArray.kinds, 'Str');
export type DottableExpression = typeof DottableExpression['__type'];

const AnyComment = combine('LineComment', 'BlockComment');
export type AnyComment = typeof AnyComment['__type'];

const WhitespaceOrComment = combine('Whitespace', ...AnyComment.kinds);
export type WhitespaceOrComment = typeof WhitespaceOrComment['__type'];

const Expression = combine(
  ...ElementAny.kinds,
  ...Primitive.kinds,
  ...ObjectOrArray.kinds,
  ...CallableExpression.kinds
);
export type Expression = typeof Expression['__type'];

export type MaybeWhitespace = Node<'Whitespace'> | null;

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
  ElementAny,
  Children: Child,
  CallableExpression,
  Primitive,
  ObjectOrArray,
  ObjectPart,
  DottableExpression,
  Expression,
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
