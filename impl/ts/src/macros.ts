import {
  Node,
  bin,
  curly,
  ident,
  isIdent,
  isNode,
  num,
  op,
  round,
  square,
  str,
} from "./ast";
import { operatorParseNodes, parse } from "./parser";

export type MacroFn = (args: Node[], ctx: MacroContext) => Node | Node[];
export interface MakrellMacroEntry {
  kind: "makrell";
  params: string[];
  body: Node[];
}

export interface NativeMacroEntry {
  kind: "native";
  fn: MacroFn;
}

export type MacroEntry = MakrellMacroEntry | NativeMacroEntry;

export interface SerializedMakrellMacro {
  name: string;
  params: string[];
  body: Node[];
}

export interface MacroContext {
  regular(nodes: Node[]): Node[];
  parse(src: string): Node[];
  operatorParse(nodes: Node[]): Node[];
}

type MacroValue =
  | Node
  | Node[]
  | string
  | number
  | boolean
  | null
  | MacroValue[]
  | ((...args: MacroValue[]) => MacroValue)
  | Record<string, unknown>;

class ReturnSignal {
  value: MacroValue;

  constructor(value: MacroValue) {
    this.value = value;
  }
}

class Env {
  private readonly own = new Map<string, MacroValue>();
  private readonly parent?: Env;

  constructor(parent?: Env) {
    this.parent = parent;
  }

  has(name: string): boolean {
    if (this.own.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  set(name: string, value: MacroValue): void {
    if (this.own.has(name)) {
      this.own.set(name, value);
      return;
    }
    if (this.parent && this.parent.has(name)) {
      this.parent.set(name, value);
      return;
    }
    this.own.set(name, value);
  }

  get(name: string): MacroValue {
    if (this.own.has(name)) return this.own.get(name) as MacroValue;
    if (this.parent) return this.parent.get(name);
    throw new Error(`Unknown macro symbol: ${name}`);
  }
}

function regular(nodes: Node[]): Node[] {
  return nodes;
}

function isNodeList(v: unknown): v is Node[] {
  return Array.isArray(v) && v.every((x) => isNode(x));
}

function toNode(v: MacroValue): Node {
  if (isNode(v)) return v;
  if (typeof v === "string") return str(v);
  if (typeof v === "number") return num(String(v));
  if (typeof v === "boolean") return ident(v ? "true" : "false");
  if (v === null) return ident("null");
  if (isNodeList(v)) return square(v);
  throw new Error(`Macro returned value that cannot be converted to AST node: ${String(v)}`);
}

function ctor(name: string): { __nodeCtor: string } {
  return { __nodeCtor: name };
}

function nodeCtorName(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const n = (v as { __nodeCtor?: unknown }).__nodeCtor;
  return typeof n === "string" ? n : null;
}

function isTruthy(v: MacroValue): boolean {
  return Boolean(v);
}

function evalBinOp(n: Extract<Node, { kind: "binop" }>, env: Env, ctx: MacroContext): MacroValue {
  if (n.op === "=") {
    if (n.left.kind !== "identifier") throw new Error("Macro assignment left side must be identifier");
    const value = evalMacroNode(n.right, env, ctx);
    env.set(n.left.value, value);
    return value;
  }

  if (n.op === "->") {
    const params: string[] = [];
    if (n.left.kind === "identifier") {
      params.push(n.left.value);
    } else if (n.left.kind === "square") {
      for (const p of n.left.nodes) {
        if (p.kind !== "identifier") throw new Error("Lambda params must be identifiers");
        params.push(p.value);
      }
    } else {
      throw new Error("Invalid lambda params");
    }

    return (...args: MacroValue[]): MacroValue => {
      const fnEnv = new Env(env);
      for (let i = 0; i < params.length; i += 1) fnEnv.set(params[i], args[i] ?? null);
      return evalMacroNode(n.right, fnEnv, ctx);
    };
  }

  if (n.op === "|") {
    const left = evalMacroNode(n.left, env, ctx);
    if (n.right.kind === "identifier") {
      const f = env.get(n.right.value);
      if (typeof f !== "function") throw new Error(`Pipe target '${n.right.value}' is not callable`);
      return f(left);
    }
    const callee = evalMacroNode(n.right, env, ctx);
    if (typeof callee !== "function") throw new Error("Pipe target is not callable");
    return callee(left);
  }

  switch (n.op) {
    case "+": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as number) + (right as number);
    }
    case "-": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as number) - (right as number);
    }
    case "*": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as number) * (right as number);
    }
    case "/": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as number) / (right as number);
    }
    case "%": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as number) % (right as number);
    }
    case "==": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left === right;
    }
    case "!=": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left !== right;
    }
    case "<": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as number) < (right as number);
    }
    case "<=": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as number) <= (right as number);
    }
    case ">": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as number) > (right as number);
    }
    case ">=": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as number) >= (right as number);
    }
    case "&&": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return Boolean(left) && Boolean(right);
    }
    case "||": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return Boolean(left) || Boolean(right);
    }
    case "@": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return (left as MacroValue[])[Number(right)];
    }
    case ".": {
      const left = evalMacroNode(n.left, env, ctx);
      const key = n.right.kind === "identifier" ? n.right.value : String(evalMacroNode(n.right, env, ctx));
      return (left as Record<string, MacroValue>)[key] ?? null;
    }
    default:
      throw new Error(`Unsupported macro binop: ${n.op}`);
  }
}

