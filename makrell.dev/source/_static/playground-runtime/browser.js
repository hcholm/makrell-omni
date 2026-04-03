// src/ast.ts
var ident = (value, loc) => ({ kind: "identifier", value, loc });
var num = (value, loc) => ({ kind: "number", value, loc });
var str = (value, loc) => ({ kind: "string", value, loc });
var op = (value, loc) => ({ kind: "operator", value, loc });
var bin = (left, operator, right, loc) => ({
  kind: "binop",
  left,
  op: operator,
  right,
  loc
});
var curly = (nodes, loc) => ({ kind: "curly", nodes, loc });
var square = (nodes, loc) => ({ kind: "square", nodes, loc });
var round = (nodes, loc) => ({ kind: "round", nodes, loc });
var isIdent = (n, wanted) => {
  return n.kind === "identifier" && (wanted === undefined || n.value === wanted);
};
function isNode(v) {
  if (!v || typeof v !== "object")
    return false;
  const k = v.kind;
  return typeof k === "string";
}

// src/tokenizer.ts
var multiOps = ["==", "!=", "<=", ">=", "&&", "||", "->", "**", ".."];
var singleOps = new Set("+-*/%=<>|&.:@'\\".split(""));
function isSpace(ch) {
  return ch === " " || ch === `
` || ch === "\t" || ch === "\r";
}
function isIdentStart(ch) {
  return /[A-Za-z_$]/.test(ch);
}
function isIdentBody(ch) {
  return /[A-Za-z0-9_$]/.test(ch);
}
function tokenize(src) {
  const out = [];
  let i = 0;
  let line = 1;
  let column = 1;
  const pos = () => ({ index: i, line, column });
  const span = (start, end) => ({ start, end });
  const advance = (count = 1) => {
    for (let k = 0;k < count; k += 1) {
      const ch = src[i];
      i += 1;
      if (ch === `
`) {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
    }
  };
  while (i < src.length) {
    const ch = src[i];
    if (isSpace(ch)) {
      advance(1);
      continue;
    }
    if (ch === "#") {
      while (i < src.length && src[i] !== `
`)
        advance(1);
      continue;
    }
    if (ch === '"') {
      const start = pos();
      let j = i + 1;
      let escaped = false;
      while (j < src.length) {
        const c = src[j];
        if (!escaped && c === '"')
          break;
        escaped = !escaped && c === "\\";
        if (c !== "\\")
          escaped = false;
        j += 1;
      }
      if (j >= src.length)
        throw new Error("Unterminated string literal");
      const value = src.slice(i + 1, j);
      advance(j + 1 - i);
      out.push(str(value, span(start, pos())));
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      const start = pos();
      advance(1);
      out.push({ kind: "lpar", value: ch, loc: span(start, pos()) });
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      const start = pos();
      advance(1);
      out.push({ kind: "rpar", value: ch, loc: span(start, pos()) });
      continue;
    }
    const maybeOp2 = src.slice(i, i + 2);
    if (multiOps.includes(maybeOp2)) {
      const start = pos();
      advance(2);
      out.push(op(maybeOp2, span(start, pos())));
      continue;
    }
    if (singleOps.has(ch)) {
      const start = pos();
      advance(1);
      out.push(op(ch, span(start, pos())));
      continue;
    }
    if (/[0-9]/.test(ch) || ch === "-" && /[0-9]/.test(src[i + 1] ?? "")) {
      const start = pos();
      let j = i;
      if (src[j] === "-")
        j += 1;
      while (j < src.length && /[0-9]/.test(src[j]))
        j += 1;
      if (src[j] === "." && /[0-9]/.test(src[j + 1] ?? "")) {
        j += 1;
        while (j < src.length && /[0-9]/.test(src[j]))
          j += 1;
      }
      const value = src.slice(i, j);
      advance(j - i);
      out.push(num(value, span(start, pos())));
      continue;
    }
    if (isIdentStart(ch)) {
      const start = pos();
      let j = i + 1;
      while (j < src.length && isIdentBody(src[j]))
        j += 1;
      const value = src.slice(i, j);
      advance(j - i);
      out.push(ident(value, span(start, pos())));
      continue;
    }
    throw new Error(`Unexpected token near: ${src.slice(i, i + 16)}`);
  }
  return out;
}

// src/parser.ts
var precedence = {
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
  ".": [110, "left"]
};
function opInfo(operator) {
  return precedence[operator] ?? [0, "left"];
}
function mergeLoc(a, b) {
  if (!a)
    return b;
  if (!b)
    return a;
  return { start: a.start, end: b.end };
}
function rootLoc() {
  const p = { index: 0, line: 1, column: 1 };
  return { start: p, end: p };
}
function parseBrackets(src) {
  const toks = tokenize(src);
  const stack = [{ node: { kind: "sequence", nodes: [], loc: rootLoc() } }];
  const closeFor = { "(": ")", "[": "]", "{": "}" };
  for (const t of toks) {
    if (t.kind === "lpar") {
      let b;
      if (t.value === "(")
        b = { kind: "round", nodes: [] };
      else if (t.value === "[")
        b = { kind: "square", nodes: [] };
      else
        b = { kind: "curly", nodes: [] };
      stack.push({ node: b, open: t });
      continue;
    }
    if (t.kind === "rpar") {
      if (stack.length <= 1)
        throw new Error(`Unexpected closing bracket ${t.value}`);
      const doneFrame = stack.pop();
      const expected = closeFor[doneFrame.open.value];
      if (expected !== t.value) {
        throw new Error(`Mismatched closing bracket ${t.value}, expected ${expected}`);
      }
      doneFrame.node.loc = {
        start: doneFrame.open.loc.start,
        end: t.loc.end
      };
      const parent = stack[stack.length - 1].node;
      parent.nodes.push(doneFrame.node);
      continue;
    }
    stack[stack.length - 1].node.nodes.push(t);
  }
  if (stack.length !== 1) {
    const last = stack[stack.length - 1];
    const where = last.open?.loc ? ` at line ${last.open.loc.start.line}, col ${last.open.loc.start.column}` : "";
    throw new Error(`Unmatched opening bracket${where}`);
  }
  return stack[0].node;
}
function operatorParseNodes(nodes) {
  const output = [];
  const ops = [];
  let lastWasNotOp = true;
  const hasOps = () => ops.length > 0;
  const applyOne = () => {
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
      loc: mergeLoc(mergeLoc(left.loc, oper.loc), right.loc)
    });
  };
  const applyAll = () => {
    while (hasOps())
      applyOne();
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
          if (stackPrio > currentPrio || stackPrio === currentPrio && stackAssoc === "left") {
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
    if (lastWasNotOp)
      applyAll();
    output.push(transform(n));
    lastWasNotOp = true;
  }
  applyAll();
  return output;
}
function transform(n) {
  if (n.kind === "curly" || n.kind === "round" || n.kind === "square" || n.kind === "sequence") {
    const kids = operatorParseNodes(n.nodes);
    return { ...n, nodes: kids, loc: n.loc };
  }
  return n;
}
function parse(src) {
  const root = parseBrackets(src);
  return operatorParseNodes(root.nodes);
}

