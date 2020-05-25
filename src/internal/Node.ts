export type QuoteType = 'Single' | 'Double' | 'Backtick';

type ArrayOfNodes = Array<Node>;

export type NodeNodesItem = null | Node | ArrayOfNodes | NodeNodesBase;

export type NodeNodesBase = { [key: string]: NodeNodesItem };

export type NodeMetaBase = { [key: string]: string | number | null | boolean };

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
  Document: CreateNode<{ children: Array<Children> }>;
  SelfClosingElement: CreateNode<{ component: ComponentType; props: Node<'Props'> }>;
  Element: CreateNode<
    {
      component: ComponentType;
      props: Node<'Props'>;
      children: Array<Children>;
    },
    {
      namedCloseTag: boolean;
    }
  >;
  RawElement: CreateNode<
    {
      component: ComponentType;
      props: Node<'Props'>;
      children: Array<Children>;
    },
    {
      namedCloseTag: boolean;
    }
  >;
  Whitespace: CreateNode<{}, { content: string; hasNewLine: boolean }>;
  Fragment: CreateNode<{ children: Array<Children> }>;
  RawFragment: CreateNode<{ children: Array<Children> }>;
  Props: CreateNode<{ items: Array<Node<'PropItem'>>; whitespaceAfter: MaybeWhitespace }, {}>;
  PropItem: CreateNode<
    {
      whitespaceBefore: Node<'Whitespace'>;
      item: Prop;
    },
    {}
  >;
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
  FunctionCall: CreateNode<{ target: Expression; arguments: Array<Node<'ArrayItem'>> }>;
  Identifier: CreateNode<{}, { name: string }>;
  DotMember: CreateNode<{ target: DottableExpression; property: Node<'Identifier'> }>;
  Parenthesis: CreateNode<{ value: Expression }>;
  BracketMember: CreateNode<{ target: Expression; property: Expression }>;
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
  Inject: null,
  Bool: null,
  BracketMember: null,
  ComputedProperty: null,
  Document: null,
  DotMember: null,
  Element: null,
  ElementTypeMember: null,
  Fragment: null,
  FunctionCall: null,
  EmptyArray: null,
  EmptyObject: null,
  Identifier: null,
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

function nodeIsOneIf<T extends NodeType>(node: Node, types: ReadonlyArray<T>): node is Node<T> {
  return types.includes(node.type as any);
}

export function isValidNodeType(type: any): boolean {
  return type && typeof type === 'string' && NODES.includes(type as any);
}

export const NodeIs: { oneOf: typeof nodeIsOneIf } & {
  [K in NodeType]: (node: Node) => node is Node<K>;
} = NODES.reduce<any>(
  (acc, key) => {
    acc[key] = (node: Node) => node.type === key;
    return acc;
  },
  { oneOf: nodeIsOneIf }
);

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

// Alias
export type Document = Node<'Document'>;
export type ComponentType = Node<'ElementTypeMember' | 'Identifier'>;
export type DottableExpression = Node<Exclude<Expression['type'], 'Num'>>; // cannot . on number
export type Prop = Node<'PropNoValue' | 'PropValue' | 'PropLineComment' | 'PropBlockComment'>;
export type Children = Node<
  | 'Whitespace'
  | 'Inject'
  | 'Text'
  | 'Element'
  | 'SelfClosingElement'
  | 'LineComment'
  | 'BlockComment'
  | 'Fragment'
  | 'RawFragment'
  | 'RawElement'
>;
export type Expression = Node<
  | 'Null'
  | 'Undefined'
  | 'Bool'
  | 'Num'
  | 'Str'
  | 'Array'
  | 'EmptyArray'
  | 'Object'
  | 'EmptyObject'
  | 'Element'
  | 'DotMember'
  | 'BracketMember'
  | 'Identifier'
  | 'FunctionCall'
  | 'Parenthesis'
>;
export type ObjectPart = Node<'PropertyShorthand' | 'Property' | 'ComputedProperty' | 'Spread'>;
export type MaybeWhitespace = Node<'Whitespace'> | null;