function evalQuoteNode(n: Node, env: Env, ctx: MacroContext): Node | Node[] {
  if (n.kind === "curly" && n.nodes.length > 0 && n.nodes[0].kind === "identifier" && (n.nodes[0].value === "unquote" || n.nodes[0].value === "$")) {
    const raw = evalMacroNode(n.nodes[1] ?? ident("null"), env, ctx);
    if (isNode(raw)) return raw;
    if (isNodeList(raw)) return raw;
    return toNode(raw);
  }

  if (n.kind === "binop") {
    const left = evalQuoteNode(n.left, env, ctx);
    const right = evalQuoteNode(n.right, env, ctx);
    if (!isNode(left) || !isNode(right)) throw new Error("Unquote produced invalid binop side");
    return bin(left, n.op, right);
  }

  if (n.kind === "curly" || n.kind === "square" || n.kind === "round" || n.kind === "sequence") {
    const kids: Node[] = [];
    for (const child of n.nodes) {
      const q = evalQuoteNode(child, env, ctx);
      if (Array.isArray(q)) kids.push(...q);
      else kids.push(q);
    }
    if (n.kind === "curly") return curly(kids);
    if (n.kind === "square") return square(kids);
    if (n.kind === "round") return round(kids);
    return { kind: "sequence", nodes: kids };
  }

  if (n.kind === "identifier") return ident(n.value);
  if (n.kind === "number") return num(n.value);
  if (n.kind === "string") return str(n.value);
  if (n.kind === "operator") return op(n.value);

  throw new Error("Invalid quote node");
}