// src/macros.ts
class ReturnSignal {
  value;
  constructor(value) {
    this.value = value;
  }
}

class Env {
  own = new Map;
  parent;
  constructor(parent) {
    this.parent = parent;
  }
  has(name) {
    if (this.own.has(name))
      return true;
    if (this.parent)
      return this.parent.has(name);
    return false;
  }
  set(name, value) {
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
  get(name) {
    if (this.own.has(name))
      return this.own.get(name);
    if (this.parent)
      return this.parent.get(name);
    throw new Error(`Unknown macro symbol: ${name}`);
  }
}
function regular(nodes) {
  return nodes;
}
function isNodeList(v) {
  return Array.isArray(v) && v.every((x) => isNode(x));
}
function toNode(v) {
  if (isNode(v))
    return v;
  if (typeof v === "string")
    return str(v);
  if (typeof v === "number")
    return num(String(v));
  if (typeof v === "boolean")
    return ident(v ? "true" : "false");
  if (v === null)
    return ident("null");
  if (isNodeList(v))
    return square(v);
  throw new Error(`Macro returned value that cannot be converted to AST node: ${String(v)}`);
}
function ctor(name) {
  return { __nodeCtor: name };
}
function nodeCtorName(v) {
  if (!v || typeof v !== "object")
    return null;
  const n = v.__nodeCtor;
  return typeof n === "string" ? n : null;
}
function isTruthy(v) {
  return Boolean(v);
}
function evalBinOp(n, env, ctx) {
  if (n.op === "=") {
    if (n.left.kind !== "identifier")
      throw new Error("Macro assignment left side must be identifier");
    const value = evalMacroNode(n.right, env, ctx);
    env.set(n.left.value, value);
    return value;
  }
  if (n.op === "->") {
    const params = [];
    if (n.left.kind === "identifier") {
      params.push(n.left.value);
    } else if (n.left.kind === "square") {
      for (const p of n.left.nodes) {
        if (p.kind !== "identifier")
          throw new Error("Lambda params must be identifiers");
        params.push(p.value);
      }
    } else {
      throw new Error("Invalid lambda params");
    }
    return (...args) => {
      const fnEnv = new Env(env);
      for (let i = 0;i < params.length; i += 1)
        fnEnv.set(params[i], args[i] ?? null);
      return evalMacroNode(n.right, fnEnv, ctx);
    };
  }
  if (n.op === "|") {
    const left = evalMacroNode(n.left, env, ctx);
    if (n.right.kind === "identifier") {
      const f = env.get(n.right.value);
      if (typeof f !== "function")
        throw new Error(`Pipe target '${n.right.value}' is not callable`);
      return f(left);
    }
    const callee = evalMacroNode(n.right, env, ctx);
    if (typeof callee !== "function")
      throw new Error("Pipe target is not callable");
    return callee(left);
  }
  switch (n.op) {
    case "+": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left + right;
    }
    case "-": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left - right;
    }
    case "*": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left * right;
    }
    case "/": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left / right;
    }
    case "%": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left % right;
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
      return left < right;
    }
    case "<=": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left <= right;
    }
    case ">": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left > right;
    }
    case ">=": {
      const left = evalMacroNode(n.left, env, ctx);
      const right = evalMacroNode(n.right, env, ctx);
      return left >= right;
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
      return left[Number(right)];
    }
    case ".": {
      const left = evalMacroNode(n.left, env, ctx);
      const key = n.right.kind === "identifier" ? n.right.value : String(evalMacroNode(n.right, env, ctx));
      return left[key] ?? null;
    }
    default:
      throw new Error(`Unsupported macro binop: ${n.op}`);
  }
}
function evalQuoteNode(n, env, ctx) {
  if (n.kind === "curly" && n.nodes.length > 0 && n.nodes[0].kind === "identifier" && (n.nodes[0].value === "unquote" || n.nodes[0].value === "$")) {
    const raw = evalMacroNode(n.nodes[1] ?? ident("null"), env, ctx);
    if (isNode(raw))
      return raw;
    if (isNodeList(raw))
      return raw;
    return toNode(raw);
  }
  if (n.kind === "binop") {
    const left = evalQuoteNode(n.left, env, ctx);
    const right = evalQuoteNode(n.right, env, ctx);
    if (!isNode(left) || !isNode(right))
      throw new Error("Unquote produced invalid binop side");
    return bin(left, n.op, right);
  }
  if (n.kind === "curly" || n.kind === "square" || n.kind === "round" || n.kind === "sequence") {
    const kids = [];
    for (const child of n.nodes) {
      const q = evalQuoteNode(child, env, ctx);
      if (Array.isArray(q))
        kids.push(...q);
      else
        kids.push(q);
    }
    if (n.kind === "curly")
      return curly(kids);
    if (n.kind === "square")
      return square(kids);
    if (n.kind === "round")
      return round(kids);
    return { kind: "sequence", nodes: kids };
  }
  if (n.kind === "identifier")
    return ident(n.value);
  if (n.kind === "number")
    return num(n.value);
  if (n.kind === "string")
    return str(n.value);
  if (n.kind === "operator")
    return op(n.value);
  throw new Error("Invalid quote node");
}
function evalMacroNode(n, env, ctx) {
  switch (n.kind) {
    case "identifier":
      if (n.value === "true")
        return true;
      if (n.value === "false")
        return false;
      if (n.value === "null")
        return null;
      return env.get(n.value);
    case "string":
      return n.value;
    case "number":
      return Number(n.value);
    case "square":
      return n.nodes.map((x) => evalMacroNode(x, env, ctx));
    case "round":
      if (n.nodes.length === 0)
        return null;
      if (n.nodes.length === 1)
        return evalMacroNode(n.nodes[0], env, ctx);
      return n.nodes.map((x) => evalMacroNode(x, env, ctx));
    case "binop":
      return evalBinOp(n, env, ctx);
    case "curly": {
      const head = n.nodes[0];
      if (head && isIdent(head, "if")) {
        const parts = n.nodes.slice(1);
        let i = 0;
        while (i + 1 < parts.length) {
          if (isTruthy(evalMacroNode(parts[i], env, ctx)))
            return evalMacroNode(parts[i + 1], env, ctx);
          i += 2;
        }
        if (i < parts.length)
          return evalMacroNode(parts[i], env, ctx);
        return null;
      }
      if (head && isIdent(head, "do")) {
        let res = null;
        for (const stmt of n.nodes.slice(1))
          res = evalMacroNode(stmt, env, ctx);
        return res;
      }
      if (head && isIdent(head, "when")) {
        if (isTruthy(evalMacroNode(n.nodes[1] ?? ident("false"), env, ctx))) {
          let res = null;
          for (const stmt of n.nodes.slice(2))
            res = evalMacroNode(stmt, env, ctx);
          return res;
        }
        return null;
      }
      if (head && isIdent(head, "while")) {
        let res = null;
        while (isTruthy(evalMacroNode(n.nodes[1] ?? ident("false"), env, ctx))) {
          for (const stmt of n.nodes.slice(2))
            res = evalMacroNode(stmt, env, ctx);
        }
        return res;
      }
      if (head && isIdent(head, "for")) {
        const varNode = n.nodes[1];
        if (!varNode || varNode.kind !== "identifier")
          throw new Error("for requires identifier variable");
        const iterable = evalMacroNode(n.nodes[2] ?? square([]), env, ctx);
        if (!Array.isArray(iterable))
          throw new Error("for iterable must evaluate to array");
        let res = null;
        for (const item of iterable) {
          env.set(varNode.value, item);
          for (const stmt of n.nodes.slice(3))
            res = evalMacroNode(stmt, env, ctx);
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
          if (arg.kind !== "identifier")
            throw new Error("fun args must be identifiers");
          return arg.value;
        });
        const fn = (...args2) => {
          const fnEnv = new Env(env);
          for (let i = 0;i < argNames.length; i += 1)
            fnEnv.set(argNames[i], args2[i] ?? null);
          let out = null;
          try {
            for (const stmt of n.nodes.slice(3))
              out = evalMacroNode(stmt, fnEnv, ctx);
            return out;
          } catch (ret) {
            if (ret instanceof ReturnSignal)
              return ret.value;
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
        if (qs.length === 0)
          return square([]);
        if (qs.length === 1)
          return qs[0];
        const merged = [];
        for (const q of qs) {
          if (Array.isArray(q))
            merged.push(...q);
          else
            merged.push(q);
        }
        return merged;
      }
      if (head && head.kind === "binop" && head.op === ".") {
        const receiver = evalMacroNode(head.left, env, ctx);
        const member = head.right.kind === "identifier" ? head.right.value : String(evalMacroNode(head.right, env, ctx));
        const target = receiver?.[member];
        if (typeof target !== "function")
          throw new Error(`Macro member '${member}' is not callable`);
        const args2 = n.nodes.slice(1).map((arg) => evalMacroNode(arg, env, ctx));
        return target.apply(receiver, args2);
      }
      const callee = head ? evalMacroNode(head, env, ctx) : null;
      if (typeof callee !== "function")
        throw new Error("Macro call target is not callable");
      const args = n.nodes.slice(1).map((arg) => evalMacroNode(arg, env, ctx));
      return callee(...args);
    }
    case "operator":
      return n.value;
    case "sequence": {
      let out = null;
      for (const x of n.nodes)
        out = evalMacroNode(x, env, ctx);
      return out;
    }
    default:
      return null;
  }
}
function baseMacroEnv(ctx) {
  const env = new Env;
  env.set("regular", (nodes) => {
    if (!Array.isArray(nodes))
      return [];
    return nodes.filter((n) => isNode(n));
  });
  env.set("operator_parse", (nodes) => {
    if (!Array.isArray(nodes))
      return [];
    const ns = nodes.filter((n) => isNode(n));
    return ctx.operatorParse(ns);
  });
  env.set("parse", (src) => {
    if (typeof src !== "string")
      throw new Error("parse expects string");
    return ctx.parse(src);
  });
  env.set("len", (x) => Array.isArray(x) || typeof x === "string" ? x.length : 0);
  env.set("str", (x) => String(x));
  env.set("int", (x) => Number.parseInt(String(x), 10));
  env.set("float", (x) => Number.parseFloat(String(x)));
  env.set("list", (x) => Array.isArray(x) ? [...x] : []);
  env.set("first", (x) => Array.isArray(x) && x.length > 0 ? x[0] : null);
  env.set("rest", (x) => Array.isArray(x) ? x.slice(1) : []);
  env.set("reversed", (x) => Array.isArray(x) ? [...x].reverse() : []);
  env.set("push", (arr, item) => {
    if (!Array.isArray(arr))
      return 0;
    arr.push(item);
    return arr.length;
  });
  env.set("pop", (arr) => {
    if (!Array.isArray(arr))
      return null;
    return arr.pop() ?? null;
  });
  env.set("range", (a, b) => {
    const from = Number(a);
    const to = b === undefined ? from : Number(b);
    const start = b === undefined ? 0 : from;
    const end = b === undefined ? from : to;
    const out = [];
    for (let i = start;i < end; i += 1)
      out.push(i);
    return out;
  });
  env.set("map", (f, arr) => {
    if (typeof f !== "function" || !Array.isArray(arr))
      return [];
    return arr.map((x) => f(x));
  });
  env.set("print", (...args) => {
    console.log(...args);
    return null;
  });
  env.set("assert", (cond, msg) => {
    if (!cond)
      throw new Error(msg ? String(msg) : "Macro assertion failed");
    return null;
  });
  env.set("isinstance", (val, typ) => {
    if (!isNode(val))
      return false;
    const tname = nodeCtorName(typ) ?? (typeof typ === "string" ? typ : null);
    if (!tname)
      return false;
    if (tname === "Node")
      return true;
    const map = {
      Identifier: "identifier",
      Number: "number",
      String: "string",
      Operator: "operator",
      BinOp: "binop",
      RoundBrackets: "round",
      SquareBrackets: "square",
      CurlyBrackets: "curly",
      Sequence: "sequence"
    };
    const wanted = map[tname];
    return wanted ? val.kind === wanted : false;
  });
  const identifierCtor = (value) => ident(String(value));
  identifierCtor.__nodeCtor = "Identifier";
  env.set("Identifier", identifierCtor);
  const numberCtor = (value) => num(String(value));
  numberCtor.__nodeCtor = "Number";
  env.set("Number", numberCtor);
  const stringCtor = (value) => str(String(value));
  stringCtor.__nodeCtor = "String";
  env.set("String", stringCtor);
  const operatorCtor = (value) => op(String(value));
  operatorCtor.__nodeCtor = "Operator";
  env.set("Operator", operatorCtor);
  const binOpCtor = (left, operator, right) => bin(toNode(left), String(operator), toNode(right));
  binOpCtor.__nodeCtor = "BinOp";
  env.set("BinOp", binOpCtor);
  const squareCtor = (nodes) => square(Array.isArray(nodes) ? nodes.filter(isNode) : []);
  squareCtor.__nodeCtor = "SquareBrackets";
  env.set("SquareBrackets", squareCtor);
  const curlyCtor = (nodes) => curly(Array.isArray(nodes) ? nodes.filter(isNode) : []);
  curlyCtor.__nodeCtor = "CurlyBrackets";
  env.set("CurlyBrackets", curlyCtor);
  env.set("RoundBrackets", ctor("RoundBrackets"));
  env.set("Sequence", ctor("Sequence"));
  return env;
}

class MacroRegistry {
  macros = new Map;
  register(name, fn) {
    this.macros.set(name, { kind: "native", fn });
  }
  registerMakrell(name, params, body) {
    this.macros.set(name, { kind: "makrell", params, body });
  }
  get(name) {
    const e = this.macros.get(name);
    if (!e || e.kind !== "native")
      return;
    return e.fn;
  }
  getEntry(name) {
    return this.macros.get(name);
  }
  entries() {
    return [...this.macros.entries()];
  }
  serializeMakrellEntries() {
    const out = [];
    for (const [name, entry] of this.macros.entries()) {
      if (entry.kind === "makrell") {
        out.push({ name, params: entry.params, body: entry.body });
      }
    }
    return out;
  }
}
function defaultMacroContext() {
  return {
    regular,
    parse,
    operatorParse: operatorParseNodes
  };
}
function runMakrellMacroDef(params, body, args, registry, macroCtx) {
  const env = baseMacroEnv(macroCtx);
  if (params.length === 1) {
    env.set(params[0], args);
  } else {
    for (let i = 0;i < params.length; i += 1)
      env.set(params[i], args[i] ?? ident("null"));
  }
  for (const [macroName, macroEntry] of registry.entries()) {
    env.set(macroName, (...macroArgs) => {
      const asNodes = macroArgs.map((a) => toNode(a));
      if (macroEntry.kind === "native")
        return macroEntry.fn(asNodes, macroCtx);
      return runMakrellMacroDef(macroEntry.params, macroEntry.body, asNodes, registry, macroCtx);
    });
  }
  let out = null;
  try {
    for (const stmt of body)
      out = evalMacroNode(stmt, env, macroCtx);
  } catch (ret) {
    if (ret instanceof ReturnSignal)
      out = ret.value;
    else
      throw ret;
  }
  if (isNode(out))
    return out;
  if (isNodeList(out))
    return out;
  return toNode(out);
}
function defineMakrellMacro(name, params, body, registry) {
  registry.registerMakrell(name, params, body);
  const fn = (args, macroCtx) => {
    return runMakrellMacroDef(params, body, args, registry, macroCtx);
  };
  return fn;
}
function evaluateSerializedMakrellMacro(payload) {
  const registry = new MacroRegistry;
  for (const r of payload.registry) {
    registry.registerMakrell(r.name, r.params, r.body);
  }
  return runMakrellMacroDef(payload.target.params, payload.target.body, payload.args, registry, defaultMacroContext());
}

// src/compiler.ts
class CompileFailure extends Error {
  diagnostic;
  constructor(diagnostic) {
    const where = diagnostic.loc ? ` [line ${diagnostic.loc.start.line}, col ${diagnostic.loc.start.column}]` : "";
    super(`${diagnostic.message}${where}`);
    this.diagnostic = diagnostic;
  }
}

class InlineMetaRuntimeAdapter {
  kind = "inline";
  runMakrellMacro(_name, macro, args, registry) {
    return runMakrellMacroDef(macro.params, macro.body, args, registry, defaultMacroContext());
  }
}
function nextTmp(ctx) {
  ctx.tempId += 1;
  return `__mr_tmp_${ctx.tempId}`;
}
function fail(message, node) {
  throw new CompileFailure({ message, loc: node?.loc });
}
function expandMacro(n, ctx) {
  if (n.nodes.length === 0)
    return null;
  const head = n.nodes[0];
  if (head.kind !== "identifier")
    return null;
  const entry = ctx.macros.getEntry(head.value);
  if (!entry)
    return null;
  const out = entry.kind === "native" ? entry.fn(n.nodes.slice(1), ctx.macroCtx) : ctx.metaRuntime.runMakrellMacro(head.value, entry, n.nodes.slice(1), ctx.macros);
  return Array.isArray(out) ? out : [out];
}
function registerMacroDef(n, ctx) {
  if (n.nodes.length < 5)
    return false;
  if (!isIdent(n.nodes[0], "def") || !isIdent(n.nodes[1], "macro"))
    return false;
  const nameNode = n.nodes[2];
  const paramsNode = n.nodes[3];
  if (nameNode.kind !== "identifier" || paramsNode.kind !== "square") {
    fail("Macro definition must be {def macro name [params] ...}", n);
  }
  const params = paramsNode.nodes.map((p) => {
    if (p.kind !== "identifier")
      fail("Macro params must be identifiers", p);
    return p.value;
  });
  const body = n.nodes.slice(4);
  defineMakrellMacro(nameNode.value, params, body, ctx.macros);
  return true;
}
function emitLiteralIdentifier(name) {
  if (name === "true" || name === "false" || name === "null")
    return name;
  return name;
}
function emitTypeNode(n) {
  if (n.kind === "identifier") {
    if (n.value === "str")
      return "string";
    if (n.value === "int" || n.value === "float")
      return "number";
    if (n.value === "bool")
      return "boolean";
    if (n.value === "list")
      return "unknown[]";
    if (n.value === "dict")
      return "Record<string, unknown>";
    if (n.value === "null")
      return "null";
    return n.value;
  }
  if (n.kind === "string")
    return JSON.stringify(n.value);
  if (n.kind === "number")
    return n.value;
  if (n.kind === "binop" && n.op === "|")
    return `${emitTypeNode(n.left)} | ${emitTypeNode(n.right)}`;
  if (n.kind === "square") {
    if (n.nodes.length > 0 && n.nodes[0].kind === "identifier") {
      const head = n.nodes[0].value;
      const args = n.nodes.slice(1).map((x) => emitTypeNode(x)).join(", ");
      return args.length > 0 ? `${head}<${args}>` : head;
    }
    return `[${n.nodes.map((x) => emitTypeNode(x)).join(", ")}]`;
  }
  if (n.kind === "curly" && n.nodes.length >= 3 && isIdent(n.nodes[0], "$dict")) {
    const keyPart = n.nodes[1];
    const valType = emitTypeNode(n.nodes[2]);
    if (keyPart.kind === "square" && keyPart.nodes.length === 3 && keyPart.nodes[1].kind === "identifier") {
      const k = keyPart.nodes[0];
      const kIn = keyPart.nodes[1];
      const keys = keyPart.nodes[2];
      if (k.kind === "identifier" && kIn.value === "in") {
        return `{ [${k.value} in ${emitTypeNode(keys)}]: ${valType} }`;
      }
    }
    return `Record<string, ${valType}>`;
  }
  return "unknown";
}
function compileAssignLeft(n, ctx) {
  if (n.kind === "binop" && n.op === ":")
    return compileAssignLeft(n.left, ctx);
  if (n.kind === "identifier")
    return n.value;
  if (n.kind === "binop" && n.op === ".")
    return `${compileExpr(n.left, ctx)}.${compileExpr(n.right, ctx)}`;
  fail("Invalid assignment target", n);
}
function compileIfExpr(nodes, ctx) {
  if (nodes.length === 0)
    return "null";
  if (nodes.length === 1)
    return compileExpr(nodes[0], ctx);
  const walk = (start) => {
    if (start >= nodes.length)
      return "null";
    if (start === nodes.length - 1)
      return compileExpr(nodes[start], ctx);
    const cond = compileExpr(nodes[start], ctx);
    const yes = compileExpr(nodes[start + 1], ctx);
    const no = walk(start + 2);
    return `(${cond} ? ${yes} : ${no})`;
  };
  return walk(0);
}
function compileDoExpr(nodes, ctx) {
  const body = compileBlock(nodes, ctx, true);
  return `(() => {${body}})()`;
}
function compileMatchExpr(nodes, ctx) {
  if (nodes.length === 0)
    return "null";
  const valueExpr = compileExpr(nodes[0], ctx);
  if (nodes.length === 2) {
    const patt = JSON.stringify(nodes[1]);
    return `__mr_matchPattern(${valueExpr}, ${patt})`;
  }
  const tmp = nextTmp(ctx);
  const chunks = [];
  chunks.push(`const ${tmp} = ${valueExpr};`);
  for (let i = 1;i < nodes.length - 1; i += 2) {
    const patt = JSON.stringify(nodes[i]);
    const retval = compileExpr(nodes[i + 1], ctx);
    chunks.push(`if (__mr_matchPattern(${tmp}, ${patt})) return ${retval};`);
  }
  chunks.push("return null;");
  return `(() => {${chunks.join(`
`)}})()`;
}
function compileFunExpr(nodes, ctx) {
  const rest = nodes.slice(1);
  let name = "";
  let argsNode = null;
  let bodyStart = 0;
  if (rest[0]?.kind === "identifier" && rest[1]?.kind === "square") {
    name = rest[0].value;
    argsNode = rest[1];
    bodyStart = 2;
  } else if (rest[0]?.kind === "square") {
    argsNode = rest[0];
    bodyStart = 1;
  } else {
    fail("Invalid fun syntax. Expected {fun name [args] ...} or {fun [args] ...}", nodes[0]);
  }
  const args = argsNode.nodes.map((n) => {
    if (n.kind === "identifier")
      return n.value;
    if (n.kind === "binop" && n.op === ":" && n.left.kind === "identifier") {
      if (ctx.emitTarget === "ts")
        return `${n.left.value}: ${emitTypeNode(n.right)}`;
      return n.left.value;
    }
    fail("Function args must be identifiers or typed identifiers", n);
  }).join(", ");
  const innerCtx = { ...ctx, fnDepth: ctx.fnDepth + 1 };
  const body = compileBlock(rest.slice(bodyStart), innerCtx, true);
  if (name) {
    return `(function ${name}(${args}) {${body}})`;
  }
  return `((${args}) => {${body}})`;
}
function compileWhenExpr(nodes, ctx) {
  if (nodes.length === 0)
    return "null";
  const cond = compileExpr(nodes[0], ctx);
  const thenBody = compileBlock(nodes.slice(1), ctx, true);
  return `(() => { if (${cond}) { ${thenBody} } return null; })()`;
}
function compileWhileExpr(nodes, ctx) {
  if (nodes.length === 0)
    return "null";
  const cond = compileExpr(nodes[0], ctx);
  const body = compileBlock(nodes.slice(1), ctx, false);
  return `(() => { while (${cond}) { ${body} } return null; })()`;
}
function compileForExpr(nodes, ctx) {
  if (nodes.length < 2)
    return "null";
  const target = nodes[0];
  if (target.kind !== "identifier")
    fail("for target must be identifier", target);
  const iterable = compileExpr(nodes[1], ctx);
  const body = compileBlock(nodes.slice(2), ctx, false);
  return `(() => { for (const ${target.value} of ${iterable}) { ${body} } return null; })()`;
}
function compileMethod(n, ctx) {
  if (n.nodes.length < 4 || !isIdent(n.nodes[0], "fun") || n.nodes[1].kind !== "identifier" || n.nodes[2].kind !== "square") {
    fail("Class methods must use {fun name [args] ...}", n);
  }
  const rawName = n.nodes[1].value;
  const methodName = rawName === "__init__" ? "constructor" : rawName;
  const argNodes = n.nodes[2].nodes;
  const params = [];
  for (let i = 0;i < argNodes.length; i += 1) {
    const arg = argNodes[i];
    let name = "";
    if (arg.kind === "identifier")
      name = arg.value;
    else if (arg.kind === "binop" && arg.op === ":" && arg.left.kind === "identifier") {
      name = ctx.emitTarget === "ts" ? `${arg.left.value}: ${emitTypeNode(arg.right)}` : arg.left.value;
    } else
      fail("Method arguments must be identifiers or typed identifiers", arg);
    if (i === 0 && name === "self")
      continue;
    params.push(name);
  }
  const methodCtx = { ...ctx, fnDepth: ctx.fnDepth + 1, thisAlias: "self" };
  const body = compileBlock(n.nodes.slice(3), methodCtx, methodName !== "constructor");
  return `${methodName}(${params.join(", ")}) {${body}}`;
}
function compileClassExpr(nodes, ctx) {
  if (nodes.length < 2 || nodes[1].kind !== "identifier") {
    fail("class requires name identifier", nodes[0]);
  }
  const className = nodes[1].value;
  let bodyStart = 2;
  if (nodes[2]?.kind === "square")
    bodyStart = 3;
  const parts = [];
  for (const n of nodes.slice(bodyStart)) {
    if (n.kind === "curly" && isIdent(n.nodes[0], "fun")) {
      parts.push(compileMethod(n, ctx));
    }
  }
  return `class ${className} {${parts.join(`
`)}}`;
}
function nodeToModuleName(n) {
  if (n.kind === "identifier")
    return n.value;
  if (n.kind === "binop" && n.op === ".")
    return `${nodeToModuleName(n.left)}.${nodeToModuleName(n.right)}`;
  fail("Invalid module identifier", n);
}
function parseImportFromNames(n) {
  if (n.kind === "square" || n.kind === "round") {
    return n.nodes.map((x) => {
      if (x.kind !== "identifier")
        fail("import from names must be identifiers", x);
      return x.value;
    });
  }
  fail("Invalid import from list", n);
}
function compileImportExpr(nodes) {
  const steps = [];
  for (const n of nodes) {
    if (n.kind === "identifier" || n.kind === "binop" && n.op === ".") {
      const moduleName = nodeToModuleName(n);
      const alias = moduleName.includes(".") ? moduleName.split(".").at(-1) ?? moduleName : moduleName;
      steps.push(`__mr_import(${JSON.stringify(moduleName)}, ${JSON.stringify(alias)});`);
      continue;
    }
    if (n.kind === "binop" && n.op === "@") {
      const moduleName = nodeToModuleName(n.left);
      const names = parseImportFromNames(n.right);
      steps.push(`__mr_import_from(${JSON.stringify(moduleName)}, ${JSON.stringify(names)});`);
      continue;
    }
    fail("Unsupported import form", n);
  }
  steps.push("return null;");
  return `(() => {${steps.join(`
`)}})()`;
}
function applyImportm(nodes, ctx) {
  const resolver = ctx.metaModuleResolver ?? ((name) => ctx.moduleResolver?.(name));
  if (!resolver)
    fail("importm requires a meta module resolver");
  const applyModule = (moduleName, names) => {
    const mod = resolver(moduleName);
    if (!mod || !Array.isArray(mod.__mr_meta__)) {
      fail(`Module '${moduleName}' has no __mr_meta__ definitions`);
    }
    const wanted = names ? new Set(names) : null;
    for (const entry of mod.__mr_meta__) {
      if (wanted && !wanted.has(entry.name))
        continue;
      defineMakrellMacro(entry.name, entry.params, entry.body, ctx.macros);
    }
  };
  for (const n of nodes) {
    if (n.kind === "identifier" || n.kind === "binop" && n.op === ".") {
      applyModule(nodeToModuleName(n));
      continue;
    }
    if (n.kind === "binop" && n.op === "@") {
      applyModule(nodeToModuleName(n.left), parseImportFromNames(n.right));
      continue;
    }
    fail("Unsupported importm form", n);
  }
}
function compileCurly(n, ctx) {
  if (registerMacroDef(n, ctx))
    return "null";
  const expanded = expandMacro(n, ctx);
  if (expanded) {
    if (expanded.length === 0)
      return "null";
    if (expanded.length === 1)
      return compileExpr(expanded[0], ctx);
    return compileDoExpr(expanded, ctx);
  }
  if (n.nodes.length === 0)
    return "null";
  const head = n.nodes[0];
  if (isIdent(head, "if"))
    return compileIfExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "do"))
    return compileDoExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "when"))
    return compileWhenExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "while"))
    return compileWhileExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "for"))
    return compileForExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "import"))
    return compileImportExpr(n.nodes.slice(1));
  if (isIdent(head, "importm")) {
    applyImportm(n.nodes.slice(1), ctx);
    return "null";
  }
  if (isIdent(head, "match"))
    return compileMatchExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "fun"))
    return compileFunExpr(n.nodes, ctx);
  if (isIdent(head, "class"))
    return compileClassExpr(n.nodes, ctx);
  if (isIdent(head, "new")) {
    if (n.nodes.length < 2)
      fail("new requires constructor expression", n);
    const ctorExpr = compileExpr(n.nodes[1], ctx);
    const rawArgs = n.nodes.slice(2);
    if (rawArgs.length === 1 && rawArgs[0].kind === "square") {
      const args3 = rawArgs[0].nodes.map((arg) => compileExpr(arg, ctx)).join(", ");
      return `new ${ctorExpr}(${args3})`;
    }
    const args2 = rawArgs.map((arg) => compileExpr(arg, ctx)).join(", ");
    return `new ${ctorExpr}(${args2})`;
  }
  const callee = compileExpr(head, ctx);
  const args = n.nodes.slice(1).map((arg) => compileExpr(arg, ctx)).join(", ");
  return `${callee}(${args})`;
}
function compilePipe(left, right, ctx) {
  const leftExpr = compileExpr(left, ctx);
  if (right.kind === "identifier")
    return `${right.value}(${leftExpr})`;
  if (right.kind === "curly" && right.nodes.length > 0) {
    const head = compileExpr(right.nodes[0], ctx);
    const rest = right.nodes.slice(1).map((a) => compileExpr(a, ctx));
    return `${head}(${[leftExpr, ...rest].join(", ")})`;
  }
  return `${compileExpr(right, ctx)}(${leftExpr})`;
}
function compileExpr(n, ctx) {
  switch (n.kind) {
    case "identifier":
      if (ctx.thisAlias && n.value === ctx.thisAlias)
        return "this";
      return emitLiteralIdentifier(n.value);
    case "string":
      return JSON.stringify(n.value);
    case "number":
      return n.value;
    case "round":
      if (n.nodes.length === 0)
        return "null";
      if (n.nodes.length === 1)
        return `(${compileExpr(n.nodes[0], ctx)})`;
      return `[${n.nodes.map((x) => compileExpr(x, ctx)).join(", ")}]`;
    case "square":
      return `[${n.nodes.map((x) => compileExpr(x, ctx)).join(", ")}]`;
    case "curly":
      return compileCurly(n, ctx);
    case "binop": {
      if (n.op === "=") {
        const lhs = compileAssignLeft(n.left, ctx);
        const rhs = compileExpr(n.right, ctx);
        return `(${lhs} = ${rhs})`;
      }
      if (n.op === "|")
        return compilePipe(n.left, n.right, ctx);
      if (n.op === "->") {
        let args = [];
        if (n.left.kind === "identifier")
          args = [n.left.value];
        else if (n.left.kind === "square") {
          args = n.left.nodes.map((x) => {
            if (x.kind !== "identifier")
              throw new Error("Lambda args must be identifiers");
            return x.value;
          });
        } else {
          fail("Invalid lambda args", n.left);
        }
        return `((${args.join(", ")}) => (${compileExpr(n.right, ctx)}))`;
      }
      if (n.op === ".")
        return `${compileExpr(n.left, ctx)}.${compileExpr(n.right, ctx)}`;
      if (n.op === ":")
        return compileExpr(n.left, ctx);
      return `(${compileExpr(n.left, ctx)} ${n.op} ${compileExpr(n.right, ctx)})`;
    }
    case "operator":
      fail(`Unexpected standalone operator '${n.value}'`, n);
    case "sequence":
      return compileDoExpr(n.nodes, ctx);
    default:
      fail(`Unknown node kind: ${n.kind}`, n);
  }
}
function isFunDecl(n) {
  return n.kind === "curly" && n.nodes.length >= 3 && isIdent(n.nodes[0], "fun") && n.nodes[1].kind === "identifier";
}
function isMacroDecl(n) {
  return n.kind === "curly" && n.nodes.length >= 5 && isIdent(n.nodes[0], "def") && isIdent(n.nodes[1], "macro");
}
function isClassDecl(n) {
  return n.kind === "curly" && n.nodes.length >= 2 && isIdent(n.nodes[0], "class") && n.nodes[1].kind === "identifier";
}
function compileStmt(n, ctx, isLast) {
  if (isMacroDecl(n)) {
    registerMacroDef(n, ctx);
    return "";
  }
  if (n.kind === "curly") {
    const expanded = expandMacro(n, ctx);
    if (expanded) {
      if (expanded.length === 0)
        return isLast ? "return null;" : "";
      const parts = [];
      for (let i = 0;i < expanded.length; i += 1) {
        const part = compileStmt(expanded[i], ctx, isLast && i === expanded.length - 1);
        if (part)
          parts.push(part);
      }
      return parts.join(`
`);
    }
  }
  if (isFunDecl(n)) {
    const fnName = n.nodes[1].value;
    const fnExpr = compileFunExpr(n.nodes, ctx);
    return `const ${fnName} = ${fnExpr};`;
  }
  if (isClassDecl(n)) {
    const classExpr = compileClassExpr(n.nodes, ctx);
    if (isLast)
      return `${classExpr};
return ${n.nodes[1].value};`;
    return `${classExpr};`;
  }
  if (n.kind === "binop" && n.op === "=" && n.left.kind === "identifier") {
    const rhs = compileExpr(n.right, ctx);
    const assign = `var ${n.left.value} = ${rhs};`;
    if (isLast)
      return `${assign}
return ${n.left.value};`;
    return assign;
  }
  if (n.kind === "binop" && n.op === "=" && n.left.kind === "binop" && n.left.op === ":" && n.left.left.kind === "identifier") {
    const rhs = compileExpr(n.right, ctx);
    const t = emitTypeNode(n.left.right);
    const decl = ctx.emitTarget === "ts" ? `var ${n.left.left.value}: ${t} = ${rhs};` : `var ${n.left.left.value} = ${rhs};`;
    if (isLast)
      return `${decl}
return ${n.left.left.value};`;
    return decl;
  }
  if (n.kind === "curly" && n.nodes.length > 0 && isIdent(n.nodes[0], "return")) {
    const val = n.nodes[1] ? compileExpr(n.nodes[1], ctx) : "null";
    return `return ${val};`;
  }
  const expr = compileExpr(n, ctx);
  if (isLast)
    return `return ${expr};`;
  return `${expr};`;
}
function compileBlock(nodes, ctx, autoReturn) {
  const lines = [];
  const filtered = nodes.filter(Boolean);
  for (let i = 0;i < filtered.length; i += 1) {
    const line = compileStmt(filtered[i], ctx, autoReturn && i === filtered.length - 1);
    if (line)
      lines.push(line);
  }
  if (lines.length === 0 && autoReturn)
    lines.push("return null;");
  return lines.join(`
`);
}
function compileToJs(src, options = {}) {
  const ctx = {
    macros: options.macros ?? new MacroRegistry,
    macroCtx: defaultMacroContext(),
    metaRuntime: options.metaRuntime ?? new InlineMetaRuntimeAdapter,
    moduleResolver: options.moduleResolver,
    metaModuleResolver: options.metaModuleResolver,
    fnDepth: 0,
    tempId: 0,
    emitTarget: "js"
  };
  const nodes = parse(src);
  const body = compileBlock(nodes, ctx, true);
  return `(() => {
${body}
})()`;
}

