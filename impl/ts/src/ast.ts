export type Node =
  | IdentifierNode
  | StringNode
  | NumberNode
  | OperatorNode
  | BinOpNode
  | RoundBracketsNode
  | SquareBracketsNode
  | CurlyBracketsNode
  | SequenceNode;

export interface BaseNode {
  kind: string;
  loc?: SourceSpan;
}

export interface SourcePos {
  index: number;
  line: number;
  column: number;
}

export interface SourceSpan {
  start: SourcePos;
  end: SourcePos;
}

export interface IdentifierNode extends BaseNode {
  kind: "identifier";
  value: string;
}

export interface StringNode extends BaseNode {
  kind: "string";
  value: string;
}

export interface NumberNode extends BaseNode {
  kind: "number";
  value: string;
}

export interface OperatorNode extends BaseNode {
  kind: "operator";
  value: string;
}

export interface BinOpNode extends BaseNode {
  kind: "binop";
  left: Node;
  op: string;
  right: Node;
}

export interface RoundBracketsNode extends BaseNode {
  kind: "round";
  nodes: Node[];
}

export interface SquareBracketsNode extends BaseNode {
  kind: "square";
  nodes: Node[];
}

export interface CurlyBracketsNode extends BaseNode {
  kind: "curly";
  nodes: Node[];
}

export interface SequenceNode extends BaseNode {
  kind: "sequence";
  nodes: Node[];
}

export const ident = (value: string, loc?: SourceSpan): IdentifierNode => ({ kind: "identifier", value, loc });
export const num = (value: string, loc?: SourceSpan): NumberNode => ({ kind: "number", value, loc });
export const str = (value: string, loc?: SourceSpan): StringNode => ({ kind: "string", value, loc });
export const op = (value: string, loc?: SourceSpan): OperatorNode => ({ kind: "operator", value, loc });
export const bin = (left: Node, operator: string, right: Node, loc?: SourceSpan): BinOpNode => ({
  kind: "binop",
  left,
  op: operator,
  right,
  loc,
});
export const curly = (nodes: Node[], loc?: SourceSpan): CurlyBracketsNode => ({ kind: "curly", nodes, loc });
export const square = (nodes: Node[], loc?: SourceSpan): SquareBracketsNode => ({ kind: "square", nodes, loc });
export const round = (nodes: Node[], loc?: SourceSpan): RoundBracketsNode => ({ kind: "round", nodes, loc });

export const isIdent = (n: Node, wanted?: string): n is IdentifierNode => {
  return n.kind === "identifier" && (wanted === undefined || n.value === wanted);
};

export function isNode(v: unknown): v is Node {
  if (!v || typeof v !== "object") return false;
  const k = (v as { kind?: unknown }).kind;
  return typeof k === "string";
}
