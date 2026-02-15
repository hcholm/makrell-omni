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

export const ident = (value: string): IdentifierNode => ({ kind: "identifier", value });
export const num = (value: string): NumberNode => ({ kind: "number", value });
export const str = (value: string): StringNode => ({ kind: "string", value });
export const op = (value: string): OperatorNode => ({ kind: "operator", value });
export const bin = (left: Node, operator: string, right: Node): BinOpNode => ({ kind: "binop", left, op: operator, right });
export const curly = (nodes: Node[]): CurlyBracketsNode => ({ kind: "curly", nodes });
export const square = (nodes: Node[]): SquareBracketsNode => ({ kind: "square", nodes });
export const round = (nodes: Node[]): RoundBracketsNode => ({ kind: "round", nodes });

export const isIdent = (n: Node, wanted?: string): n is IdentifierNode => {
  return n.kind === "identifier" && (wanted === undefined || n.value === wanted);
};

export function isNode(v: unknown): v is Node {
  if (!v || typeof v !== "object") return false;
  const k = (v as { kind?: unknown }).kind;
  return typeof k === "string";
}