function evalMacroNode(n: Node, env: Env, ctx: MacroContext): MacroValue {
  switch (n.kind) {
    case "identifier":
      if (n.value === "true") return true;
      if (n.value === "false") return false;
      if (n.value === "null") return null;
      return env.get(n.value);
    case "string":
      return n.value;
    case "number":
      return Number(n.value);
    case "square":
      return n.nodes.map((x) => evalMacroNode(x, env, ctx));
    case "round":
      if (n.nodes.length === 0) return null;
      if (n.nodes.length === 1) return evalMacroNode(n.nodes[0], env, ctx);
      return n.nodes.map((x) => evalMacroNode(x, env, ctx));
    case "binop":
      return evalBinOp(n, env, ctx);
    case "curly": {
      const head = n.nodes[0];
      if (head && isIdent(head, "if")) {
        const parts = n.nodes.slice(1);
        let i = 0;
        while (i + 1 < parts.length) {
          if (isTruthy(evalMacroNode(parts[i], env, ctx))) return evalMacroNode(parts[i + 1], env, ctx);
          i += 2;
        }
        if (i < parts.length) return evalMacroNode(parts[i], env, ctx);
        return null;
      }

      if (head && isIdent(head, "do")) {
        let res: MacroValue = null;
        for (const stmt of n.nodes.slice(1)) res = evalMacroNode(stmt, env, ctx);
        return res;
      }

      if (head && isIdent(head, "when")) {
        if (isTruthy(evalMacroNode(n.nodes[1] ?? ident("false"), env, ctx))) {
          let res: MacroValue = null;
          for (const stmt of n.nodes.slice(2)) res = evalMacroNode(stmt, env, ctx);
          return res;
        }
        return null;
      }

      if (head && isIdent(head, "while")) {
        let res: MacroValue = null;
        while (isTruthy(evalMacroNode(n.nodes[1] ?? ident("false"), env, ctx))) {
          for (const stmt of n.nodes.slice(2)) res = evalMacroNode(stmt, env, ctx);
        }
        return res;
      }

      if (head && isIdent(head, "for")) {
        const varNode = n.nodes[1];
        if (!varNode || varNode.kind !== "identifier") throw new Error("for requires identifier variable");
        const iterable = evalMacroNode(n.nodes[2] ?? square([]), env, ctx);
        if (!Array.isArray(iterable)) throw new Error("for iterable must evaluate to array");
        let res: MacroValue = null;
        for (const item of iterable) {
          env.set(varNode.value, item as MacroValue);
          for (const stmt of n.nodes.slice(3)) res = evalMacroNode(stmt, env, ctx);
        }
        return res;
      }

      if (head && isIdent(head, "fun")) {
        const maybeName = n.nodes[1];
        const argsNode = n.nodes[2];
        if (!maybeName || maybeName.kind !== "identifier" || !argsNode || argsNode.kind !== "square") {
          throw new Error("Macro {fun ...} must be {fun name [args] ...}");
        }
        const argNames = argsNode.nodes.map((arg) => {
          if (arg.kind !== "identifier") throw new Error("fun args must be identifiers");
          return arg.value;
        });
        const fn = (...args: MacroValue[]): MacroValue => {
          const fnEnv = new Env(env);
          for (let i = 0; i < argNames.length; i += 1) fnEnv.set(argNames[i], args[i] ?? null);
          let out: MacroValue = null;
          try {
            for (const stmt of n.nodes.slice(3)) out = evalMacroNode(stmt, fnEnv, ctx);
            return out;
          } catch (ret) {
            if (ret instanceof ReturnSignal) return ret.value;
            throw ret;
          }
        };
        env.set(maybeName.value, fn);
        return fn;
      }

      if (head && isIdent(head, "return")) {
        const value = n.nodes[1] ? evalMacroNode(n.nodes[1], env, ctx) : null;
        throw new ReturnSignal(value);
      }

      if (head && isIdent(head, "quote")) {
        const qs = n.nodes.slice(1).map((x) => evalQuoteNode(x, env, ctx));
        if (qs.length === 0) return square([]);
        if (qs.length === 1) return qs[0] as MacroValue;
        const merged: Node[] = [];
        for (const q of qs) {
          if (Array.isArray(q)) merged.push(...q);
          else merged.push(q);
        }
        return merged;
      }

      if (head && head.kind === "binop" && head.op === ".") {
        const receiver = evalMacroNode(head.left, env, ctx);
        const member = head.right.kind === "identifier" ? head.right.value : String(evalMacroNode(head.right, env, ctx));
        const target = (receiver as Record<string, unknown> | null)?.[member];
        if (typeof target !== "function") throw new Error(`Macro member '${member}' is not callable`);
        const args = n.nodes.slice(1).map((arg) => evalMacroNode(arg, env, ctx));
        return target.apply(receiver, args);
      }

      const callee = head ? evalMacroNode(head, env, ctx) : null;
      if (typeof callee !== "function") throw new Error("Macro call target is not callable");
      const args = n.nodes.slice(1).map((arg) => evalMacroNode(arg, env, ctx));
      return callee(...args);
    }
    case "operator":
      return n.value;
    case "sequence": {
      let out: MacroValue = null;
      for (const x of n.nodes) out = evalMacroNode(x, env, ctx);
      return out;
    }
    default:
      return null;
  }
}