// src/pattern.ts
var patternHooks = [];
function matchPattern(value, pattern) {
  return !!matchWithEnv(value, pattern, {});
}
function matchWithEnv(value, pattern, env) {
  for (const hook of patternHooks) {
    if (hook.canHandle(pattern)) {
      return hook.match(value, pattern, env, matchWithEnv);
    }
  }
  if (isIdent(pattern, "_"))
    return env;
  if (isIdent(pattern, "$"))
    return value ? env : null;
  if (pattern.kind === "identifier") {
    if (pattern.value === "true")
      return value === true ? env : null;
    if (pattern.value === "false")
      return value === false ? env : null;
    if (pattern.value === "null")
      return value === null ? env : null;
    return value === pattern.value ? env : null;
  }
  if (pattern.kind === "string")
    return value === pattern.value ? env : null;
  if (pattern.kind === "number")
    return Number(pattern.value) === value ? env : null;
  if (pattern.kind === "round") {
    if (pattern.nodes.length === 0)
      return value === null ? env : null;
    if (pattern.nodes.length === 1)
      return matchWithEnv(value, pattern.nodes[0], env);
    for (const pn of pattern.nodes) {
      const m = matchWithEnv(value, pn, { ...env });
      if (m)
        return m;
    }
    return null;
  }
  if (pattern.kind === "square") {
    if (!Array.isArray(value))
      return null;
    if (value.length !== pattern.nodes.length)
      return null;
    let nextEnv = env;
    for (let i = 0;i < pattern.nodes.length; i += 1) {
      if (!nextEnv)
        return null;
      nextEnv = matchWithEnv(value[i], pattern.nodes[i], nextEnv);
    }
    return nextEnv;
  }
  if (pattern.kind === "curly") {
    if (isCurlyHead(pattern, "$r"))
      return matchRegular(value, pattern, env);
    if (isCurlyHead(pattern, "$type"))
      return matchTypeCtor(value, pattern, env);
  }
  if (pattern.kind === "binop") {
    const bop = pattern;
    if (bop.op === "|") {
      return matchWithEnv(value, bop.left, { ...env }) ?? matchWithEnv(value, bop.right, { ...env });
    }
    if (bop.op === "&") {
      const left = matchWithEnv(value, bop.left, { ...env });
      if (!left)
        return null;
      return matchWithEnv(value, bop.right, left);
    }
    if (bop.op === ":" && isIdent(bop.left, "_") && bop.right.kind === "identifier") {
      return checkType(value, bop.right.value) ? env : null;
    }
    if (bop.op === "=") {
      if (bop.left.kind !== "identifier")
        return null;
      const matched = matchWithEnv(value, bop.right, { ...env });
      if (!matched)
        return null;
      matched[bop.left.value] = value;
      return matched;
    }
    return evalWithValue(bop, value) ? env : null;
  }
  return null;
}
function isCurlyHead(n, wanted) {
  return n.nodes.length > 0 && n.nodes[0].kind === "identifier" && n.nodes[0].value === wanted;
}
function checkType(value, typeName) {
  if (typeName === "str" || typeName === "string")
    return typeof value === "string";
  if (typeName === "int")
    return Number.isInteger(value);
  if (typeName === "float" || typeName === "number")
    return typeof value === "number";
  if (typeName === "bool" || typeName === "boolean")
    return typeof value === "boolean";
  if (typeName === "list" || typeName === "array")
    return Array.isArray(value);
  if (typeName === "dict" || typeName === "object")
    return !!value && typeof value === "object" && !Array.isArray(value);
  if (value && typeof value === "object") {
    const ctorName = value.constructor?.name;
    if (ctorName === typeName)
      return true;
  }
  const ctor2 = globalThis[typeName];
  return typeof ctor2 === "function" && value instanceof ctor2;
}
function evalWithValue(node, value) {
  if (isIdent(node, "$"))
    return value;
  if (node.kind === "identifier") {
    if (node.value === "true")
      return true;
    if (node.value === "false")
      return false;
    if (node.value === "null")
      return null;
    return node.value;
  }
  if (node.kind === "number")
    return Number(node.value);
  if (node.kind === "string")
    return node.value;
  if (node.kind === "binop") {
    const left = evalWithValue(node.left, value);
    const right = evalWithValue(node.right, value);
    switch (node.op) {
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case ">":
        return left > right;
      case ">=":
        return left >= right;
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "%":
        return left % right;
      case "&&":
        return Boolean(left) && Boolean(right);
      case "||":
        return Boolean(left) || Boolean(right);
      case ".":
        return left[String(right)];
      default:
        return false;
    }
  }
  if (node.kind === "round") {
    if (node.nodes.length === 1)
      return evalWithValue(node.nodes[0], value);
    return node.nodes.map((n) => evalWithValue(n, value));
  }
  if (node.kind === "square") {
    return node.nodes.map((n) => evalWithValue(n, value));
  }
  return null;
}
function matchRegular(value, pattern, env) {
  if (!Array.isArray(value))
    return null;
  const parts = pattern.nodes.slice(1);
  const matchesPart = (v, p) => {
    return !!matchWithEnv(v, p, {});
  };
  const quantBounds = (q) => {
    if (q.kind === "number") {
      const n = Number(q.value);
      if (!Number.isFinite(n))
        return null;
      return [n, n];
    }
    if (q.kind === "identifier") {
      const key = q.value.startsWith("$") ? q.value.slice(1) : q.value;
      if (key === "maybe")
        return [0, 1];
      if (key === "some")
        return [1, null];
      if (key === "any")
        return [0, null];
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
  const step = (vi, pi) => {
    if (pi >= parts.length)
      return vi === value.length;
    const p = parts[pi];
    if (p.kind === "identifier" && p.value === "$rest")
      return true;
    if (p.kind === "binop" && p.op === "*") {
      const b = quantBounds(p.left);
      if (!b)
        return false;
      const [minCount, maxCount] = b;
      const maxTry = maxCount === null ? value.length - vi : Math.min(maxCount, value.length - vi);
      for (let count = minCount;count <= maxTry; count += 1) {
        let ok = true;
        for (let k = 0;k < count; k += 1) {
          if (!matchesPart(value[vi + k], p.right)) {
            ok = false;
            break;
          }
        }
        if (ok && step(vi + count, pi + 1))
          return true;
      }
      return false;
    }
    if (vi >= value.length)
      return false;
    if (!matchesPart(value[vi], p))
      return false;
    return step(vi + 1, pi + 1);
  };
  return step(0, 0) ? env : null;
}
function matchTypeCtor(value, pattern, env) {
  if (pattern.nodes.length < 2)
    return null;
  const typeNode = pattern.nodes[1];
  if (typeNode.kind !== "identifier")
    return null;
  if (!checkType(value, typeNode.value))
    return null;
  if (!value || typeof value !== "object")
    return env;
  let positional = null;
  const keywords = [];
  for (const extra of pattern.nodes.slice(2)) {
    if (extra.kind !== "square")
      return null;
    if (extra.nodes.length === 0)
      continue;
    const allKw = extra.nodes.every((x) => x.kind === "binop" && x.op === "=" && x.left.kind === "identifier");
    const anyKw = extra.nodes.some((x) => x.kind === "binop" && x.op === "=");
    if (anyKw && !allKw)
      return null;
    if (allKw) {
      for (const n of extra.nodes) {
        const b = n;
        keywords.push({ key: b.left.value, patt: b.right });
      }
      continue;
    }
    if (positional)
      return null;
    positional = extra.nodes;
  }
  if (positional) {
    const maybeMatchArgs = value.__match_args__;
    const matchArgs = Array.isArray(maybeMatchArgs) ? maybeMatchArgs.filter((x) => typeof x === "string") : Object.keys(value);
    if (matchArgs.length < positional.length)
      return null;
    for (let i = 0;i < positional.length; i += 1) {
      const key = matchArgs[i];
      const v = value[key];
      if (!matchWithEnv(v, positional[i], { ...env }))
        return null;
    }
  }
  for (const kw of keywords) {
    const v = value[kw.key];
    if (!matchWithEnv(v, kw.patt, { ...env }))
      return null;
  }
  return env;
}

// src/browser.ts
function compileForBrowser(src) {
  return compileToJs(src);
}
function runInBrowser(src, options = {}) {
  const scope = options.scope ?? {};
  const fn = new Function("__scope", "__makrell_matchPattern", `const __mr_matchPattern = __makrell_matchPattern; with (__scope) { return ${compileToJs(src)}; }`);
  return fn(scope, matchPattern);
}
export {
  runInBrowser,
  compileForBrowser
};

//# debugId=17263956B960F77864756E2164756E21
//# sourceMappingURL=browser.js.map
