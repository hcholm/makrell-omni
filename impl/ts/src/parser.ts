import { BinOpNode, CurlyBracketsNode, Node, OperatorNode, RoundBracketsNode, SequenceNode, SquareBracketsNode } from "./ast";
import { tokenize } from "./tokenizer";

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

function parseBrackets(src: string): SequenceNode {
  const toks = tokenize(src);
  const stack: Array<SequenceNode | RoundBracketsNode | SquareBracketsNode | CurlyBracketsNode> = [{ kind: "sequence", nodes: [] }];

  for (const t of toks) {
    if (t.kind === "lpar") {
      let b: RoundBracketsNode | SquareBracketsNode | CurlyBracketsNode;
      if (t.value === "(") b = { kind: "round", nodes: [] };
      else if (t.value === "[") b = { kind: "square", nodes: [] };
      else b = { kind: "curly", nodes: [] };
      stack.push(b);
      continue;
    }

    if (t.kind === "rpar") {
      if (stack.length <= 1) throw new Error(`Unexpected closing bracket ${t.value}`);
      const done = stack.pop() as Node;
      const parent = stack[stack.length - 1];
      parent.nodes.push(done);
      continue;
    }

    stack[stack.length - 1].nodes.push(t);
  }

  if (stack.length !== 1) throw new Error("Unmatched opening bracket");
  return stack[0] as SequenceNode;
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
    if (!left || !right || !oper) throw new Error("Malformed expression");
    output.push({ kind: "binop", left, op: oper.value, right } as BinOpNode);
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
    return { ...n, nodes: kids } as Node;
  }
  return n;
}

export function parse(src: string): Node[] {
  const root = parseBrackets(src);
  return operatorParseNodes(root.nodes);
}