function baseMacroEnv(ctx: MacroContext): Env {
  const env = new Env();

  env.set("regular", (nodes: MacroValue): MacroValue => {
    if (!Array.isArray(nodes)) return [];
    return nodes.filter((n) => isNode(n));
  });

  env.set("operator_parse", (nodes: MacroValue): MacroValue => {
    if (!Array.isArray(nodes)) return [];
    const ns = nodes.filter((n): n is Node => isNode(n));
    return ctx.operatorParse(ns);
  });

  env.set("parse", (src: MacroValue): MacroValue => {
    if (typeof src !== "string") throw new Error("parse expects string");
    return ctx.parse(src);
  });

  env.set("len", (x: MacroValue): MacroValue => (Array.isArray(x) || typeof x === "string" ? x.length : 0));
  env.set("str", (x: MacroValue): MacroValue => String(x));
  env.set("int", (x: MacroValue): MacroValue => Number.parseInt(String(x), 10));
  env.set("float", (x: MacroValue): MacroValue => Number.parseFloat(String(x)));
  env.set("list", (x: MacroValue): MacroValue => (Array.isArray(x) ? [...x] : []));
  env.set("first", (x: MacroValue): MacroValue => (Array.isArray(x) && x.length > 0 ? x[0] : null));
  env.set("rest", (x: MacroValue): MacroValue => (Array.isArray(x) ? x.slice(1) : []));
  env.set("reversed", (x: MacroValue): MacroValue => (Array.isArray(x) ? [...x].reverse() : []));
  env.set("push", (arr: MacroValue, item: MacroValue): MacroValue => {
    if (!Array.isArray(arr)) return 0;
    arr.push(item);
    return arr.length;
  });
  env.set("pop", (arr: MacroValue): MacroValue => {
    if (!Array.isArray(arr)) return null;
    return arr.pop() ?? null;
  });
  env.set("range", (a: MacroValue, b?: MacroValue): MacroValue => {
    const from = Number(a);
    const to = b === undefined ? from : Number(b);
    const start = b === undefined ? 0 : from;
    const end = b === undefined ? from : to;
    const out: number[] = [];
    for (let i = start; i < end; i += 1) out.push(i);
    return out;
  });
  env.set("map", (f: MacroValue, arr: MacroValue): MacroValue => {
    if (typeof f !== "function" || !Array.isArray(arr)) return [];
    return arr.map((x) => f(x as MacroValue));
  });
  env.set("print", (...args: MacroValue[]): MacroValue => {
    console.log(...args);
    return null;
  });
  env.set("assert", (cond: MacroValue, msg?: MacroValue): MacroValue => {
    if (!cond) throw new Error(msg ? String(msg) : "Macro assertion failed");
    return null;
  });

  env.set("isinstance", (val: MacroValue, typ: MacroValue): MacroValue => {
    if (!isNode(val)) return false;
    const tname = nodeCtorName(typ) ?? (typeof typ === "string" ? typ : null);
    if (!tname) return false;
    if (tname === "Node") return true;

    const map: Record<string, Node["kind"]> = {
      Identifier: "identifier",
      Number: "number",
      String: "string",
      Operator: "operator",
      BinOp: "binop",
      RoundBrackets: "round",
      SquareBrackets: "square",
      CurlyBrackets: "curly",
      Sequence: "sequence",
    };
    const wanted = map[tname];
    return wanted ? val.kind === wanted : false;
  });

  const identifierCtor = ((value: MacroValue): MacroValue => ident(String(value))) as ((value: MacroValue) => MacroValue) & { __nodeCtor: string };
  identifierCtor.__nodeCtor = "Identifier";
  env.set("Identifier", identifierCtor);

  const numberCtor = ((value: MacroValue): MacroValue => num(String(value))) as ((value: MacroValue) => MacroValue) & { __nodeCtor: string };
  numberCtor.__nodeCtor = "Number";
  env.set("Number", numberCtor);

  const stringCtor = ((value: MacroValue): MacroValue => str(String(value))) as ((value: MacroValue) => MacroValue) & { __nodeCtor: string };
  stringCtor.__nodeCtor = "String";
  env.set("String", stringCtor);

  const operatorCtor = ((value: MacroValue): MacroValue => op(String(value))) as ((value: MacroValue) => MacroValue) & { __nodeCtor: string };
  operatorCtor.__nodeCtor = "Operator";
  env.set("Operator", operatorCtor);

  const binOpCtor = ((left: MacroValue, operator: MacroValue, right: MacroValue): MacroValue =>
    bin(toNode(left), String(operator), toNode(right))) as ((left: MacroValue, operator: MacroValue, right: MacroValue) => MacroValue) & { __nodeCtor: string };
  binOpCtor.__nodeCtor = "BinOp";
  env.set("BinOp", binOpCtor);

  const squareCtor = ((nodes: MacroValue): MacroValue =>
    square(Array.isArray(nodes) ? nodes.filter(isNode) : [])) as ((nodes: MacroValue) => MacroValue) & { __nodeCtor: string };
  squareCtor.__nodeCtor = "SquareBrackets";
  env.set("SquareBrackets", squareCtor);

  const curlyCtor = ((nodes: MacroValue): MacroValue =>
    curly(Array.isArray(nodes) ? nodes.filter(isNode) : [])) as ((nodes: MacroValue) => MacroValue) & { __nodeCtor: string };
  curlyCtor.__nodeCtor = "CurlyBrackets";
  env.set("CurlyBrackets", curlyCtor);

  env.set("RoundBrackets", ctor("RoundBrackets"));
  env.set("Sequence", ctor("Sequence"));

  return env;
}

