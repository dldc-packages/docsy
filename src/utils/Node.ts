import { Position } from './InputStream';

export type QuoteType = 'Single' | 'Double' | 'Backtick';

export interface Nodes {
  Document: {
    children: Array<Children>;
  };
  SelfClosingElement: {
    component: ComponentType;
    props: Node<'Props'>;
  };
  Element: {
    component: ComponentType;
    props: Node<'Props'>;
    children: Array<Children>;
    namedCloseTag: boolean;
  };
  RawElement: {
    component: ComponentType;
    props: Node<'Props'>;
    children: Array<Children>;
    namedCloseTag: boolean;
  };
  Fragment: {
    children: Array<Children>;
  };
  RawFragment: {
    children: Array<Children>;
  };
  Props: {
    items: Array<PropItem>;
    // space before the props
    whitespace: string;
  };
  Prop: {
    name: Node<'Identifier'>;
    value: Expression;
    whitespace: string | false;
  };
  NoValueProp: {
    name: Node<'Identifier'>;
    whitespace: string | false;
  };
  PropLineComment: {
    content: string;
    whitespace: string | false;
  };
  PropBlockComment: {
    content: string;
    whitespace: string | false;
  };
  LineComment: {
    content: string;
  };
  BlockComment: {
    content: string;
  };
  Null: {};
  Undefined: {};
  Text: {
    content: string;
  };
  Str: {
    value: string;
    quote: QuoteType;
  };
  Bool: {
    value: boolean;
  };
  Num: {
    value: number;
    rawValue: string;
  };
  Object: {
    items: Array<ObjectItem>;
  };
  PropertyShorthand: {
    name: Node<'Identifier'>;
  };
  Property: {
    name: Node<'Str' | 'Identifier'>;
    value: Expression;
  };
  Array: {
    items: Array<ArrayItem>;
  };
  ObjectSpread: {
    target: Expression;
  };
  FunctionCall: {
    target: Expression;
    arguments: Array<ArrayItem>;
  };
  ComputedProperty: {
    expression: Expression;
    value: Expression;
  };
  Identifier: {
    name: string;
  };
  DotMember: {
    target: DottableExpression;
    property: Node<'Identifier'>;
  };
  Parenthesis: {
    value: Expression;
  };
  BracketMember: {
    target: Expression;
    property: Expression;
  };
  ElementTypeMember: {
    target: Node<'Identifier' | 'ElementTypeMember'>;
    property: Node<'Identifier'>;
  };
  Spread: {
    target: Expression;
  };
}

export type NodeType = keyof Nodes;

type NodeCommon = {
  position?: {
    start: Position;
    end: Position;
  };
};

// export type Node<K extends NodeType = NodeType> = {
//   [K in NodeType]: Nodes[K] & { type: K } & NodeCommon;
// }[K];

// export interface NodeNode<K extends NodeType = NodeType> {
//   [K in keyof Nodes[K]]: number;
// }

export type Node<K extends NodeType = NodeType> = {
  [J in keyof Nodes[K]]: Nodes[K][J];
} & { type: K } & NodeCommon;

const NODES_OBJ: { [K in NodeType]: null } = {
  Array: null,
  BlockComment: null,
  Bool: null,
  BracketMember: null,
  ComputedProperty: null,
  Document: null,
  DotMember: null,
  Element: null,
  RawElement: null,
  Fragment: null,
  RawFragment: null,
  Props: null,
  ElementTypeMember: null,
  FunctionCall: null,
  Identifier: null,
  LineComment: null,
  NoValueProp: null,
  Null: null,
  Num: null,
  Object: null,
  ObjectSpread: null,
  Parenthesis: null,
  Prop: null,
  PropBlockComment: null,
  PropLineComment: null,
  Property: null,
  PropertyShorthand: null,
  SelfClosingElement: null,
  Spread: null,
  Str: null,
  Text: null,
  Undefined: null,
};

const NODES = Object.keys(NODES_OBJ) as Array<NodeType>;

function nodeIsOneIf<T extends NodeType>(node: Node, types: ReadonlyArray<T>): node is Node<T> {
  return types.includes(node.type as any);
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
  [K in NodeType]: (data: Nodes[K]) => Node<K>;
} = NODES.reduce<any>((acc, type) => {
  acc[type] = (data: Nodes[NodeType]) => ({
    type,
    ...data,
  });
  return acc;
}, {});

// Alias
export type Document = Node<'Document'>;
export type ComponentType = Node<'ElementTypeMember' | 'Identifier'>;
export type DottableExpression = Node<Exclude<Expression['type'], 'Num'>>; // cannot . on number
export type PropItem = Node<'NoValueProp' | 'Prop' | 'PropLineComment' | 'PropBlockComment'>;
export type ObjectItem = Node<'PropertyShorthand' | 'Property' | 'ComputedProperty' | 'Spread'>;
export type ArrayItem = Expression | Node<'Spread'>;
export type Children = Node<
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
  | 'Object'
  | 'Element'
  | 'DotMember'
  | 'BracketMember'
  | 'Identifier'
  | 'FunctionCall'
  | 'Parenthesis'
>;
