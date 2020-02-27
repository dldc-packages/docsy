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
  Props: {
    items: Array<PropItem>;
  };
  Prop: {
    name: Node<'Identifier'>;
    value: Expression;
  };
  NoValueProp: {
    name: Node<'Identifier'>;
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
  Property: null,
  PropertyShorthand: null,
  SelfClosingElement: null,
  Spread: null,
  Str: null,
  Text: null,
  Undefined: null,
};

const NODES = Object.keys(NODES_OBJ) as Array<NodeType>;

export const NodeIs: {
  [K in NodeType]: (node: Node) => node is Node<K>;
} = NODES.reduce<any>((acc, key) => {
  acc[key] = (node: Node) => node.type === key;
  return acc;
}, {});

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
export type Children = Node<
  'Text' | 'Element' | 'SelfClosingElement' | 'LineComment' | 'BlockComment'
>;
export type Document = Node<'Document'>;
export type ComponentType = Node<'ElementTypeMember' | 'Identifier'>;
// cannot . on number
export type DottableExpression = Node<Exclude<Expression['type'], 'Num'>>;
export type PropItem = Node<'NoValueProp' | 'Prop'>;
export type ObjectItem = Node<'PropertyShorthand' | 'Property' | 'ComputedProperty' | 'Spread'>;
export type ArrayItem = Expression | Node<'Spread'>;
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
