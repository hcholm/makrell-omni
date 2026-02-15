import { BinOpNode, Node, isIdent } from "./ast";

type Env = Record<string, unknown>;

export function matchPattern(value: unknown, pattern: Node): boolean {
  return !!matchWithEnv(value, pattern, {});
}

function matchWithEnv(value: unknown, pattern: Node, env: Env): Env | null {
  if (isIdent(pattern, "_")) return env;
  if (isIdent(pattern, "$")) return value ? env : null;

  if (pattern.kind === "identifier") {
    if (pattern.value === "true") return value === true ? env : null;
    if (pattern.value === "false") return value === false ? env : null;
    if (pattern.value === "null") return value === null ? env : null;
    return value === pattern.value ? env : null;
  }

  if (pattern.kind === "string") return value === pattern.value ? env : null;
  if (pattern.kind === "number") return Number(pattern.value) === value ? env : null;

  if (pattern.kind === "square") {
    if (!Array.isArray(value)) return null;
    if (value.length !== pattern.nodes.length) return null;
    let nextEnv: Env | null = env;
    for (let i = 0; i < pattern.nodes.length; i += 1) {
      if (!nextEnv) return null;
      nextEnv = matchWithEnv(value[i], pattern.nodes[i], nextEnv);
    }
    return nextEnv;
  }

  if (pattern.kind === "binop") {
    const bop = pattern as BinOpNode;

    if (bop.op === "|") {
      return matchWithEnv(value, bop.left, { ...env }) ?? matchWithEnv(value, bop.right, { ...env });
    }

    if (bop.op === "&") {
      const left = matchWithEnv(value, bop.left, { ...env });
      if (!left) return null;
      return matchWithEnv(value, bop.right, left);
    }

    if (bop.op === ":" && isIdent(bop.left, "_") && bop.right.kind === "identifier") {
      return checkType(value, bop.right.value) ? env : null;
    }

    if (bop.op === "=") {
      if (bop.left.kind !== "identifier") return null;
      const matched = matchWithEnv(value, bop.right, { ...env });
      if (!matched) return null;
      matched[bop.left.value] = value;
      return matched;
    }

    return evalWithValue(bop, value) ? env : null;
  }

  return null;
}

function checkType(value: unknown, typeName: string): boolean {
  if (typeName === "str" || typeName === "string") return typeof value === "string";
  if (typeName === "int") return Number.isInteger(value);
  if (typeName === "float") return typeof value === "number";
  if (typeName === "bool") return typeof value === "boolean";
  const ctor = (globalThis as Record<string, unknown>)[typeName];
  return typeof ctor === "function" && value instanceof (ctor as new (...args: unknown[]) => unknown);
}

function evalWithValue(node: Node, value: unknown): unknown {
  if (isIdent(node, "$")) return value;
  if (node.kind === "identifier") {
    if (node.value === "true") return true;
    if (node.value === "false") return false;
    if (node.value === "null") return null;
    return node.value;
  }
  if (node.kind === "number") return Number(node.value);
  if (node.kind === "string") return node.value;

  if (node.kind === "binop") {
    const left = evalWithValue(node.left, value);
    const right = evalWithValue(node.right, value);
    switch (node.op) {
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      case "<":
        return (left as number) < (right as number);
      case "<=":
        return (left as number) <= (right as number);
      case ">":
        return (left as number) > (right as number);
      case ">=":
        return (left as number) >= (right as number);
      case "+":
        return (left as number) + (right as number);
      case "-":
        return (left as number) - (right as number);
      case "*":
        return (left as number) * (right as number);
      case "/":
        return (left as number) / (right as number);
      case "&&":
        return Boolean(left) && Boolean(right);
      case "||":
        return Boolean(left) || Boolean(right);
      case ".":
        return (left as Record<string, unknown>)[String(right)];
      default:
        return false;
    }
  }

  if (node.kind === "round") {
    if (node.nodes.length === 1) return evalWithValue(node.nodes[0], value);
    return node.nodes.map((n) => evalWithValue(n, value));
  }

  if (node.kind === "square") {
    return node.nodes.map((n) => evalWithValue(n, value));
  }

  return null;
}