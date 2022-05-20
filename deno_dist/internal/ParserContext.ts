import * as Ast from '../Ast.ts';
import { Parsed } from '../Parsed.ts';
import * as p from './parsers.ts';
import { Parser, Ranges } from './types.ts';

export type ParserContext<T extends Ast.Node = any> = {
  ranges: Ranges;
  parsed: Parsed<T>;
  createNode<K extends Ast.NodeKind>(
    kind: K,
    start: number,
    end: number,
    children: Ast.NodeData<K>['children'],
    meta: Ast.NodeData<K>['meta']
  ): Ast.Node<K>;
};

export function createContext<T extends Ast.Node>(filename: string, source: string): ParserContext<T> {
  const ranges: Ranges = new Map();
  const parsed = new Parsed<T>(filename, source, ranges);
  return {
    ranges,
    parsed,
    createNode<K extends Ast.NodeKind>(
      kind: K,
      start: number,
      end: number,
      children: Ast.NodeData<K>['children'],
      meta: Ast.NodeData<K>['meta']
    ): Ast.Node<K> {
      return createNodeWithRange(parsed, ranges, kind, start, end, children, meta);
    },
  };
}

export function createNodeWithRange<K extends Ast.NodeKind>(
  parsed: Parsed<any>,
  ranges: Ranges,
  kind: K,
  start: number,
  end: number,
  children: Ast.NodeData<K>['children'],
  meta: Ast.NodeData<K>['meta']
): Ast.Node<K> {
  const node: Ast.Node<K> = Ast.createNode(kind, children, meta, parsed);
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
