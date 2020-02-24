import { Position } from './InputStream';

export interface Nodes {
  Document: {
    children: Array<Children>;
  };
  Element: {
    component: ComponentType;
    props: Array<Prop>;
    children: null | Array<Children>;
  };
  Null: {};
  Undefined: {};
  Text: {
    content: string;
  };
  EmptyLine: {};
  Str: {
    value: string;
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
    items: Array<Expression>;
  };
  ObjectSpread: {
    target: Expression;
  };
  FunctionCall: {
    target: Expression;
    arguments: Array<Expression>;
  };
  Prop: {
    name: Node<'ComputedProperty' | 'Identifier'>;
    value: Expression;
  };
  NoValueProp: {
    name: Node<'Identifier'>;
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

export type Node<K extends NodeType = NodeType> = {
  [K in NodeType]: Nodes[K] & { type: K } & NodeCommon;
}[K];

const NODES_OBJ: { [K in NodeType]: null } = {
  Bool: null,
  ComputedProperty: null,
  Document: null,
  Element: null,
  Identifier: null,
  EmptyLine: null,
  Num: null,
  Prop: null,
  Str: null,
  Text: null,
  Array: null,
  FunctionCall: null,
  Null: null,
  Object: null,
  ObjectSpread: null,
  Undefined: null,
  BracketMember: null,
  DotMember: null,
  ElementTypeMember: null,
  NoValueProp: null,
  PropertyShorthand: null,
  Property: null,
  Spread: null,
  Parenthesis: null,
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
export type Children = Node<'Element' | 'Text' | 'EmptyLine'>;
export type Document = Node<'Document'>;
export type ComponentType = Node<'ElementTypeMember' | 'Identifier'>;
// cannot . on number
export type DottableExpression = Node<Exclude<Expression['type'], 'Num'>>;
export type Prop = Node<'NoValueProp' | 'Prop'>;
export type ObjectItem = Node<'PropertyShorthand' | 'Property' | 'ComputedProperty' | 'Spread'>;
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
