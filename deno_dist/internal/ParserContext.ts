import * as Ast from '../Ast.ts';
import * as p from './parsers.ts';
import { Parser } from './types.ts';

export type Ranges = Map<Ast.Node, { start: number; end: number }>;

export type ParserContext = {
  ranges: Ranges;
  createNode<K extends Ast.NodeKind>(
    kind: K,
    start: number,
    end: number,
    children: Ast.NodeData<K>['children'],
    meta: Ast.NodeData<K>['meta']
  ): Ast.Node<K>;
};

export function createContext(): ParserContext {
  const ranges: Ranges = new Map();
  return {
    ranges,
    createNode<K extends Ast.NodeKind>(
      kind: K,
      start: number,
      end: number,
      children: Ast.NodeData<K>['children'],
      meta: Ast.NodeData<K>['meta']
    ): Ast.Node<K> {
      return createNode(ranges, kind, start, end, children, meta);
    },
  };
}

export function createNode<K extends Ast.NodeKind>(
  ranges: Ranges,
  kind: K,
  start: number,
  end: number,
  children: Ast.NodeData<K>['children'],
  meta: Ast.NodeData<K>['meta']
): Ast.Node<K> {
  const node: Ast.Node<K> = { kind, meta, ...children } as any;
  ranges.set(node, { start, end });
  return node;
}

export function rule<T>(name: string) {
  return p.rule<T, ParserContext>(name);
}

type NodeContent<K extends Ast.NodeKind> = {
  children: Ast.Nodes[K]['children'];
  meta: Ast.Nodes[K]['meta'];
};

export function nodeParser<K extends Ast.NodeKind>(kind: K, parser: Parser<NodeContent<K>, ParserContext>) {
  return p.apply(parser, (res, start, end, ctx) => ctx.createNode(kind, start, end, res.children, res.meta));
}

export function nodeData<K extends Ast.NodeKind>(
  children: Ast.Nodes[K]['children'],
  meta: Ast.Nodes[K]['meta']
): NodeContent<K> {
  return { children, meta };
}
