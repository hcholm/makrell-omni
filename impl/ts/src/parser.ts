import {
  BinOpNode,
  CurlyBracketsNode,
  Node,
  OperatorNode,
  RoundBracketsNode,
  SequenceNode,
  SourcePos,
  SourceSpan,
  SquareBracketsNode,
} from "./ast";
import { BracketToken, tokenize } from "./tokenizer";

const precedence: Record<string, [number, "left" | "right"]> = {
  "=": [5, "right"],
  "->": [10, "right"],
  "|": [20, "left"],
  "||": [30, "left"],
  "&&": [40, "left"],
  "==": [50, "left"],
  "!=": [50, "left"],
  "<": [55, "left"],
  "<=": [55, "left"],
  ">": [55, "left"],
  ">=": [55, "left"],
  ":": [58, "left"],
  "..": [60, "left"],
  "+": [70, "left"],
  "-": [70, "left"],
  "*": [80, "left"],
  "/": [80, "left"],
  "%": [80, "left"],
  "**": [90, "right"],
  "@": [95, "left"],
  "'": [100, "left"],
  ".": [110, "left"],
};

function opInfo(operator: string): [number, "left" | "right"] {
  return precedence[operator] ?? [0, "left"];
}

function mergeLoc(a?: SourceSpan, b?: SourceSpan): SourceSpan | undefined {
  if (!a) return b;
  if (!b) return a;
  return { start: a.start, end: b.end };
}

function rootLoc(): SourceSpan {
  const p: SourcePos = { index: 0, line: 1, column: 1 };
  return { start: p, end: p };
}

function parseBrackets(src: string): SequenceNode {
  const toks = tokenize(src);
  const stack: Array<{
    node: SequenceNode | RoundBracketsNode | SquareBracketsNode | CurlyBracketsNode;
    open?: BracketToken;
  }> = [{ node: { kind: "sequence", nodes: [], loc: rootLoc() } }];

  const closeFor: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

  for (const t of toks) {
    if (t.kind === "lpar") {
      let b: RoundBracketsNode | SquareBracketsNode | CurlyBracketsNode;
      if (t.value === "(") b = { kind: "round", nodes: [] };
      else if (t.value === "[") b = { kind: "square", nodes: [] };
      else b = { kind: "curly", nodes: [] };
      stack.push({ node: b, open: t });
      continue;
    }

    if (t.kind === "rpar") {
      if (stack.length <= 1) throw new Error(`Unexpected closing bracket ${t.value}`);
      const doneFrame = stack.pop() as { node: Node; open: BracketToken };
      const expected = closeFor[doneFrame.open.value];
      if (expected !== t.value) {
        throw new Error(`Mismatched closing bracket ${t.value}, expected ${expected}`);
      }
      doneFrame.node.loc = {
        start: doneFrame.open.loc.start,
        end: t.loc.end,
      };
      const parent = stack[stack.length - 1].node;
      parent.nodes.push(doneFrame.node);
      continue;
    }

    stack[stack.length - 1].node.nodes.push(t);
  }

  if (stack.length !== 1) {
    const last = stack[stack.length - 1];
    const where = last.open?.loc
      ? ` at line ${last.open.loc.start.line}, col ${last.open.loc.start.column}`
      : "";
    throw new Error(`Unmatched opening bracket${where}`);
  }
  return stack[0].node as SequenceNode;
}

export function operatorParseNodes(nodes: Node[]): Node[] {
  const output: Node[] = [];
  const ops: OperatorNode[] = [];
  let lastWasNotOp = true;

  const hasOps = (): boolean => ops.length > 0;

  const applyOne = (): void => {
    const right = output.pop();
    const left = output.pop();
    const oper = ops.pop();
    if (!left || !right || !oper) {
      const where = oper?.loc ? ` at line ${oper.loc.start.line}, col ${oper.loc.start.column}` : "";
      throw new Error(`Malformed expression${where}`);
    }
    output.push({
      kind: "binop",
      left,
      op: oper.value,
      right,
      loc: mergeLoc(mergeLoc(left.loc, oper.loc), right.loc),
    } as BinOpNode);
  };

  const applyAll = (): void => {
    while (hasOps()) applyOne();
  };

  for (const n of nodes) {
    if (n.kind === "operator") {
      const [currentPrio] = opInfo(n.value);
      if (!hasOps()) {
        ops.push(n);
      } else {
        while (hasOps()) {
          const top = ops[ops.length - 1];
          const [stackPrio, stackAssoc] = opInfo(top.value);
          if (stackPrio > currentPrio || (stackPrio === currentPrio && stackAssoc === "left")) {
            applyOne();
          } else {
            break;
          }
        }
        ops.push(n);
      }
      lastWasNotOp = false;
      continue;
    }

    if (lastWasNotOp) applyAll();
    output.push(transform(n));
    lastWasNotOp = true;
  }

  applyAll();
  return output;
}

function transform(n: Node): Node {
  if (n.kind === "curly" || n.kind === "round" || n.kind === "square" || n.kind === "sequence") {
    const kids = operatorParseNodes(n.nodes);
    return { ...n, nodes: kids, loc: n.loc } as Node;
  }
  return n;
}

export function parse(src: string): Node[] {
  const root = parseBrackets(src);
  return operatorParseNodes(root.nodes);
}
