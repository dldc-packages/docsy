import * as Ast from '../Ast';
import { Parsed } from '../Parsed';
import * as p from './parsers';
import { Parser, Ranges } from './types';

export type ParserContext<T extends Ast.Node = any> = {
  ranges: Ranges;
  parsed: Parsed<T>;
  createNode<K extends Ast.NodeKind>(kind: K, start: number, end: number, content: Ast.NodeContent<K>): Ast.Node<K>;
};

export function createContext<T extends Ast.Node>(filename: string, source: string): ParserContext<T> {
  const ranges: Ranges = new Map();
  const parsed = new Parsed<T>(filename, source, ranges);
  return {
    ranges,
    parsed,
    createNode<K extends Ast.NodeKind>(kind: K, start: number, end: number, content: Ast.NodeContent<K>): Ast.Node<K> {
      return createNodeWithRange(parsed, ranges, kind, start, end, content);
    },
  };
}

export function createNodeWithRange<K extends Ast.NodeKind>(
  parsed: Parsed<any>,
  ranges: Ranges,
  kind: K,
  start: number,
  end: number,
  content: Ast.NodeContent<K>
): Ast.Node<K> {
  const node: Ast.Node<K> = Ast.createNode(kind, content, parsed);
  ranges.set(node, { start, end });
  return node;
}

export function rule<T>(name: string) {
  return p.rule<T, ParserContext>(name);
}

export function nodeParser<K extends Ast.NodeKind>(kind: K, parser: Parser<Ast.NodeContent<K>, ParserContext>) {
  return p.apply(parser, (res, start, end, ctx) => ctx.createNode(kind, start, end, res));
}