export class MacroRegistry {
  private readonly macros = new Map<string, MacroEntry>();

  register(name: string, fn: MacroFn): void {
    this.macros.set(name, { kind: "native", fn });
  }

  registerMakrell(name: string, params: string[], body: Node[]): void {
    this.macros.set(name, { kind: "makrell", params, body });
  }

  get(name: string): MacroFn | undefined {
    const e = this.macros.get(name);
    if (!e || e.kind !== "native") return undefined;
    return e.fn;
  }

  getEntry(name: string): MacroEntry | undefined {
    return this.macros.get(name);
  }

  entries(): Array<[string, MacroEntry]> {
    return [...this.macros.entries()];
  }

  serializeMakrellEntries(): SerializedMakrellMacro[] {
    const out: SerializedMakrellMacro[] = [];
    for (const [name, entry] of this.macros.entries()) {
      if (entry.kind === "makrell") {
        out.push({ name, params: entry.params, body: entry.body });
      }
    }
    return out;
  }
}

export function defaultMacroContext(): MacroContext {
  return {
    regular,
    parse,
    operatorParse: operatorParseNodes,
  };
}

export function runMakrellMacroDef(
  params: string[],
  body: Node[],
  args: Node[],
  registry: MacroRegistry,
  macroCtx: MacroContext,
): Node | Node[] {
  const env = baseMacroEnv(macroCtx);

  if (params.length === 1) {
    env.set(params[0], args);
  } else {
    for (let i = 0; i < params.length; i += 1) env.set(params[i], args[i] ?? ident("null"));
  }

  for (const [macroName, macroEntry] of registry.entries()) {
    env.set(macroName, (...macroArgs: MacroValue[]) => {
      const asNodes = macroArgs.map((a) => toNode(a));
      if (macroEntry.kind === "native") return macroEntry.fn(asNodes, macroCtx);
      return runMakrellMacroDef(macroEntry.params, macroEntry.body, asNodes, registry, macroCtx);
    });
  }

  let out: MacroValue = null;
  try {
    for (const stmt of body) out = evalMacroNode(stmt, env, macroCtx);
  } catch (ret) {
    if (ret instanceof ReturnSignal) out = ret.value;
    else throw ret;
  }

  if (isNode(out)) return out;
  if (isNodeList(out)) return out;
  return toNode(out);
}

export function defineMakrellMacro(name: string, params: string[], body: Node[], registry: MacroRegistry): MacroFn {
  registry.registerMakrell(name, params, body);
  const fn: MacroFn = (args: Node[], macroCtx: MacroContext): Node | Node[] => {
    return runMakrellMacroDef(params, body, args, registry, macroCtx);
  };
  return fn;
}

export function evaluateSerializedMakrellMacro(payload: {
  target: SerializedMakrellMacro;
  args: Node[];
  registry: SerializedMakrellMacro[];
}): Node | Node[] {
  const registry = new MacroRegistry();
  for (const r of payload.registry) {
    registry.registerMakrell(r.name, r.params, r.body);
  }
  return runMakrellMacroDef(
    payload.target.params,
    payload.target.body,
    payload.args,
    registry,
    defaultMacroContext(),
  );
}
