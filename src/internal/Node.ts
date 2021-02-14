export type QuoteType = 'Single' | 'Double' | 'Backtick';

type ArrayOfNodes = Array<Node>;

export type NodeNodesItem = null | Node | ArrayOfNodes | NodeNodesBase;

type NodeNodesBase = { [key: string]: NodeNodesItem };

type NodeMetaBase = { [key: string]: string | number | null | boolean };

type CreateNode<Nodes extends NodeNodesBase, Meta extends NodeMetaBase = {}> = {
  nodes: Nodes;
  meta: Meta;
};

interface NodeBase {
  nodes: NodeNodesBase;
  meta: NodeMetaBase;
}

type CreateNodes<Nodes extends { [key: string]: NodeBase }> = Nodes;

export type Nodes = CreateNodes<{
  Document: CreateNode<{ children: Array<Child> }>;
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
  Fragment: CreateNode<{ children: Array<Child> }>;
  RawFragment: CreateNode<{ children: Array<Child> }>;
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
  Object: CreateNode<{ items: Array<Node<'ObjectItem'>> }>;
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
  Array: CreateNode<{ items: Array<Node<'ArrayItem'>> }>;
  EmptyArray: CreateNode<{ whitespace: MaybeWhitespace }>;
  FunctionCall: CreateNode<{
    target: CallableExpression;
    arguments: Array<Node<'ArrayItem'>>;
  }>;
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

export type NodeType = keyof Nodes;

export type Node<K extends NodeType = NodeType> = {
  [J in keyof Nodes[K]]: Nodes[K][J];
} & { type: K };

const NODES_OBJ: { [K in NodeType]: null } = {
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

const NODES = Object.keys(NODES_OBJ) as Array<NodeType>;

// Alias
export type Document = Node<'Document'>;
export type ExpressionDocument = Node<'ExpressionDocument'>;

const ComponentType = combine('ElementTypeMember', 'Identifier');
export type ComponentType = typeof ComponentType['__type'];

const Prop = combine('PropNoValue', 'PropValue', 'PropLineComment', 'PropBlockComment');
export type Prop = typeof Prop['__type'];

const ElementAny = combine('Element', 'SelfClosingElement', 'Fragment', 'RawFragment', 'RawElement');
export type ElementAny = typeof ElementAny['__type'];

const Child = combine(...ElementAny.types, 'Whitespace', 'Inject', 'Text', 'BlockComment', 'LineComment');
export type Child = typeof Child['__type'];

const CallableExpression = combine('FunctionCall', 'BracketMember', 'Identifier', 'DotMember', 'Parenthesis');
export type CallableExpression = typeof CallableExpression['__type'];

const Primitive = combine('Null', 'Undefined', 'Bool', 'Num', 'Str');
export type Primitive = typeof Primitive['__type'];

const ObjectOrArray = combine('Array', 'EmptyArray', 'Object', 'EmptyObject');
export type ObjectOrArray = typeof ObjectOrArray['__type'];

const ObjectPart = combine('PropertyShorthand', 'Property', 'ComputedProperty', 'Spread');
export type ObjectPart = typeof ObjectPart['__type'];

const DottableExpression = combine(...ElementAny.types, ...CallableExpression.types, ...ObjectOrArray.types, 'Str');
export type DottableExpression = typeof DottableExpression['__type'];

const AnyComment = combine('LineComment', 'BlockComment');
export type AnyComment = typeof AnyComment['__type'];

const WhitespaceOrComment = combine('Whitespace', ...AnyComment.types);
export type WhitespaceOrComment = typeof WhitespaceOrComment['__type'];

const Expression = combine(
  ...ElementAny.types,
  ...Primitive.types,
  ...ObjectOrArray.types,
  ...CallableExpression.types
);
export type Expression = typeof Expression['__type'];

export type MaybeWhitespace = Node<'Whitespace'> | null;

function nodeIsOneIf<T extends NodeType>(node: Node, types: ReadonlyArray<T>): node is Node<T> {
  return types.includes(node.type as any);
}

export function isValidNodeType(type: any): boolean {
  return type && typeof type === 'string' && NODES.includes(type as any);
}

const NodeIsInternal: { oneOf: typeof nodeIsOneIf } & {
  [K in NodeType]: (node: Node) => node is Node<K>;
} = NODES.reduce<any>(
  (acc, key) => {
    acc[key] = (node: Node) => node.type === key;
    return acc;
  },
  { oneOf: nodeIsOneIf }
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
  [K in NodeType]: (nodes: Nodes[K]['nodes'], meta: Nodes[K]['meta']) => Node<K>;
} = NODES.reduce<any>((acc, type) => {
  acc[type] = (nodes: Nodes[NodeType]['nodes'], meta: Nodes[NodeType]['meta']) => ({
    type,
    nodes,
    meta,
  });
  return acc;
}, {});

// type NodeTypeFromArray<T extends ReadonlyArray<NodeType>> = {
//   [K in T[number]]: Node<K>;
// }[T[number]];

type NodeTypeFromArray<T extends ReadonlyArray<NodeType>> = Node<T[number]>;

function combine<T extends ReadonlyArray<NodeType>>(
  ...types: T
): {
  (node: Node): node is NodeTypeFromArray<T>;
  types: T;
  __type: NodeTypeFromArray<T>;
} {
  const fn = ((node: Node) => types.includes(node.type)) as any;
  fn.types = types;
  return fn;
}
