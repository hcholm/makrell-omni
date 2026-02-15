import { BinOpNode, CurlyBracketsNode, IdentifierNode, Node, isIdent } from "./ast";

type Env = Record<string, unknown>;

export interface PatternHook {
  name: string;
  canHandle: (pattern: Node) => boolean;
  match: (value: unknown, pattern: Node, env: Env, next: (value: unknown, pattern: Node, env: Env) => Env | null) => Env | null;
}

const patternHooks: PatternHook[] = [];

export function registerPatternHook(hook: PatternHook): void {
  patternHooks.unshift(hook);
}

export function clearPatternHooks(): void {
  patternHooks.length = 0;
}

export function matchPattern(value: unknown, pattern: Node): boolean {
  return !!matchWithEnv(value, pattern, {});
}

function matchWithEnv(value: unknown, pattern: Node, env: Env): Env | null {
  for (const hook of patternHooks) {
    if (hook.canHandle(pattern)) {
      return hook.match(value, pattern, env, matchWithEnv);
    }
  }

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
  if (pattern.kind === "round") {
    if (pattern.nodes.length === 0) return value === null ? env : null;
    if (pattern.nodes.length === 1) return matchWithEnv(value, pattern.nodes[0], env);
    for (const pn of pattern.nodes) {
      const m = matchWithEnv(value, pn, { ...env });
      if (m) return m;
    }
    return null;
  }

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

  if (pattern.kind === "curly") {
    if (isCurlyHead(pattern, "$r")) return matchRegular(value, pattern, env);
    if (isCurlyHead(pattern, "$type")) return matchTypeCtor(value, pattern, env);
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

function isCurlyHead(n: CurlyBracketsNode, wanted: string): boolean {
  return n.nodes.length > 0 && n.nodes[0].kind === "identifier" && n.nodes[0].value === wanted;
}

function checkType(value: unknown, typeName: string): boolean {
  if (typeName === "str" || typeName === "string") return typeof value === "string";
  if (typeName === "int") return Number.isInteger(value);
  if (typeName === "float" || typeName === "number") return typeof value === "number";
  if (typeName === "bool" || typeName === "boolean") return typeof value === "boolean";
  if (typeName === "list" || typeName === "array") return Array.isArray(value);
  if (typeName === "dict" || typeName === "object") return !!value && typeof value === "object" && !Array.isArray(value);
  if (value && typeof value === "object") {
    const ctorName = (value as { constructor?: { name?: string } }).constructor?.name;
    if (ctorName === typeName) return true;
  }
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
      case "%":
        return (left as number) % (right as number);
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

function matchRegular(value: unknown, pattern: CurlyBracketsNode, env: Env): Env | null {
  if (!Array.isArray(value)) return null;
  const parts = pattern.nodes.slice(1);

  const matchesPart = (v: unknown, p: Node): boolean => {
    return !!matchWithEnv(v, p, {});
  };

  const quantBounds = (q: Node): [number, number | null] | null => {
    if (q.kind === "number") {
      const n = Number(q.value);
      if (!Number.isFinite(n)) return null;
      return [n, n];
    }
    if (q.kind === "identifier") {
      const key = q.value.startsWith("$") ? q.value.slice(1) : q.value;
      if (key === "maybe") return [0, 1];
      if (key === "some") return [1, null];
      if (key === "any") return [0, null];
      return null;
    }
    if (q.kind === "round" && q.nodes.length === 1) {
      return quantBounds(q.nodes[0]);
    }
    if (q.kind === "binop" && q.op === ".." && q.left.kind === "number" && q.right.kind === "number") {
      return [Number(q.left.value), Number(q.right.value)];
    }
    return null;
  };

  const step = (vi: number, pi: number): boolean => {
    if (pi >= parts.length) return vi === value.length;
    const p = parts[pi];

    if (p.kind === "identifier" && p.value === "$rest") return true;

    if (p.kind === "binop" && p.op === "*") {
      const b = quantBounds(p.left);
      if (!b) return false;
      const [minCount, maxCount] = b;
      const maxTry = maxCount === null ? value.length - vi : Math.min(maxCount, value.length - vi);
      for (let count = minCount; count <= maxTry; count += 1) {
        let ok = true;
        for (let k = 0; k < count; k += 1) {
          if (!matchesPart(value[vi + k], p.right)) {
            ok = false;
            break;
          }
        }
        if (ok && step(vi + count, pi + 1)) return true;
      }
      return false;
    }

    if (vi >= value.length) return false;
    if (!matchesPart(value[vi], p)) return false;
    return step(vi + 1, pi + 1);
  };

  return step(0, 0) ? env : null;
}

function matchTypeCtor(value: unknown, pattern: CurlyBracketsNode, env: Env): Env | null {
  if (pattern.nodes.length < 2) return null;
  const typeNode = pattern.nodes[1];
  if (typeNode.kind !== "identifier") return null;
  if (!checkType(value, typeNode.value)) return null;
  if (!value || typeof value !== "object") return env;

  let positional: Node[] | null = null;
  const keywords: Array<{ key: string; patt: Node }> = [];

  for (const extra of pattern.nodes.slice(2)) {
    if (extra.kind !== "square") return null;
    if (extra.nodes.length === 0) continue;

    const allKw = extra.nodes.every((x) => x.kind === "binop" && x.op === "=" && x.left.kind === "identifier");
    const anyKw = extra.nodes.some((x) => x.kind === "binop" && x.op === "=");

    if (anyKw && !allKw) return null;
    if (allKw) {
      for (const n of extra.nodes) {
        const b = n as BinOpNode;
        keywords.push({ key: (b.left as IdentifierNode).value, patt: b.right });
      }
      continue;
    }
    if (positional) return null;
    positional = extra.nodes;
  }

  if (positional) {
    const maybeMatchArgs = (value as { __match_args__?: unknown }).__match_args__;
    const matchArgs = Array.isArray(maybeMatchArgs)
      ? maybeMatchArgs.filter((x): x is string => typeof x === "string")
      : Object.keys(value as Record<string, unknown>);
    if (matchArgs.length < positional.length) return null;
    for (let i = 0; i < positional.length; i += 1) {
      const key = matchArgs[i];
      const v = (value as Record<string, unknown>)[key];
      if (!matchWithEnv(v, positional[i], { ...env })) return null;
    }
  }

  for (const kw of keywords) {
    const v = (value as Record<string, unknown>)[kw.key];
    if (!matchWithEnv(v, kw.patt, { ...env })) return null;
  }

  return env;
}
