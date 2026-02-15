// src/ast.ts
function isNode(v) {
  if (!v || typeof v !== "object")
    return false;
  const k = v.kind;
  return typeof k === "string";
}
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

// src/tokenizer.ts
var isSpace = function(ch) {
  return ch === " " || ch === "\n" || ch === "\t" || ch === "\r";
};
var isIdentStart = function(ch) {
  return /[A-Za-z_$]/.test(ch);
};
var isIdentBody = function(ch) {
  return /[A-Za-z0-9_$]/.test(ch);
};
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
      if (ch === "\n") {
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
      while (i < src.length && src[i] !== "\n")
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
var multiOps = ["==", "!=", "<=", ">=", "&&", "||", "->", "**", ".."];
var singleOps = new Set("+-*/%=<>|&.:@'\\".split(""));

// src/parser.ts
var opInfo = function(operator) {
  return precedence[operator] ?? [0, "left"];
};
var mergeLoc = function(a, b) {
  if (!a)
    return b;
  if (!b)
    return a;
  return { start: a.start, end: b.end };
};
var rootLoc = function() {
  const p = { index: 0, line: 1, column: 1 };
  return { start: p, end: p };
};
var parseBrackets = function(src) {
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
};
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
var transform = function(n) {
  if (n.kind === "curly" || n.kind === "round" || n.kind === "square" || n.kind === "sequence") {
    const kids = operatorParseNodes(n.nodes);
    return { ...n, nodes: kids, loc: n.loc };
  }
  return n;
};
function parse(src) {
  const root = parseBrackets(src);
  return operatorParseNodes(root.nodes);
}
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

// src/macros.ts
var regular = function(nodes) {
  return nodes;
};
var isNodeList = function(v) {
  return Array.isArray(v) && v.every((x) => isNode(x));
};
var toNode = function(v) {
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
};
var ctor = function(name) {
  return { __nodeCtor: name };
};
var nodeCtorName = function(v) {
  if (!v || typeof v !== "object")
    return null;
  const n = v.__nodeCtor;
  return typeof n === "string" ? n : null;
};
var isTruthy = function(v) {
  return Boolean(v);
};
var evalBinOp = function(n, env, ctx) {
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
};
var evalQuoteNode = function(n, env, ctx) {
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
};
var evalMacroNode = function(n, env, ctx) {
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
};
var baseMacroEnv = function(ctx) {
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
};
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

// src/compiler.ts
var nextTmp = function(ctx) {
  ctx.tempId += 1;
  return `__mr_tmp_${ctx.tempId}`;
};
var fail = function(message, node) {
  throw new CompileFailure({ message, loc: node?.loc });
};
var expandMacro = function(n, ctx) {
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
};
var registerMacroDef = function(n, ctx) {
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
};
var emitLiteralIdentifier = function(name) {
  if (name === "true" || name === "false" || name === "null")
    return name;
  return name;
};
var emitTypeNode = function(n) {
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
};
var compileAssignLeft = function(n, ctx) {
  if (n.kind === "binop" && n.op === ":")
    return compileAssignLeft(n.left, ctx);
  if (n.kind === "identifier")
    return n.value;
  if (n.kind === "binop" && n.op === ".")
    return `${compileExpr(n.left, ctx)}.${compileExpr(n.right, ctx)}`;
  fail("Invalid assignment target", n);
};
var compileIfExpr = function(nodes, ctx) {
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
};
var compileDoExpr = function(nodes, ctx) {
  const body = compileBlock(nodes, ctx, true);
  return `(() => {${body}})()`;
};
var compileMatchExpr = function(nodes, ctx) {
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
  return `(() => {${chunks.join("\n")}})()`;
};
var compileFunExpr = function(nodes, ctx) {
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
};
var compileWhenExpr = function(nodes, ctx) {
  if (nodes.length === 0)
    return "null";
  const cond = compileExpr(nodes[0], ctx);
  const thenBody = compileBlock(nodes.slice(1), ctx, true);
  return `(() => { if (${cond}) { ${thenBody} } return null; })()`;
};
var compileWhileExpr = function(nodes, ctx) {
  if (nodes.length === 0)
    return "null";
  const cond = compileExpr(nodes[0], ctx);
  const body = compileBlock(nodes.slice(1), ctx, false);
  return `(() => { while (${cond}) { ${body} } return null; })()`;
};
var compileForExpr = function(nodes, ctx) {
  if (nodes.length < 2)
    return "null";
  const target = nodes[0];
  if (target.kind !== "identifier")
    fail("for target must be identifier", target);
  const iterable = compileExpr(nodes[1], ctx);
  const body = compileBlock(nodes.slice(2), ctx, false);
  return `(() => { for (const ${target.value} of ${iterable}) { ${body} } return null; })()`;
};
var compileMethod = function(n, ctx) {
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
};
var compileClassExpr = function(nodes, ctx) {
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
  return `class ${className} {${parts.join("\n")}}`;
};
var nodeToModuleName = function(n) {
  if (n.kind === "identifier")
    return n.value;
  if (n.kind === "binop" && n.op === ".")
    return `${nodeToModuleName(n.left)}.${nodeToModuleName(n.right)}`;
  fail("Invalid module identifier", n);
};
var parseImportFromNames = function(n) {
  if (n.kind === "square" || n.kind === "round") {
    return n.nodes.map((x) => {
      if (x.kind !== "identifier")
        fail("import from names must be identifiers", x);
      return x.value;
    });
  }
  fail("Invalid import from list", n);
};
var compileImportExpr = function(nodes) {
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
  return `(() => {${steps.join("\n")}})()`;
};
var applyImportm = function(nodes, ctx) {
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
};
var compileCurly = function(n, ctx) {
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
};
var compilePipe = function(left, right, ctx) {
  const leftExpr = compileExpr(left, ctx);
  if (right.kind === "identifier")
    return `${right.value}(${leftExpr})`;
  if (right.kind === "curly" && right.nodes.length > 0) {
    const head = compileExpr(right.nodes[0], ctx);
    const rest = right.nodes.slice(1).map((a) => compileExpr(a, ctx));
    return `${head}(${[leftExpr, ...rest].join(", ")})`;
  }
  return `${compileExpr(right, ctx)}(${leftExpr})`;
};
var compileExpr = function(n, ctx) {
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
};
var isFunDecl = function(n) {
  return n.kind === "curly" && n.nodes.length >= 3 && isIdent(n.nodes[0], "fun") && n.nodes[1].kind === "identifier";
};
var isMacroDecl = function(n) {
  return n.kind === "curly" && n.nodes.length >= 5 && isIdent(n.nodes[0], "def") && isIdent(n.nodes[1], "macro");
};
var isClassDecl = function(n) {
  return n.kind === "curly" && n.nodes.length >= 2 && isIdent(n.nodes[0], "class") && n.nodes[1].kind === "identifier";
};
var compileStmt = function(n, ctx, isLast) {
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
      return parts.join("\n");
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
      return `${classExpr};\nreturn ${n.nodes[1].value};`;
    return `${classExpr};`;
  }
  if (n.kind === "binop" && n.op === "=" && n.left.kind === "identifier") {
    const rhs = compileExpr(n.right, ctx);
    const assign = `var ${n.left.value} = ${rhs};`;
    if (isLast)
      return `${assign}\nreturn ${n.left.value};`;
    return assign;
  }
  if (n.kind === "binop" && n.op === "=" && n.left.kind === "binop" && n.left.op === ":" && n.left.left.kind === "identifier") {
    const rhs = compileExpr(n.right, ctx);
    const t = emitTypeNode(n.left.right);
    const decl = ctx.emitTarget === "ts" ? `var ${n.left.left.value}: ${t} = ${rhs};` : `var ${n.left.left.value} = ${rhs};`;
    if (isLast)
      return `${decl}\nreturn ${n.left.left.value};`;
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
};
var compileBlock = function(nodes, ctx, autoReturn) {
  const lines = [];
  const filtered = nodes.filter(Boolean);
  for (let i = 0;i < filtered.length; i += 1) {
    const line = compileStmt(filtered[i], ctx, autoReturn && i === filtered.length - 1);
    if (line)
      lines.push(line);
  }
  if (lines.length === 0 && autoReturn)
    lines.push("return null;");
  return lines.join("\n");
};
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
  return `(() => {\n${body}\n})()`;
}
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

// src/pattern.ts
function matchPattern(value, pattern) {
  return !!matchWithEnv(value, pattern, {});
}
var matchWithEnv = function(value, pattern, env) {
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
};
var isCurlyHead = function(n, wanted) {
  return n.nodes.length > 0 && n.nodes[0].kind === "identifier" && n.nodes[0].value === wanted;
};
var checkType = function(value, typeName) {
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
};
var evalWithValue = function(node, value) {
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
};
var matchRegular = function(value, pattern, env) {
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
};
var matchTypeCtor = function(value, pattern, env) {
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
};
var patternHooks = [];

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

//# debugId=5BC1DCC6BBCA55C564756e2164756e21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi5cXC4uXFxzcmNcXGFzdC50cyIsICIuLlxcLi5cXHNyY1xcdG9rZW5pemVyLnRzIiwgIi4uXFwuLlxcc3JjXFxwYXJzZXIudHMiLCAiLi5cXC4uXFxzcmNcXG1hY3Jvcy50cyIsICIuLlxcLi5cXHNyY1xcY29tcGlsZXIudHMiLCAiLi5cXC4uXFxzcmNcXGNvbXBpbGVyLnRzIiwgIi4uXFwuLlxcc3JjXFxwYXR0ZXJuLnRzIiwgIi4uXFwuLlxcc3JjXFxicm93c2VyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgImV4cG9ydCB0eXBlIE5vZGUgPVxuICB8IElkZW50aWZpZXJOb2RlXG4gIHwgU3RyaW5nTm9kZVxuICB8IE51bWJlck5vZGVcbiAgfCBPcGVyYXRvck5vZGVcbiAgfCBCaW5PcE5vZGVcbiAgfCBSb3VuZEJyYWNrZXRzTm9kZVxuICB8IFNxdWFyZUJyYWNrZXRzTm9kZVxuICB8IEN1cmx5QnJhY2tldHNOb2RlXG4gIHwgU2VxdWVuY2VOb2RlO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJhc2VOb2RlIHtcbiAga2luZDogc3RyaW5nO1xuICBsb2M/OiBTb3VyY2VTcGFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNvdXJjZVBvcyB7XG4gIGluZGV4OiBudW1iZXI7XG4gIGxpbmU6IG51bWJlcjtcbiAgY29sdW1uOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU291cmNlU3BhbiB7XG4gIHN0YXJ0OiBTb3VyY2VQb3M7XG4gIGVuZDogU291cmNlUG9zO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIElkZW50aWZpZXJOb2RlIGV4dGVuZHMgQmFzZU5vZGUge1xuICBraW5kOiBcImlkZW50aWZpZXJcIjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdHJpbmdOb2RlIGV4dGVuZHMgQmFzZU5vZGUge1xuICBraW5kOiBcInN0cmluZ1wiO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE51bWJlck5vZGUgZXh0ZW5kcyBCYXNlTm9kZSB7XG4gIGtpbmQ6IFwibnVtYmVyXCI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3BlcmF0b3JOb2RlIGV4dGVuZHMgQmFzZU5vZGUge1xuICBraW5kOiBcIm9wZXJhdG9yXCI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmluT3BOb2RlIGV4dGVuZHMgQmFzZU5vZGUge1xuICBraW5kOiBcImJpbm9wXCI7XG4gIGxlZnQ6IE5vZGU7XG4gIG9wOiBzdHJpbmc7XG4gIHJpZ2h0OiBOb2RlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJvdW5kQnJhY2tldHNOb2RlIGV4dGVuZHMgQmFzZU5vZGUge1xuICBraW5kOiBcInJvdW5kXCI7XG4gIG5vZGVzOiBOb2RlW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3F1YXJlQnJhY2tldHNOb2RlIGV4dGVuZHMgQmFzZU5vZGUge1xuICBraW5kOiBcInNxdWFyZVwiO1xuICBub2RlczogTm9kZVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEN1cmx5QnJhY2tldHNOb2RlIGV4dGVuZHMgQmFzZU5vZGUge1xuICBraW5kOiBcImN1cmx5XCI7XG4gIG5vZGVzOiBOb2RlW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VxdWVuY2VOb2RlIGV4dGVuZHMgQmFzZU5vZGUge1xuICBraW5kOiBcInNlcXVlbmNlXCI7XG4gIG5vZGVzOiBOb2RlW107XG59XG5cbmV4cG9ydCBjb25zdCBpZGVudCA9ICh2YWx1ZTogc3RyaW5nLCBsb2M/OiBTb3VyY2VTcGFuKTogSWRlbnRpZmllck5vZGUgPT4gKHsga2luZDogXCJpZGVudGlmaWVyXCIsIHZhbHVlLCBsb2MgfSk7XG5leHBvcnQgY29uc3QgbnVtID0gKHZhbHVlOiBzdHJpbmcsIGxvYz86IFNvdXJjZVNwYW4pOiBOdW1iZXJOb2RlID0+ICh7IGtpbmQ6IFwibnVtYmVyXCIsIHZhbHVlLCBsb2MgfSk7XG5leHBvcnQgY29uc3Qgc3RyID0gKHZhbHVlOiBzdHJpbmcsIGxvYz86IFNvdXJjZVNwYW4pOiBTdHJpbmdOb2RlID0+ICh7IGtpbmQ6IFwic3RyaW5nXCIsIHZhbHVlLCBsb2MgfSk7XG5leHBvcnQgY29uc3Qgb3AgPSAodmFsdWU6IHN0cmluZywgbG9jPzogU291cmNlU3Bhbik6IE9wZXJhdG9yTm9kZSA9PiAoeyBraW5kOiBcIm9wZXJhdG9yXCIsIHZhbHVlLCBsb2MgfSk7XG5leHBvcnQgY29uc3QgYmluID0gKGxlZnQ6IE5vZGUsIG9wZXJhdG9yOiBzdHJpbmcsIHJpZ2h0OiBOb2RlLCBsb2M/OiBTb3VyY2VTcGFuKTogQmluT3BOb2RlID0+ICh7XG4gIGtpbmQ6IFwiYmlub3BcIixcbiAgbGVmdCxcbiAgb3A6IG9wZXJhdG9yLFxuICByaWdodCxcbiAgbG9jLFxufSk7XG5leHBvcnQgY29uc3QgY3VybHkgPSAobm9kZXM6IE5vZGVbXSwgbG9jPzogU291cmNlU3Bhbik6IEN1cmx5QnJhY2tldHNOb2RlID0+ICh7IGtpbmQ6IFwiY3VybHlcIiwgbm9kZXMsIGxvYyB9KTtcbmV4cG9ydCBjb25zdCBzcXVhcmUgPSAobm9kZXM6IE5vZGVbXSwgbG9jPzogU291cmNlU3Bhbik6IFNxdWFyZUJyYWNrZXRzTm9kZSA9PiAoeyBraW5kOiBcInNxdWFyZVwiLCBub2RlcywgbG9jIH0pO1xuZXhwb3J0IGNvbnN0IHJvdW5kID0gKG5vZGVzOiBOb2RlW10sIGxvYz86IFNvdXJjZVNwYW4pOiBSb3VuZEJyYWNrZXRzTm9kZSA9PiAoeyBraW5kOiBcInJvdW5kXCIsIG5vZGVzLCBsb2MgfSk7XG5cbmV4cG9ydCBjb25zdCBpc0lkZW50ID0gKG46IE5vZGUsIHdhbnRlZD86IHN0cmluZyk6IG4gaXMgSWRlbnRpZmllck5vZGUgPT4ge1xuICByZXR1cm4gbi5raW5kID09PSBcImlkZW50aWZpZXJcIiAmJiAod2FudGVkID09PSB1bmRlZmluZWQgfHwgbi52YWx1ZSA9PT0gd2FudGVkKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBpc05vZGUodjogdW5rbm93bik6IHYgaXMgTm9kZSB7XG4gIGlmICghdiB8fCB0eXBlb2YgdiAhPT0gXCJvYmplY3RcIikgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBrID0gKHYgYXMgeyBraW5kPzogdW5rbm93biB9KS5raW5kO1xuICByZXR1cm4gdHlwZW9mIGsgPT09IFwic3RyaW5nXCI7XG59XG4iLAogICJpbXBvcnQgeyBOb2RlLCBTb3VyY2VQb3MsIFNvdXJjZVNwYW4sIGlkZW50LCBudW0sIG9wLCBzdHIgfSBmcm9tIFwiLi9hc3RcIjtcblxuY29uc3QgbXVsdGlPcHMgPSBbXCI9PVwiLCBcIiE9XCIsIFwiPD1cIiwgXCI+PVwiLCBcIiYmXCIsIFwifHxcIiwgXCItPlwiLCBcIioqXCIsIFwiLi5cIl07XG5jb25zdCBzaW5nbGVPcHMgPSBuZXcgU2V0KFwiKy0qLyU9PD58Ji46QCdcXFxcXCIuc3BsaXQoXCJcIikpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJyYWNrZXRUb2tlbiB7XG4gIGtpbmQ6IFwibHBhclwiIHwgXCJycGFyXCI7XG4gIHZhbHVlOiBzdHJpbmc7XG4gIGxvYzogU291cmNlU3Bhbjtcbn1cblxudHlwZSBUb2sgPSBOb2RlIHwgQnJhY2tldFRva2VuO1xuXG5mdW5jdGlvbiBpc1NwYWNlKGNoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNoID09PSBcIiBcIiB8fCBjaCA9PT0gXCJcXG5cIiB8fCBjaCA9PT0gXCJcXHRcIiB8fCBjaCA9PT0gXCJcXHJcIjtcbn1cblxuZnVuY3Rpb24gaXNJZGVudFN0YXJ0KGNoOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIC9bQS1aYS16XyRdLy50ZXN0KGNoKTtcbn1cblxuZnVuY3Rpb24gaXNJZGVudEJvZHkoY2g6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL1tBLVphLXowLTlfJF0vLnRlc3QoY2gpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5pemUoc3JjOiBzdHJpbmcpOiBUb2tbXSB7XG4gIGNvbnN0IG91dDogVG9rW10gPSBbXTtcbiAgbGV0IGkgPSAwO1xuICBsZXQgbGluZSA9IDE7XG4gIGxldCBjb2x1bW4gPSAxO1xuXG4gIGNvbnN0IHBvcyA9ICgpOiBTb3VyY2VQb3MgPT4gKHsgaW5kZXg6IGksIGxpbmUsIGNvbHVtbiB9KTtcbiAgY29uc3Qgc3BhbiA9IChzdGFydDogU291cmNlUG9zLCBlbmQ6IFNvdXJjZVBvcyk6IFNvdXJjZVNwYW4gPT4gKHsgc3RhcnQsIGVuZCB9KTtcbiAgY29uc3QgYWR2YW5jZSA9IChjb3VudCA9IDEpOiB2b2lkID0+IHtcbiAgICBmb3IgKGxldCBrID0gMDsgayA8IGNvdW50OyBrICs9IDEpIHtcbiAgICAgIGNvbnN0IGNoID0gc3JjW2ldO1xuICAgICAgaSArPSAxO1xuICAgICAgaWYgKGNoID09PSBcIlxcblwiKSB7XG4gICAgICAgIGxpbmUgKz0gMTtcbiAgICAgICAgY29sdW1uID0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbHVtbiArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICB3aGlsZSAoaSA8IHNyYy5sZW5ndGgpIHtcbiAgICBjb25zdCBjaCA9IHNyY1tpXTtcblxuICAgIGlmIChpc1NwYWNlKGNoKSkge1xuICAgICAgYWR2YW5jZSgxKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaCA9PT0gXCIjXCIpIHtcbiAgICAgIHdoaWxlIChpIDwgc3JjLmxlbmd0aCAmJiBzcmNbaV0gIT09IFwiXFxuXCIpIGFkdmFuY2UoMSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2ggPT09ICdcIicpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gcG9zKCk7XG4gICAgICBsZXQgaiA9IGkgKyAxO1xuICAgICAgbGV0IGVzY2FwZWQgPSBmYWxzZTtcbiAgICAgIHdoaWxlIChqIDwgc3JjLmxlbmd0aCkge1xuICAgICAgICBjb25zdCBjID0gc3JjW2pdO1xuICAgICAgICBpZiAoIWVzY2FwZWQgJiYgYyA9PT0gJ1wiJykgYnJlYWs7XG4gICAgICAgIGVzY2FwZWQgPSAhZXNjYXBlZCAmJiBjID09PSBcIlxcXFxcIjtcbiAgICAgICAgaWYgKGMgIT09IFwiXFxcXFwiKSBlc2NhcGVkID0gZmFsc2U7XG4gICAgICAgIGogKz0gMTtcbiAgICAgIH1cbiAgICAgIGlmIChqID49IHNyYy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihcIlVudGVybWluYXRlZCBzdHJpbmcgbGl0ZXJhbFwiKTtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3JjLnNsaWNlKGkgKyAxLCBqKTtcbiAgICAgIGFkdmFuY2UoaiArIDEgLSBpKTtcbiAgICAgIG91dC5wdXNoKHN0cih2YWx1ZSwgc3BhbihzdGFydCwgcG9zKCkpKSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY2ggPT09IFwiKFwiIHx8IGNoID09PSBcIltcIiB8fCBjaCA9PT0gXCJ7XCIpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gcG9zKCk7XG4gICAgICBhZHZhbmNlKDEpO1xuICAgICAgb3V0LnB1c2goeyBraW5kOiBcImxwYXJcIiwgdmFsdWU6IGNoLCBsb2M6IHNwYW4oc3RhcnQsIHBvcygpKSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaCA9PT0gXCIpXCIgfHwgY2ggPT09IFwiXVwiIHx8IGNoID09PSBcIn1cIikge1xuICAgICAgY29uc3Qgc3RhcnQgPSBwb3MoKTtcbiAgICAgIGFkdmFuY2UoMSk7XG4gICAgICBvdXQucHVzaCh7IGtpbmQ6IFwicnBhclwiLCB2YWx1ZTogY2gsIGxvYzogc3BhbihzdGFydCwgcG9zKCkpIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgY29uc3QgbWF5YmVPcDIgPSBzcmMuc2xpY2UoaSwgaSArIDIpO1xuICAgIGlmIChtdWx0aU9wcy5pbmNsdWRlcyhtYXliZU9wMikpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gcG9zKCk7XG4gICAgICBhZHZhbmNlKDIpO1xuICAgICAgb3V0LnB1c2gob3AobWF5YmVPcDIsIHNwYW4oc3RhcnQsIHBvcygpKSkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHNpbmdsZU9wcy5oYXMoY2gpKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHBvcygpO1xuICAgICAgYWR2YW5jZSgxKTtcbiAgICAgIG91dC5wdXNoKG9wKGNoLCBzcGFuKHN0YXJ0LCBwb3MoKSkpKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmICgvWzAtOV0vLnRlc3QoY2gpIHx8IChjaCA9PT0gXCItXCIgJiYgL1swLTldLy50ZXN0KHNyY1tpICsgMV0gPz8gXCJcIikpKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHBvcygpO1xuICAgICAgbGV0IGogPSBpO1xuICAgICAgaWYgKHNyY1tqXSA9PT0gXCItXCIpIGogKz0gMTtcbiAgICAgIHdoaWxlIChqIDwgc3JjLmxlbmd0aCAmJiAvWzAtOV0vLnRlc3Qoc3JjW2pdKSkgaiArPSAxO1xuICAgICAgaWYgKHNyY1tqXSA9PT0gXCIuXCIgJiYgL1swLTldLy50ZXN0KHNyY1tqICsgMV0gPz8gXCJcIikpIHtcbiAgICAgICAgaiArPSAxO1xuICAgICAgICB3aGlsZSAoaiA8IHNyYy5sZW5ndGggJiYgL1swLTldLy50ZXN0KHNyY1tqXSkpIGogKz0gMTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlID0gc3JjLnNsaWNlKGksIGopO1xuICAgICAgYWR2YW5jZShqIC0gaSk7XG4gICAgICBvdXQucHVzaChudW0odmFsdWUsIHNwYW4oc3RhcnQsIHBvcygpKSkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGlzSWRlbnRTdGFydChjaCkpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gcG9zKCk7XG4gICAgICBsZXQgaiA9IGkgKyAxO1xuICAgICAgd2hpbGUgKGogPCBzcmMubGVuZ3RoICYmIGlzSWRlbnRCb2R5KHNyY1tqXSkpIGogKz0gMTtcbiAgICAgIGNvbnN0IHZhbHVlID0gc3JjLnNsaWNlKGksIGopO1xuICAgICAgYWR2YW5jZShqIC0gaSk7XG4gICAgICBvdXQucHVzaChpZGVudCh2YWx1ZSwgc3BhbihzdGFydCwgcG9zKCkpKSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgdG9rZW4gbmVhcjogJHtzcmMuc2xpY2UoaSwgaSArIDE2KX1gKTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59XG4iLAogICJpbXBvcnQge1xuICBCaW5PcE5vZGUsXG4gIEN1cmx5QnJhY2tldHNOb2RlLFxuICBOb2RlLFxuICBPcGVyYXRvck5vZGUsXG4gIFJvdW5kQnJhY2tldHNOb2RlLFxuICBTZXF1ZW5jZU5vZGUsXG4gIFNvdXJjZVBvcyxcbiAgU291cmNlU3BhbixcbiAgU3F1YXJlQnJhY2tldHNOb2RlLFxufSBmcm9tIFwiLi9hc3RcIjtcbmltcG9ydCB7IEJyYWNrZXRUb2tlbiwgdG9rZW5pemUgfSBmcm9tIFwiLi90b2tlbml6ZXJcIjtcblxuY29uc3QgcHJlY2VkZW5jZTogUmVjb3JkPHN0cmluZywgW251bWJlciwgXCJsZWZ0XCIgfCBcInJpZ2h0XCJdPiA9IHtcbiAgXCI9XCI6IFs1LCBcInJpZ2h0XCJdLFxuICBcIi0+XCI6IFsxMCwgXCJyaWdodFwiXSxcbiAgXCJ8XCI6IFsyMCwgXCJsZWZ0XCJdLFxuICBcInx8XCI6IFszMCwgXCJsZWZ0XCJdLFxuICBcIiYmXCI6IFs0MCwgXCJsZWZ0XCJdLFxuICBcIj09XCI6IFs1MCwgXCJsZWZ0XCJdLFxuICBcIiE9XCI6IFs1MCwgXCJsZWZ0XCJdLFxuICBcIjxcIjogWzU1LCBcImxlZnRcIl0sXG4gIFwiPD1cIjogWzU1LCBcImxlZnRcIl0sXG4gIFwiPlwiOiBbNTUsIFwibGVmdFwiXSxcbiAgXCI+PVwiOiBbNTUsIFwibGVmdFwiXSxcbiAgXCI6XCI6IFs1OCwgXCJsZWZ0XCJdLFxuICBcIi4uXCI6IFs2MCwgXCJsZWZ0XCJdLFxuICBcIitcIjogWzcwLCBcImxlZnRcIl0sXG4gIFwiLVwiOiBbNzAsIFwibGVmdFwiXSxcbiAgXCIqXCI6IFs4MCwgXCJsZWZ0XCJdLFxuICBcIi9cIjogWzgwLCBcImxlZnRcIl0sXG4gIFwiJVwiOiBbODAsIFwibGVmdFwiXSxcbiAgXCIqKlwiOiBbOTAsIFwicmlnaHRcIl0sXG4gIFwiQFwiOiBbOTUsIFwibGVmdFwiXSxcbiAgXCInXCI6IFsxMDAsIFwibGVmdFwiXSxcbiAgXCIuXCI6IFsxMTAsIFwibGVmdFwiXSxcbn07XG5cbmZ1bmN0aW9uIG9wSW5mbyhvcGVyYXRvcjogc3RyaW5nKTogW251bWJlciwgXCJsZWZ0XCIgfCBcInJpZ2h0XCJdIHtcbiAgcmV0dXJuIHByZWNlZGVuY2Vbb3BlcmF0b3JdID8/IFswLCBcImxlZnRcIl07XG59XG5cbmZ1bmN0aW9uIG1lcmdlTG9jKGE/OiBTb3VyY2VTcGFuLCBiPzogU291cmNlU3Bhbik6IFNvdXJjZVNwYW4gfCB1bmRlZmluZWQge1xuICBpZiAoIWEpIHJldHVybiBiO1xuICBpZiAoIWIpIHJldHVybiBhO1xuICByZXR1cm4geyBzdGFydDogYS5zdGFydCwgZW5kOiBiLmVuZCB9O1xufVxuXG5mdW5jdGlvbiByb290TG9jKCk6IFNvdXJjZVNwYW4ge1xuICBjb25zdCBwOiBTb3VyY2VQb3MgPSB7IGluZGV4OiAwLCBsaW5lOiAxLCBjb2x1bW46IDEgfTtcbiAgcmV0dXJuIHsgc3RhcnQ6IHAsIGVuZDogcCB9O1xufVxuXG5mdW5jdGlvbiBwYXJzZUJyYWNrZXRzKHNyYzogc3RyaW5nKTogU2VxdWVuY2VOb2RlIHtcbiAgY29uc3QgdG9rcyA9IHRva2VuaXplKHNyYyk7XG4gIGNvbnN0IHN0YWNrOiBBcnJheTx7XG4gICAgbm9kZTogU2VxdWVuY2VOb2RlIHwgUm91bmRCcmFja2V0c05vZGUgfCBTcXVhcmVCcmFja2V0c05vZGUgfCBDdXJseUJyYWNrZXRzTm9kZTtcbiAgICBvcGVuPzogQnJhY2tldFRva2VuO1xuICB9PiA9IFt7IG5vZGU6IHsga2luZDogXCJzZXF1ZW5jZVwiLCBub2RlczogW10sIGxvYzogcm9vdExvYygpIH0gfV07XG5cbiAgY29uc3QgY2xvc2VGb3I6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiKFwiOiBcIilcIiwgXCJbXCI6IFwiXVwiLCBcIntcIjogXCJ9XCIgfTtcblxuICBmb3IgKGNvbnN0IHQgb2YgdG9rcykge1xuICAgIGlmICh0LmtpbmQgPT09IFwibHBhclwiKSB7XG4gICAgICBsZXQgYjogUm91bmRCcmFja2V0c05vZGUgfCBTcXVhcmVCcmFja2V0c05vZGUgfCBDdXJseUJyYWNrZXRzTm9kZTtcbiAgICAgIGlmICh0LnZhbHVlID09PSBcIihcIikgYiA9IHsga2luZDogXCJyb3VuZFwiLCBub2RlczogW10gfTtcbiAgICAgIGVsc2UgaWYgKHQudmFsdWUgPT09IFwiW1wiKSBiID0geyBraW5kOiBcInNxdWFyZVwiLCBub2RlczogW10gfTtcbiAgICAgIGVsc2UgYiA9IHsga2luZDogXCJjdXJseVwiLCBub2RlczogW10gfTtcbiAgICAgIHN0YWNrLnB1c2goeyBub2RlOiBiLCBvcGVuOiB0IH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKHQua2luZCA9PT0gXCJycGFyXCIpIHtcbiAgICAgIGlmIChzdGFjay5sZW5ndGggPD0gMSkgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGNsb3NpbmcgYnJhY2tldCAke3QudmFsdWV9YCk7XG4gICAgICBjb25zdCBkb25lRnJhbWUgPSBzdGFjay5wb3AoKSBhcyB7IG5vZGU6IE5vZGU7IG9wZW46IEJyYWNrZXRUb2tlbiB9O1xuICAgICAgY29uc3QgZXhwZWN0ZWQgPSBjbG9zZUZvcltkb25lRnJhbWUub3Blbi52YWx1ZV07XG4gICAgICBpZiAoZXhwZWN0ZWQgIT09IHQudmFsdWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNtYXRjaGVkIGNsb3NpbmcgYnJhY2tldCAke3QudmFsdWV9LCBleHBlY3RlZCAke2V4cGVjdGVkfWApO1xuICAgICAgfVxuICAgICAgZG9uZUZyYW1lLm5vZGUubG9jID0ge1xuICAgICAgICBzdGFydDogZG9uZUZyYW1lLm9wZW4ubG9jLnN0YXJ0LFxuICAgICAgICBlbmQ6IHQubG9jLmVuZCxcbiAgICAgIH07XG4gICAgICBjb25zdCBwYXJlbnQgPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXS5ub2RlO1xuICAgICAgcGFyZW50Lm5vZGVzLnB1c2goZG9uZUZyYW1lLm5vZGUpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0ubm9kZS5ub2Rlcy5wdXNoKHQpO1xuICB9XG5cbiAgaWYgKHN0YWNrLmxlbmd0aCAhPT0gMSkge1xuICAgIGNvbnN0IGxhc3QgPSBzdGFja1tzdGFjay5sZW5ndGggLSAxXTtcbiAgICBjb25zdCB3aGVyZSA9IGxhc3Qub3Blbj8ubG9jXG4gICAgICA/IGAgYXQgbGluZSAke2xhc3Qub3Blbi5sb2Muc3RhcnQubGluZX0sIGNvbCAke2xhc3Qub3Blbi5sb2Muc3RhcnQuY29sdW1ufWBcbiAgICAgIDogXCJcIjtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVubWF0Y2hlZCBvcGVuaW5nIGJyYWNrZXQke3doZXJlfWApO1xuICB9XG4gIHJldHVybiBzdGFja1swXS5ub2RlIGFzIFNlcXVlbmNlTm9kZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9wZXJhdG9yUGFyc2VOb2Rlcyhub2RlczogTm9kZVtdKTogTm9kZVtdIHtcbiAgY29uc3Qgb3V0cHV0OiBOb2RlW10gPSBbXTtcbiAgY29uc3Qgb3BzOiBPcGVyYXRvck5vZGVbXSA9IFtdO1xuICBsZXQgbGFzdFdhc05vdE9wID0gdHJ1ZTtcblxuICBjb25zdCBoYXNPcHMgPSAoKTogYm9vbGVhbiA9PiBvcHMubGVuZ3RoID4gMDtcblxuICBjb25zdCBhcHBseU9uZSA9ICgpOiB2b2lkID0+IHtcbiAgICBjb25zdCByaWdodCA9IG91dHB1dC5wb3AoKTtcbiAgICBjb25zdCBsZWZ0ID0gb3V0cHV0LnBvcCgpO1xuICAgIGNvbnN0IG9wZXIgPSBvcHMucG9wKCk7XG4gICAgaWYgKCFsZWZ0IHx8ICFyaWdodCB8fCAhb3Blcikge1xuICAgICAgY29uc3Qgd2hlcmUgPSBvcGVyPy5sb2MgPyBgIGF0IGxpbmUgJHtvcGVyLmxvYy5zdGFydC5saW5lfSwgY29sICR7b3Blci5sb2Muc3RhcnQuY29sdW1ufWAgOiBcIlwiO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYWxmb3JtZWQgZXhwcmVzc2lvbiR7d2hlcmV9YCk7XG4gICAgfVxuICAgIG91dHB1dC5wdXNoKHtcbiAgICAgIGtpbmQ6IFwiYmlub3BcIixcbiAgICAgIGxlZnQsXG4gICAgICBvcDogb3Blci52YWx1ZSxcbiAgICAgIHJpZ2h0LFxuICAgICAgbG9jOiBtZXJnZUxvYyhtZXJnZUxvYyhsZWZ0LmxvYywgb3Blci5sb2MpLCByaWdodC5sb2MpLFxuICAgIH0gYXMgQmluT3BOb2RlKTtcbiAgfTtcblxuICBjb25zdCBhcHBseUFsbCA9ICgpOiB2b2lkID0+IHtcbiAgICB3aGlsZSAoaGFzT3BzKCkpIGFwcGx5T25lKCk7XG4gIH07XG5cbiAgZm9yIChjb25zdCBuIG9mIG5vZGVzKSB7XG4gICAgaWYgKG4ua2luZCA9PT0gXCJvcGVyYXRvclwiKSB7XG4gICAgICBjb25zdCBbY3VycmVudFByaW9dID0gb3BJbmZvKG4udmFsdWUpO1xuICAgICAgaWYgKCFoYXNPcHMoKSkge1xuICAgICAgICBvcHMucHVzaChuKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdoaWxlIChoYXNPcHMoKSkge1xuICAgICAgICAgIGNvbnN0IHRvcCA9IG9wc1tvcHMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgY29uc3QgW3N0YWNrUHJpbywgc3RhY2tBc3NvY10gPSBvcEluZm8odG9wLnZhbHVlKTtcbiAgICAgICAgICBpZiAoc3RhY2tQcmlvID4gY3VycmVudFByaW8gfHwgKHN0YWNrUHJpbyA9PT0gY3VycmVudFByaW8gJiYgc3RhY2tBc3NvYyA9PT0gXCJsZWZ0XCIpKSB7XG4gICAgICAgICAgICBhcHBseU9uZSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3BzLnB1c2gobik7XG4gICAgICB9XG4gICAgICBsYXN0V2FzTm90T3AgPSBmYWxzZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChsYXN0V2FzTm90T3ApIGFwcGx5QWxsKCk7XG4gICAgb3V0cHV0LnB1c2godHJhbnNmb3JtKG4pKTtcbiAgICBsYXN0V2FzTm90T3AgPSB0cnVlO1xuICB9XG5cbiAgYXBwbHlBbGwoKTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtKG46IE5vZGUpOiBOb2RlIHtcbiAgaWYgKG4ua2luZCA9PT0gXCJjdXJseVwiIHx8IG4ua2luZCA9PT0gXCJyb3VuZFwiIHx8IG4ua2luZCA9PT0gXCJzcXVhcmVcIiB8fCBuLmtpbmQgPT09IFwic2VxdWVuY2VcIikge1xuICAgIGNvbnN0IGtpZHMgPSBvcGVyYXRvclBhcnNlTm9kZXMobi5ub2Rlcyk7XG4gICAgcmV0dXJuIHsgLi4ubiwgbm9kZXM6IGtpZHMsIGxvYzogbi5sb2MgfSBhcyBOb2RlO1xuICB9XG4gIHJldHVybiBuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2Uoc3JjOiBzdHJpbmcpOiBOb2RlW10ge1xuICBjb25zdCByb290ID0gcGFyc2VCcmFja2V0cyhzcmMpO1xuICByZXR1cm4gb3BlcmF0b3JQYXJzZU5vZGVzKHJvb3Qubm9kZXMpO1xufVxuIiwKICAiaW1wb3J0IHtcbiAgTm9kZSxcbiAgYmluLFxuICBjdXJseSxcbiAgaWRlbnQsXG4gIGlzSWRlbnQsXG4gIGlzTm9kZSxcbiAgbnVtLFxuICBvcCxcbiAgcm91bmQsXG4gIHNxdWFyZSxcbiAgc3RyLFxufSBmcm9tIFwiLi9hc3RcIjtcbmltcG9ydCB7IG9wZXJhdG9yUGFyc2VOb2RlcywgcGFyc2UgfSBmcm9tIFwiLi9wYXJzZXJcIjtcblxuZXhwb3J0IHR5cGUgTWFjcm9GbiA9IChhcmdzOiBOb2RlW10sIGN0eDogTWFjcm9Db250ZXh0KSA9PiBOb2RlIHwgTm9kZVtdO1xuZXhwb3J0IGludGVyZmFjZSBNYWtyZWxsTWFjcm9FbnRyeSB7XG4gIGtpbmQ6IFwibWFrcmVsbFwiO1xuICBwYXJhbXM6IHN0cmluZ1tdO1xuICBib2R5OiBOb2RlW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmF0aXZlTWFjcm9FbnRyeSB7XG4gIGtpbmQ6IFwibmF0aXZlXCI7XG4gIGZuOiBNYWNyb0ZuO1xufVxuXG5leHBvcnQgdHlwZSBNYWNyb0VudHJ5ID0gTWFrcmVsbE1hY3JvRW50cnkgfCBOYXRpdmVNYWNyb0VudHJ5O1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcmlhbGl6ZWRNYWtyZWxsTWFjcm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHBhcmFtczogc3RyaW5nW107XG4gIGJvZHk6IE5vZGVbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNYWNyb0NvbnRleHQge1xuICByZWd1bGFyKG5vZGVzOiBOb2RlW10pOiBOb2RlW107XG4gIHBhcnNlKHNyYzogc3RyaW5nKTogTm9kZVtdO1xuICBvcGVyYXRvclBhcnNlKG5vZGVzOiBOb2RlW10pOiBOb2RlW107XG59XG5cbnR5cGUgTWFjcm9WYWx1ZSA9XG4gIHwgTm9kZVxuICB8IE5vZGVbXVxuICB8IHN0cmluZ1xuICB8IG51bWJlclxuICB8IGJvb2xlYW5cbiAgfCBudWxsXG4gIHwgTWFjcm9WYWx1ZVtdXG4gIHwgKCguLi5hcmdzOiBNYWNyb1ZhbHVlW10pID0+IE1hY3JvVmFsdWUpXG4gIHwgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbmNsYXNzIFJldHVyblNpZ25hbCB7XG4gIHZhbHVlOiBNYWNyb1ZhbHVlO1xuXG4gIGNvbnN0cnVjdG9yKHZhbHVlOiBNYWNyb1ZhbHVlKSB7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB9XG59XG5cbmNsYXNzIEVudiB7XG4gIHByaXZhdGUgcmVhZG9ubHkgb3duID0gbmV3IE1hcDxzdHJpbmcsIE1hY3JvVmFsdWU+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGFyZW50PzogRW52O1xuXG4gIGNvbnN0cnVjdG9yKHBhcmVudD86IEVudikge1xuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICB9XG5cbiAgaGFzKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLm93bi5oYXMobmFtZSkpIHJldHVybiB0cnVlO1xuICAgIGlmICh0aGlzLnBhcmVudCkgcmV0dXJuIHRoaXMucGFyZW50LmhhcyhuYW1lKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCB2YWx1ZTogTWFjcm9WYWx1ZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLm93bi5oYXMobmFtZSkpIHtcbiAgICAgIHRoaXMub3duLnNldChuYW1lLCB2YWx1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudC5oYXMobmFtZSkpIHtcbiAgICAgIHRoaXMucGFyZW50LnNldChuYW1lLCB2YWx1ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMub3duLnNldChuYW1lLCB2YWx1ZSk7XG4gIH1cblxuICBnZXQobmFtZTogc3RyaW5nKTogTWFjcm9WYWx1ZSB7XG4gICAgaWYgKHRoaXMub3duLmhhcyhuYW1lKSkgcmV0dXJuIHRoaXMub3duLmdldChuYW1lKSBhcyBNYWNyb1ZhbHVlO1xuICAgIGlmICh0aGlzLnBhcmVudCkgcmV0dXJuIHRoaXMucGFyZW50LmdldChuYW1lKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbWFjcm8gc3ltYm9sOiAke25hbWV9YCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVndWxhcihub2RlczogTm9kZVtdKTogTm9kZVtdIHtcbiAgcmV0dXJuIG5vZGVzO1xufVxuXG5mdW5jdGlvbiBpc05vZGVMaXN0KHY6IHVua25vd24pOiB2IGlzIE5vZGVbXSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHYpICYmIHYuZXZlcnkoKHgpID0+IGlzTm9kZSh4KSk7XG59XG5cbmZ1bmN0aW9uIHRvTm9kZSh2OiBNYWNyb1ZhbHVlKTogTm9kZSB7XG4gIGlmIChpc05vZGUodikpIHJldHVybiB2O1xuICBpZiAodHlwZW9mIHYgPT09IFwic3RyaW5nXCIpIHJldHVybiBzdHIodik7XG4gIGlmICh0eXBlb2YgdiA9PT0gXCJudW1iZXJcIikgcmV0dXJuIG51bShTdHJpbmcodikpO1xuICBpZiAodHlwZW9mIHYgPT09IFwiYm9vbGVhblwiKSByZXR1cm4gaWRlbnQodiA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiKTtcbiAgaWYgKHYgPT09IG51bGwpIHJldHVybiBpZGVudChcIm51bGxcIik7XG4gIGlmIChpc05vZGVMaXN0KHYpKSByZXR1cm4gc3F1YXJlKHYpO1xuICB0aHJvdyBuZXcgRXJyb3IoYE1hY3JvIHJldHVybmVkIHZhbHVlIHRoYXQgY2Fubm90IGJlIGNvbnZlcnRlZCB0byBBU1Qgbm9kZTogJHtTdHJpbmcodil9YCk7XG59XG5cbmZ1bmN0aW9uIGN0b3IobmFtZTogc3RyaW5nKTogeyBfX25vZGVDdG9yOiBzdHJpbmcgfSB7XG4gIHJldHVybiB7IF9fbm9kZUN0b3I6IG5hbWUgfTtcbn1cblxuZnVuY3Rpb24gbm9kZUN0b3JOYW1lKHY6IHVua25vd24pOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCF2IHx8IHR5cGVvZiB2ICE9PSBcIm9iamVjdFwiKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgbiA9ICh2IGFzIHsgX19ub2RlQ3Rvcj86IHVua25vd24gfSkuX19ub2RlQ3RvcjtcbiAgcmV0dXJuIHR5cGVvZiBuID09PSBcInN0cmluZ1wiID8gbiA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVHJ1dGh5KHY6IE1hY3JvVmFsdWUpOiBib29sZWFuIHtcbiAgcmV0dXJuIEJvb2xlYW4odik7XG59XG5cbmZ1bmN0aW9uIGV2YWxCaW5PcChuOiBFeHRyYWN0PE5vZGUsIHsga2luZDogXCJiaW5vcFwiIH0+LCBlbnY6IEVudiwgY3R4OiBNYWNyb0NvbnRleHQpOiBNYWNyb1ZhbHVlIHtcbiAgaWYgKG4ub3AgPT09IFwiPVwiKSB7XG4gICAgaWYgKG4ubGVmdC5raW5kICE9PSBcImlkZW50aWZpZXJcIikgdGhyb3cgbmV3IEVycm9yKFwiTWFjcm8gYXNzaWdubWVudCBsZWZ0IHNpZGUgbXVzdCBiZSBpZGVudGlmaWVyXCIpO1xuICAgIGNvbnN0IHZhbHVlID0gZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBlbnYsIGN0eCk7XG4gICAgZW52LnNldChuLmxlZnQudmFsdWUsIHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBpZiAobi5vcCA9PT0gXCItPlwiKSB7XG4gICAgY29uc3QgcGFyYW1zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChuLmxlZnQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICAgIHBhcmFtcy5wdXNoKG4ubGVmdC52YWx1ZSk7XG4gICAgfSBlbHNlIGlmIChuLmxlZnQua2luZCA9PT0gXCJzcXVhcmVcIikge1xuICAgICAgZm9yIChjb25zdCBwIG9mIG4ubGVmdC5ub2Rlcykge1xuICAgICAgICBpZiAocC5raW5kICE9PSBcImlkZW50aWZpZXJcIikgdGhyb3cgbmV3IEVycm9yKFwiTGFtYmRhIHBhcmFtcyBtdXN0IGJlIGlkZW50aWZpZXJzXCIpO1xuICAgICAgICBwYXJhbXMucHVzaChwLnZhbHVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBsYW1iZGEgcGFyYW1zXCIpO1xuICAgIH1cblxuICAgIHJldHVybiAoLi4uYXJnczogTWFjcm9WYWx1ZVtdKTogTWFjcm9WYWx1ZSA9PiB7XG4gICAgICBjb25zdCBmbkVudiA9IG5ldyBFbnYoZW52KTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyYW1zLmxlbmd0aDsgaSArPSAxKSBmbkVudi5zZXQocGFyYW1zW2ldLCBhcmdzW2ldID8/IG51bGwpO1xuICAgICAgcmV0dXJuIGV2YWxNYWNyb05vZGUobi5yaWdodCwgZm5FbnYsIGN0eCk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChuLm9wID09PSBcInxcIikge1xuICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgIGlmIChuLnJpZ2h0LmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSB7XG4gICAgICBjb25zdCBmID0gZW52LmdldChuLnJpZ2h0LnZhbHVlKTtcbiAgICAgIGlmICh0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3IoYFBpcGUgdGFyZ2V0ICcke24ucmlnaHQudmFsdWV9JyBpcyBub3QgY2FsbGFibGVgKTtcbiAgICAgIHJldHVybiBmKGxlZnQpO1xuICAgIH1cbiAgICBjb25zdCBjYWxsZWUgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICBpZiAodHlwZW9mIGNhbGxlZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3IoXCJQaXBlIHRhcmdldCBpcyBub3QgY2FsbGFibGVcIik7XG4gICAgcmV0dXJuIGNhbGxlZShsZWZ0KTtcbiAgfVxuXG4gIHN3aXRjaCAobi5vcCkge1xuICAgIGNhc2UgXCIrXCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpICsgKHJpZ2h0IGFzIG51bWJlcik7XG4gICAgfVxuICAgIGNhc2UgXCItXCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpIC0gKHJpZ2h0IGFzIG51bWJlcik7XG4gICAgfVxuICAgIGNhc2UgXCIqXCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpICogKHJpZ2h0IGFzIG51bWJlcik7XG4gICAgfVxuICAgIGNhc2UgXCIvXCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpIC8gKHJpZ2h0IGFzIG51bWJlcik7XG4gICAgfVxuICAgIGNhc2UgXCIlXCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpICUgKHJpZ2h0IGFzIG51bWJlcik7XG4gICAgfVxuICAgIGNhc2UgXCI9PVwiOiB7XG4gICAgICBjb25zdCBsZWZ0ID0gZXZhbE1hY3JvTm9kZShuLmxlZnQsIGVudiwgY3R4KTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBlbnYsIGN0eCk7XG4gICAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQ7XG4gICAgfVxuICAgIGNhc2UgXCIhPVwiOiB7XG4gICAgICBjb25zdCBsZWZ0ID0gZXZhbE1hY3JvTm9kZShuLmxlZnQsIGVudiwgY3R4KTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBlbnYsIGN0eCk7XG4gICAgICByZXR1cm4gbGVmdCAhPT0gcmlnaHQ7XG4gICAgfVxuICAgIGNhc2UgXCI8XCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpIDwgKHJpZ2h0IGFzIG51bWJlcik7XG4gICAgfVxuICAgIGNhc2UgXCI8PVwiOiB7XG4gICAgICBjb25zdCBsZWZ0ID0gZXZhbE1hY3JvTm9kZShuLmxlZnQsIGVudiwgY3R4KTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBlbnYsIGN0eCk7XG4gICAgICByZXR1cm4gKGxlZnQgYXMgbnVtYmVyKSA8PSAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICB9XG4gICAgY2FzZSBcIj5cIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgPiAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICB9XG4gICAgY2FzZSBcIj49XCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpID49IChyaWdodCBhcyBudW1iZXIpO1xuICAgIH1cbiAgICBjYXNlIFwiJiZcIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIEJvb2xlYW4obGVmdCkgJiYgQm9vbGVhbihyaWdodCk7XG4gICAgfVxuICAgIGNhc2UgXCJ8fFwiOiB7XG4gICAgICBjb25zdCBsZWZ0ID0gZXZhbE1hY3JvTm9kZShuLmxlZnQsIGVudiwgY3R4KTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBlbnYsIGN0eCk7XG4gICAgICByZXR1cm4gQm9vbGVhbihsZWZ0KSB8fCBCb29sZWFuKHJpZ2h0KTtcbiAgICB9XG4gICAgY2FzZSBcIkBcIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIE1hY3JvVmFsdWVbXSlbTnVtYmVyKHJpZ2h0KV07XG4gICAgfVxuICAgIGNhc2UgXCIuXCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3Qga2V5ID0gbi5yaWdodC5raW5kID09PSBcImlkZW50aWZpZXJcIiA/IG4ucmlnaHQudmFsdWUgOiBTdHJpbmcoZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBlbnYsIGN0eCkpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIFJlY29yZDxzdHJpbmcsIE1hY3JvVmFsdWU+KVtrZXldID8/IG51bGw7XG4gICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIG1hY3JvIGJpbm9wOiAke24ub3B9YCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZXZhbFF1b3RlTm9kZShuOiBOb2RlLCBlbnY6IEVudiwgY3R4OiBNYWNyb0NvbnRleHQpOiBOb2RlIHwgTm9kZVtdIHtcbiAgaWYgKG4ua2luZCA9PT0gXCJjdXJseVwiICYmIG4ubm9kZXMubGVuZ3RoID4gMCAmJiBuLm5vZGVzWzBdLmtpbmQgPT09IFwiaWRlbnRpZmllclwiICYmIChuLm5vZGVzWzBdLnZhbHVlID09PSBcInVucXVvdGVcIiB8fCBuLm5vZGVzWzBdLnZhbHVlID09PSBcIiRcIikpIHtcbiAgICBjb25zdCByYXcgPSBldmFsTWFjcm9Ob2RlKG4ubm9kZXNbMV0gPz8gaWRlbnQoXCJudWxsXCIpLCBlbnYsIGN0eCk7XG4gICAgaWYgKGlzTm9kZShyYXcpKSByZXR1cm4gcmF3O1xuICAgIGlmIChpc05vZGVMaXN0KHJhdykpIHJldHVybiByYXc7XG4gICAgcmV0dXJuIHRvTm9kZShyYXcpO1xuICB9XG5cbiAgaWYgKG4ua2luZCA9PT0gXCJiaW5vcFwiKSB7XG4gICAgY29uc3QgbGVmdCA9IGV2YWxRdW90ZU5vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgY29uc3QgcmlnaHQgPSBldmFsUXVvdGVOb2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICBpZiAoIWlzTm9kZShsZWZ0KSB8fCAhaXNOb2RlKHJpZ2h0KSkgdGhyb3cgbmV3IEVycm9yKFwiVW5xdW90ZSBwcm9kdWNlZCBpbnZhbGlkIGJpbm9wIHNpZGVcIik7XG4gICAgcmV0dXJuIGJpbihsZWZ0LCBuLm9wLCByaWdodCk7XG4gIH1cblxuICBpZiAobi5raW5kID09PSBcImN1cmx5XCIgfHwgbi5raW5kID09PSBcInNxdWFyZVwiIHx8IG4ua2luZCA9PT0gXCJyb3VuZFwiIHx8IG4ua2luZCA9PT0gXCJzZXF1ZW5jZVwiKSB7XG4gICAgY29uc3Qga2lkczogTm9kZVtdID0gW107XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBuLm5vZGVzKSB7XG4gICAgICBjb25zdCBxID0gZXZhbFF1b3RlTm9kZShjaGlsZCwgZW52LCBjdHgpO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocSkpIGtpZHMucHVzaCguLi5xKTtcbiAgICAgIGVsc2Uga2lkcy5wdXNoKHEpO1xuICAgIH1cbiAgICBpZiAobi5raW5kID09PSBcImN1cmx5XCIpIHJldHVybiBjdXJseShraWRzKTtcbiAgICBpZiAobi5raW5kID09PSBcInNxdWFyZVwiKSByZXR1cm4gc3F1YXJlKGtpZHMpO1xuICAgIGlmIChuLmtpbmQgPT09IFwicm91bmRcIikgcmV0dXJuIHJvdW5kKGtpZHMpO1xuICAgIHJldHVybiB7IGtpbmQ6IFwic2VxdWVuY2VcIiwgbm9kZXM6IGtpZHMgfTtcbiAgfVxuXG4gIGlmIChuLmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSByZXR1cm4gaWRlbnQobi52YWx1ZSk7XG4gIGlmIChuLmtpbmQgPT09IFwibnVtYmVyXCIpIHJldHVybiBudW0obi52YWx1ZSk7XG4gIGlmIChuLmtpbmQgPT09IFwic3RyaW5nXCIpIHJldHVybiBzdHIobi52YWx1ZSk7XG4gIGlmIChuLmtpbmQgPT09IFwib3BlcmF0b3JcIikgcmV0dXJuIG9wKG4udmFsdWUpO1xuXG4gIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgcXVvdGUgbm9kZVwiKTtcbn1cblxuZnVuY3Rpb24gZXZhbE1hY3JvTm9kZShuOiBOb2RlLCBlbnY6IEVudiwgY3R4OiBNYWNyb0NvbnRleHQpOiBNYWNyb1ZhbHVlIHtcbiAgc3dpdGNoIChuLmtpbmQpIHtcbiAgICBjYXNlIFwiaWRlbnRpZmllclwiOlxuICAgICAgaWYgKG4udmFsdWUgPT09IFwidHJ1ZVwiKSByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChuLnZhbHVlID09PSBcImZhbHNlXCIpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChuLnZhbHVlID09PSBcIm51bGxcIikgcmV0dXJuIG51bGw7XG4gICAgICByZXR1cm4gZW52LmdldChuLnZhbHVlKTtcbiAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICByZXR1cm4gbi52YWx1ZTtcbiAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgICByZXR1cm4gTnVtYmVyKG4udmFsdWUpO1xuICAgIGNhc2UgXCJzcXVhcmVcIjpcbiAgICAgIHJldHVybiBuLm5vZGVzLm1hcCgoeCkgPT4gZXZhbE1hY3JvTm9kZSh4LCBlbnYsIGN0eCkpO1xuICAgIGNhc2UgXCJyb3VuZFwiOlxuICAgICAgaWYgKG4ubm9kZXMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgICAgIGlmIChuLm5vZGVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGV2YWxNYWNyb05vZGUobi5ub2Rlc1swXSwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIG4ubm9kZXMubWFwKCh4KSA9PiBldmFsTWFjcm9Ob2RlKHgsIGVudiwgY3R4KSk7XG4gICAgY2FzZSBcImJpbm9wXCI6XG4gICAgICByZXR1cm4gZXZhbEJpbk9wKG4sIGVudiwgY3R4KTtcbiAgICBjYXNlIFwiY3VybHlcIjoge1xuICAgICAgY29uc3QgaGVhZCA9IG4ubm9kZXNbMF07XG4gICAgICBpZiAoaGVhZCAmJiBpc0lkZW50KGhlYWQsIFwiaWZcIikpIHtcbiAgICAgICAgY29uc3QgcGFydHMgPSBuLm5vZGVzLnNsaWNlKDEpO1xuICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgIHdoaWxlIChpICsgMSA8IHBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgIGlmIChpc1RydXRoeShldmFsTWFjcm9Ob2RlKHBhcnRzW2ldLCBlbnYsIGN0eCkpKSByZXR1cm4gZXZhbE1hY3JvTm9kZShwYXJ0c1tpICsgMV0sIGVudiwgY3R4KTtcbiAgICAgICAgICBpICs9IDI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGkgPCBwYXJ0cy5sZW5ndGgpIHJldHVybiBldmFsTWFjcm9Ob2RlKHBhcnRzW2ldLCBlbnYsIGN0eCk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGVhZCAmJiBpc0lkZW50KGhlYWQsIFwiZG9cIikpIHtcbiAgICAgICAgbGV0IHJlczogTWFjcm9WYWx1ZSA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3Qgc3RtdCBvZiBuLm5vZGVzLnNsaWNlKDEpKSByZXMgPSBldmFsTWFjcm9Ob2RlKHN0bXQsIGVudiwgY3R4KTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgIH1cblxuICAgICAgaWYgKGhlYWQgJiYgaXNJZGVudChoZWFkLCBcIndoZW5cIikpIHtcbiAgICAgICAgaWYgKGlzVHJ1dGh5KGV2YWxNYWNyb05vZGUobi5ub2Rlc1sxXSA/PyBpZGVudChcImZhbHNlXCIpLCBlbnYsIGN0eCkpKSB7XG4gICAgICAgICAgbGV0IHJlczogTWFjcm9WYWx1ZSA9IG51bGw7XG4gICAgICAgICAgZm9yIChjb25zdCBzdG10IG9mIG4ubm9kZXMuc2xpY2UoMikpIHJlcyA9IGV2YWxNYWNyb05vZGUoc3RtdCwgZW52LCBjdHgpO1xuICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChoZWFkICYmIGlzSWRlbnQoaGVhZCwgXCJ3aGlsZVwiKSkge1xuICAgICAgICBsZXQgcmVzOiBNYWNyb1ZhbHVlID0gbnVsbDtcbiAgICAgICAgd2hpbGUgKGlzVHJ1dGh5KGV2YWxNYWNyb05vZGUobi5ub2Rlc1sxXSA/PyBpZGVudChcImZhbHNlXCIpLCBlbnYsIGN0eCkpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBzdG10IG9mIG4ubm9kZXMuc2xpY2UoMikpIHJlcyA9IGV2YWxNYWNyb05vZGUoc3RtdCwgZW52LCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgICB9XG5cbiAgICAgIGlmIChoZWFkICYmIGlzSWRlbnQoaGVhZCwgXCJmb3JcIikpIHtcbiAgICAgICAgY29uc3QgdmFyTm9kZSA9IG4ubm9kZXNbMV07XG4gICAgICAgIGlmICghdmFyTm9kZSB8fCB2YXJOb2RlLmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSB0aHJvdyBuZXcgRXJyb3IoXCJmb3IgcmVxdWlyZXMgaWRlbnRpZmllciB2YXJpYWJsZVwiKTtcbiAgICAgICAgY29uc3QgaXRlcmFibGUgPSBldmFsTWFjcm9Ob2RlKG4ubm9kZXNbMl0gPz8gc3F1YXJlKFtdKSwgZW52LCBjdHgpO1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoaXRlcmFibGUpKSB0aHJvdyBuZXcgRXJyb3IoXCJmb3IgaXRlcmFibGUgbXVzdCBldmFsdWF0ZSB0byBhcnJheVwiKTtcbiAgICAgICAgbGV0IHJlczogTWFjcm9WYWx1ZSA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVyYWJsZSkge1xuICAgICAgICAgIGVudi5zZXQodmFyTm9kZS52YWx1ZSwgaXRlbSBhcyBNYWNyb1ZhbHVlKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHN0bXQgb2Ygbi5ub2Rlcy5zbGljZSgzKSkgcmVzID0gZXZhbE1hY3JvTm9kZShzdG10LCBlbnYsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgIH1cblxuICAgICAgaWYgKGhlYWQgJiYgaXNJZGVudChoZWFkLCBcImZ1blwiKSkge1xuICAgICAgICBjb25zdCBtYXliZU5hbWUgPSBuLm5vZGVzWzFdO1xuICAgICAgICBjb25zdCBhcmdzTm9kZSA9IG4ubm9kZXNbMl07XG4gICAgICAgIGlmICghbWF5YmVOYW1lIHx8IG1heWJlTmFtZS5raW5kICE9PSBcImlkZW50aWZpZXJcIiB8fCAhYXJnc05vZGUgfHwgYXJnc05vZGUua2luZCAhPT0gXCJzcXVhcmVcIikge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1hY3JvIHtmdW4gLi4ufSBtdXN0IGJlIHtmdW4gbmFtZSBbYXJnc10gLi4ufVwiKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBhcmdOYW1lcyA9IGFyZ3NOb2RlLm5vZGVzLm1hcCgoYXJnKSA9PiB7XG4gICAgICAgICAgaWYgKGFyZy5raW5kICE9PSBcImlkZW50aWZpZXJcIikgdGhyb3cgbmV3IEVycm9yKFwiZnVuIGFyZ3MgbXVzdCBiZSBpZGVudGlmaWVyc1wiKTtcbiAgICAgICAgICByZXR1cm4gYXJnLnZhbHVlO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgZm4gPSAoLi4uYXJnczogTWFjcm9WYWx1ZVtdKTogTWFjcm9WYWx1ZSA9PiB7XG4gICAgICAgICAgY29uc3QgZm5FbnYgPSBuZXcgRW52KGVudik7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdOYW1lcy5sZW5ndGg7IGkgKz0gMSkgZm5FbnYuc2V0KGFyZ05hbWVzW2ldLCBhcmdzW2ldID8/IG51bGwpO1xuICAgICAgICAgIGxldCBvdXQ6IE1hY3JvVmFsdWUgPSBudWxsO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHN0bXQgb2Ygbi5ub2Rlcy5zbGljZSgzKSkgb3V0ID0gZXZhbE1hY3JvTm9kZShzdG10LCBmbkVudiwgY3R4KTtcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgICAgfSBjYXRjaCAocmV0KSB7XG4gICAgICAgICAgICBpZiAocmV0IGluc3RhbmNlb2YgUmV0dXJuU2lnbmFsKSByZXR1cm4gcmV0LnZhbHVlO1xuICAgICAgICAgICAgdGhyb3cgcmV0O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgZW52LnNldChtYXliZU5hbWUudmFsdWUsIGZuKTtcbiAgICAgICAgcmV0dXJuIGZuO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGVhZCAmJiBpc0lkZW50KGhlYWQsIFwicmV0dXJuXCIpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gbi5ub2Rlc1sxXSA/IGV2YWxNYWNyb05vZGUobi5ub2Rlc1sxXSwgZW52LCBjdHgpIDogbnVsbDtcbiAgICAgICAgdGhyb3cgbmV3IFJldHVyblNpZ25hbCh2YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChoZWFkICYmIGlzSWRlbnQoaGVhZCwgXCJxdW90ZVwiKSkge1xuICAgICAgICBjb25zdCBxcyA9IG4ubm9kZXMuc2xpY2UoMSkubWFwKCh4KSA9PiBldmFsUXVvdGVOb2RlKHgsIGVudiwgY3R4KSk7XG4gICAgICAgIGlmIChxcy5sZW5ndGggPT09IDApIHJldHVybiBzcXVhcmUoW10pO1xuICAgICAgICBpZiAocXMubGVuZ3RoID09PSAxKSByZXR1cm4gcXNbMF0gYXMgTWFjcm9WYWx1ZTtcbiAgICAgICAgY29uc3QgbWVyZ2VkOiBOb2RlW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBxIG9mIHFzKSB7XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocSkpIG1lcmdlZC5wdXNoKC4uLnEpO1xuICAgICAgICAgIGVsc2UgbWVyZ2VkLnB1c2gocSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lcmdlZDtcbiAgICAgIH1cblxuICAgICAgaWYgKGhlYWQgJiYgaGVhZC5raW5kID09PSBcImJpbm9wXCIgJiYgaGVhZC5vcCA9PT0gXCIuXCIpIHtcbiAgICAgICAgY29uc3QgcmVjZWl2ZXIgPSBldmFsTWFjcm9Ob2RlKGhlYWQubGVmdCwgZW52LCBjdHgpO1xuICAgICAgICBjb25zdCBtZW1iZXIgPSBoZWFkLnJpZ2h0LmtpbmQgPT09IFwiaWRlbnRpZmllclwiID8gaGVhZC5yaWdodC52YWx1ZSA6IFN0cmluZyhldmFsTWFjcm9Ob2RlKGhlYWQucmlnaHQsIGVudiwgY3R4KSk7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IChyZWNlaXZlciBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwpPy5bbWVtYmVyXTtcbiAgICAgICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IEVycm9yKGBNYWNybyBtZW1iZXIgJyR7bWVtYmVyfScgaXMgbm90IGNhbGxhYmxlYCk7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBuLm5vZGVzLnNsaWNlKDEpLm1hcCgoYXJnKSA9PiBldmFsTWFjcm9Ob2RlKGFyZywgZW52LCBjdHgpKTtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5hcHBseShyZWNlaXZlciwgYXJncyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNhbGxlZSA9IGhlYWQgPyBldmFsTWFjcm9Ob2RlKGhlYWQsIGVudiwgY3R4KSA6IG51bGw7XG4gICAgICBpZiAodHlwZW9mIGNhbGxlZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3IoXCJNYWNybyBjYWxsIHRhcmdldCBpcyBub3QgY2FsbGFibGVcIik7XG4gICAgICBjb25zdCBhcmdzID0gbi5ub2Rlcy5zbGljZSgxKS5tYXAoKGFyZykgPT4gZXZhbE1hY3JvTm9kZShhcmcsIGVudiwgY3R4KSk7XG4gICAgICByZXR1cm4gY2FsbGVlKC4uLmFyZ3MpO1xuICAgIH1cbiAgICBjYXNlIFwib3BlcmF0b3JcIjpcbiAgICAgIHJldHVybiBuLnZhbHVlO1xuICAgIGNhc2UgXCJzZXF1ZW5jZVwiOiB7XG4gICAgICBsZXQgb3V0OiBNYWNyb1ZhbHVlID0gbnVsbDtcbiAgICAgIGZvciAoY29uc3QgeCBvZiBuLm5vZGVzKSBvdXQgPSBldmFsTWFjcm9Ob2RlKHgsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlTWFjcm9FbnYoY3R4OiBNYWNyb0NvbnRleHQpOiBFbnYge1xuICBjb25zdCBlbnYgPSBuZXcgRW52KCk7XG5cbiAgZW52LnNldChcInJlZ3VsYXJcIiwgKG5vZGVzOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KG5vZGVzKSkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBub2Rlcy5maWx0ZXIoKG4pID0+IGlzTm9kZShuKSk7XG4gIH0pO1xuXG4gIGVudi5zZXQoXCJvcGVyYXRvcl9wYXJzZVwiLCAobm9kZXM6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkobm9kZXMpKSByZXR1cm4gW107XG4gICAgY29uc3QgbnMgPSBub2Rlcy5maWx0ZXIoKG4pOiBuIGlzIE5vZGUgPT4gaXNOb2RlKG4pKTtcbiAgICByZXR1cm4gY3R4Lm9wZXJhdG9yUGFyc2UobnMpO1xuICB9KTtcblxuICBlbnYuc2V0KFwicGFyc2VcIiwgKHNyYzogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4ge1xuICAgIGlmICh0eXBlb2Ygc3JjICE9PSBcInN0cmluZ1wiKSB0aHJvdyBuZXcgRXJyb3IoXCJwYXJzZSBleHBlY3RzIHN0cmluZ1wiKTtcbiAgICByZXR1cm4gY3R4LnBhcnNlKHNyYyk7XG4gIH0pO1xuXG4gIGVudi5zZXQoXCJsZW5cIiwgKHg6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IChBcnJheS5pc0FycmF5KHgpIHx8IHR5cGVvZiB4ID09PSBcInN0cmluZ1wiID8geC5sZW5ndGggOiAwKSk7XG4gIGVudi5zZXQoXCJzdHJcIiwgKHg6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IFN0cmluZyh4KSk7XG4gIGVudi5zZXQoXCJpbnRcIiwgKHg6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IE51bWJlci5wYXJzZUludChTdHJpbmcoeCksIDEwKSk7XG4gIGVudi5zZXQoXCJmbG9hdFwiLCAoeDogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4gTnVtYmVyLnBhcnNlRmxvYXQoU3RyaW5nKHgpKSk7XG4gIGVudi5zZXQoXCJsaXN0XCIsICh4OiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiAoQXJyYXkuaXNBcnJheSh4KSA/IFsuLi54XSA6IFtdKSk7XG4gIGVudi5zZXQoXCJmaXJzdFwiLCAoeDogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4gKEFycmF5LmlzQXJyYXkoeCkgJiYgeC5sZW5ndGggPiAwID8geFswXSA6IG51bGwpKTtcbiAgZW52LnNldChcInJlc3RcIiwgKHg6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IChBcnJheS5pc0FycmF5KHgpID8geC5zbGljZSgxKSA6IFtdKSk7XG4gIGVudi5zZXQoXCJyZXZlcnNlZFwiLCAoeDogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4gKEFycmF5LmlzQXJyYXkoeCkgPyBbLi4ueF0ucmV2ZXJzZSgpIDogW10pKTtcbiAgZW52LnNldChcInB1c2hcIiwgKGFycjogTWFjcm9WYWx1ZSwgaXRlbTogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4ge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShhcnIpKSByZXR1cm4gMDtcbiAgICBhcnIucHVzaChpdGVtKTtcbiAgICByZXR1cm4gYXJyLmxlbmd0aDtcbiAgfSk7XG4gIGVudi5zZXQoXCJwb3BcIiwgKGFycjogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4ge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShhcnIpKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gYXJyLnBvcCgpID8/IG51bGw7XG4gIH0pO1xuICBlbnYuc2V0KFwicmFuZ2VcIiwgKGE6IE1hY3JvVmFsdWUsIGI/OiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiB7XG4gICAgY29uc3QgZnJvbSA9IE51bWJlcihhKTtcbiAgICBjb25zdCB0byA9IGIgPT09IHVuZGVmaW5lZCA/IGZyb20gOiBOdW1iZXIoYik7XG4gICAgY29uc3Qgc3RhcnQgPSBiID09PSB1bmRlZmluZWQgPyAwIDogZnJvbTtcbiAgICBjb25zdCBlbmQgPSBiID09PSB1bmRlZmluZWQgPyBmcm9tIDogdG87XG4gICAgY29uc3Qgb3V0OiBudW1iZXJbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAxKSBvdXQucHVzaChpKTtcbiAgICByZXR1cm4gb3V0O1xuICB9KTtcbiAgZW52LnNldChcIm1hcFwiLCAoZjogTWFjcm9WYWx1ZSwgYXJyOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiB7XG4gICAgaWYgKHR5cGVvZiBmICE9PSBcImZ1bmN0aW9uXCIgfHwgIUFycmF5LmlzQXJyYXkoYXJyKSkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIubWFwKCh4KSA9PiBmKHggYXMgTWFjcm9WYWx1ZSkpO1xuICB9KTtcbiAgZW52LnNldChcInByaW50XCIsICguLi5hcmdzOiBNYWNyb1ZhbHVlW10pOiBNYWNyb1ZhbHVlID0+IHtcbiAgICBjb25zb2xlLmxvZyguLi5hcmdzKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSk7XG4gIGVudi5zZXQoXCJhc3NlcnRcIiwgKGNvbmQ6IE1hY3JvVmFsdWUsIG1zZz86IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IHtcbiAgICBpZiAoIWNvbmQpIHRocm93IG5ldyBFcnJvcihtc2cgPyBTdHJpbmcobXNnKSA6IFwiTWFjcm8gYXNzZXJ0aW9uIGZhaWxlZFwiKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSk7XG5cbiAgZW52LnNldChcImlzaW5zdGFuY2VcIiwgKHZhbDogTWFjcm9WYWx1ZSwgdHlwOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiB7XG4gICAgaWYgKCFpc05vZGUodmFsKSkgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IHRuYW1lID0gbm9kZUN0b3JOYW1lKHR5cCkgPz8gKHR5cGVvZiB0eXAgPT09IFwic3RyaW5nXCIgPyB0eXAgOiBudWxsKTtcbiAgICBpZiAoIXRuYW1lKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRuYW1lID09PSBcIk5vZGVcIikgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBtYXA6IFJlY29yZDxzdHJpbmcsIE5vZGVbXCJraW5kXCJdPiA9IHtcbiAgICAgIElkZW50aWZpZXI6IFwiaWRlbnRpZmllclwiLFxuICAgICAgTnVtYmVyOiBcIm51bWJlclwiLFxuICAgICAgU3RyaW5nOiBcInN0cmluZ1wiLFxuICAgICAgT3BlcmF0b3I6IFwib3BlcmF0b3JcIixcbiAgICAgIEJpbk9wOiBcImJpbm9wXCIsXG4gICAgICBSb3VuZEJyYWNrZXRzOiBcInJvdW5kXCIsXG4gICAgICBTcXVhcmVCcmFja2V0czogXCJzcXVhcmVcIixcbiAgICAgIEN1cmx5QnJhY2tldHM6IFwiY3VybHlcIixcbiAgICAgIFNlcXVlbmNlOiBcInNlcXVlbmNlXCIsXG4gICAgfTtcbiAgICBjb25zdCB3YW50ZWQgPSBtYXBbdG5hbWVdO1xuICAgIHJldHVybiB3YW50ZWQgPyB2YWwua2luZCA9PT0gd2FudGVkIDogZmFsc2U7XG4gIH0pO1xuXG4gIGNvbnN0IGlkZW50aWZpZXJDdG9yID0gKCh2YWx1ZTogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4gaWRlbnQoU3RyaW5nKHZhbHVlKSkpIGFzICgodmFsdWU6IE1hY3JvVmFsdWUpID0+IE1hY3JvVmFsdWUpICYgeyBfX25vZGVDdG9yOiBzdHJpbmcgfTtcbiAgaWRlbnRpZmllckN0b3IuX19ub2RlQ3RvciA9IFwiSWRlbnRpZmllclwiO1xuICBlbnYuc2V0KFwiSWRlbnRpZmllclwiLCBpZGVudGlmaWVyQ3Rvcik7XG5cbiAgY29uc3QgbnVtYmVyQ3RvciA9ICgodmFsdWU6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IG51bShTdHJpbmcodmFsdWUpKSkgYXMgKCh2YWx1ZTogTWFjcm9WYWx1ZSkgPT4gTWFjcm9WYWx1ZSkgJiB7IF9fbm9kZUN0b3I6IHN0cmluZyB9O1xuICBudW1iZXJDdG9yLl9fbm9kZUN0b3IgPSBcIk51bWJlclwiO1xuICBlbnYuc2V0KFwiTnVtYmVyXCIsIG51bWJlckN0b3IpO1xuXG4gIGNvbnN0IHN0cmluZ0N0b3IgPSAoKHZhbHVlOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiBzdHIoU3RyaW5nKHZhbHVlKSkpIGFzICgodmFsdWU6IE1hY3JvVmFsdWUpID0+IE1hY3JvVmFsdWUpICYgeyBfX25vZGVDdG9yOiBzdHJpbmcgfTtcbiAgc3RyaW5nQ3Rvci5fX25vZGVDdG9yID0gXCJTdHJpbmdcIjtcbiAgZW52LnNldChcIlN0cmluZ1wiLCBzdHJpbmdDdG9yKTtcblxuICBjb25zdCBvcGVyYXRvckN0b3IgPSAoKHZhbHVlOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiBvcChTdHJpbmcodmFsdWUpKSkgYXMgKCh2YWx1ZTogTWFjcm9WYWx1ZSkgPT4gTWFjcm9WYWx1ZSkgJiB7IF9fbm9kZUN0b3I6IHN0cmluZyB9O1xuICBvcGVyYXRvckN0b3IuX19ub2RlQ3RvciA9IFwiT3BlcmF0b3JcIjtcbiAgZW52LnNldChcIk9wZXJhdG9yXCIsIG9wZXJhdG9yQ3Rvcik7XG5cbiAgY29uc3QgYmluT3BDdG9yID0gKChsZWZ0OiBNYWNyb1ZhbHVlLCBvcGVyYXRvcjogTWFjcm9WYWx1ZSwgcmlnaHQ6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+XG4gICAgYmluKHRvTm9kZShsZWZ0KSwgU3RyaW5nKG9wZXJhdG9yKSwgdG9Ob2RlKHJpZ2h0KSkpIGFzICgobGVmdDogTWFjcm9WYWx1ZSwgb3BlcmF0b3I6IE1hY3JvVmFsdWUsIHJpZ2h0OiBNYWNyb1ZhbHVlKSA9PiBNYWNyb1ZhbHVlKSAmIHsgX19ub2RlQ3Rvcjogc3RyaW5nIH07XG4gIGJpbk9wQ3Rvci5fX25vZGVDdG9yID0gXCJCaW5PcFwiO1xuICBlbnYuc2V0KFwiQmluT3BcIiwgYmluT3BDdG9yKTtcblxuICBjb25zdCBzcXVhcmVDdG9yID0gKChub2RlczogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT5cbiAgICBzcXVhcmUoQXJyYXkuaXNBcnJheShub2RlcykgPyBub2Rlcy5maWx0ZXIoaXNOb2RlKSA6IFtdKSkgYXMgKChub2RlczogTWFjcm9WYWx1ZSkgPT4gTWFjcm9WYWx1ZSkgJiB7IF9fbm9kZUN0b3I6IHN0cmluZyB9O1xuICBzcXVhcmVDdG9yLl9fbm9kZUN0b3IgPSBcIlNxdWFyZUJyYWNrZXRzXCI7XG4gIGVudi5zZXQoXCJTcXVhcmVCcmFja2V0c1wiLCBzcXVhcmVDdG9yKTtcblxuICBjb25zdCBjdXJseUN0b3IgPSAoKG5vZGVzOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PlxuICAgIGN1cmx5KEFycmF5LmlzQXJyYXkobm9kZXMpID8gbm9kZXMuZmlsdGVyKGlzTm9kZSkgOiBbXSkpIGFzICgobm9kZXM6IE1hY3JvVmFsdWUpID0+IE1hY3JvVmFsdWUpICYgeyBfX25vZGVDdG9yOiBzdHJpbmcgfTtcbiAgY3VybHlDdG9yLl9fbm9kZUN0b3IgPSBcIkN1cmx5QnJhY2tldHNcIjtcbiAgZW52LnNldChcIkN1cmx5QnJhY2tldHNcIiwgY3VybHlDdG9yKTtcblxuICBlbnYuc2V0KFwiUm91bmRCcmFja2V0c1wiLCBjdG9yKFwiUm91bmRCcmFja2V0c1wiKSk7XG4gIGVudi5zZXQoXCJTZXF1ZW5jZVwiLCBjdG9yKFwiU2VxdWVuY2VcIikpO1xuXG4gIHJldHVybiBlbnY7XG59XG5cbmV4cG9ydCBjbGFzcyBNYWNyb1JlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSByZWFkb25seSBtYWNyb3MgPSBuZXcgTWFwPHN0cmluZywgTWFjcm9FbnRyeT4oKTtcblxuICByZWdpc3RlcihuYW1lOiBzdHJpbmcsIGZuOiBNYWNyb0ZuKTogdm9pZCB7XG4gICAgdGhpcy5tYWNyb3Muc2V0KG5hbWUsIHsga2luZDogXCJuYXRpdmVcIiwgZm4gfSk7XG4gIH1cblxuICByZWdpc3Rlck1ha3JlbGwobmFtZTogc3RyaW5nLCBwYXJhbXM6IHN0cmluZ1tdLCBib2R5OiBOb2RlW10pOiB2b2lkIHtcbiAgICB0aGlzLm1hY3Jvcy5zZXQobmFtZSwgeyBraW5kOiBcIm1ha3JlbGxcIiwgcGFyYW1zLCBib2R5IH0pO1xuICB9XG5cbiAgZ2V0KG5hbWU6IHN0cmluZyk6IE1hY3JvRm4gfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IGUgPSB0aGlzLm1hY3Jvcy5nZXQobmFtZSk7XG4gICAgaWYgKCFlIHx8IGUua2luZCAhPT0gXCJuYXRpdmVcIikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gZS5mbjtcbiAgfVxuXG4gIGdldEVudHJ5KG5hbWU6IHN0cmluZyk6IE1hY3JvRW50cnkgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLm1hY3Jvcy5nZXQobmFtZSk7XG4gIH1cblxuICBlbnRyaWVzKCk6IEFycmF5PFtzdHJpbmcsIE1hY3JvRW50cnldPiB7XG4gICAgcmV0dXJuIFsuLi50aGlzLm1hY3Jvcy5lbnRyaWVzKCldO1xuICB9XG5cbiAgc2VyaWFsaXplTWFrcmVsbEVudHJpZXMoKTogU2VyaWFsaXplZE1ha3JlbGxNYWNyb1tdIHtcbiAgICBjb25zdCBvdXQ6IFNlcmlhbGl6ZWRNYWtyZWxsTWFjcm9bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGVudHJ5XSBvZiB0aGlzLm1hY3Jvcy5lbnRyaWVzKCkpIHtcbiAgICAgIGlmIChlbnRyeS5raW5kID09PSBcIm1ha3JlbGxcIikge1xuICAgICAgICBvdXQucHVzaCh7IG5hbWUsIHBhcmFtczogZW50cnkucGFyYW1zLCBib2R5OiBlbnRyeS5ib2R5IH0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0TWFjcm9Db250ZXh0KCk6IE1hY3JvQ29udGV4dCB7XG4gIHJldHVybiB7XG4gICAgcmVndWxhcixcbiAgICBwYXJzZSxcbiAgICBvcGVyYXRvclBhcnNlOiBvcGVyYXRvclBhcnNlTm9kZXMsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5NYWtyZWxsTWFjcm9EZWYoXG4gIHBhcmFtczogc3RyaW5nW10sXG4gIGJvZHk6IE5vZGVbXSxcbiAgYXJnczogTm9kZVtdLFxuICByZWdpc3RyeTogTWFjcm9SZWdpc3RyeSxcbiAgbWFjcm9DdHg6IE1hY3JvQ29udGV4dCxcbik6IE5vZGUgfCBOb2RlW10ge1xuICBjb25zdCBlbnYgPSBiYXNlTWFjcm9FbnYobWFjcm9DdHgpO1xuXG4gIGlmIChwYXJhbXMubGVuZ3RoID09PSAxKSB7XG4gICAgZW52LnNldChwYXJhbXNbMF0sIGFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyYW1zLmxlbmd0aDsgaSArPSAxKSBlbnYuc2V0KHBhcmFtc1tpXSwgYXJnc1tpXSA/PyBpZGVudChcIm51bGxcIikpO1xuICB9XG5cbiAgZm9yIChjb25zdCBbbWFjcm9OYW1lLCBtYWNyb0VudHJ5XSBvZiByZWdpc3RyeS5lbnRyaWVzKCkpIHtcbiAgICBlbnYuc2V0KG1hY3JvTmFtZSwgKC4uLm1hY3JvQXJnczogTWFjcm9WYWx1ZVtdKSA9PiB7XG4gICAgICBjb25zdCBhc05vZGVzID0gbWFjcm9BcmdzLm1hcCgoYSkgPT4gdG9Ob2RlKGEpKTtcbiAgICAgIGlmIChtYWNyb0VudHJ5LmtpbmQgPT09IFwibmF0aXZlXCIpIHJldHVybiBtYWNyb0VudHJ5LmZuKGFzTm9kZXMsIG1hY3JvQ3R4KTtcbiAgICAgIHJldHVybiBydW5NYWtyZWxsTWFjcm9EZWYobWFjcm9FbnRyeS5wYXJhbXMsIG1hY3JvRW50cnkuYm9keSwgYXNOb2RlcywgcmVnaXN0cnksIG1hY3JvQ3R4KTtcbiAgICB9KTtcbiAgfVxuXG4gIGxldCBvdXQ6IE1hY3JvVmFsdWUgPSBudWxsO1xuICB0cnkge1xuICAgIGZvciAoY29uc3Qgc3RtdCBvZiBib2R5KSBvdXQgPSBldmFsTWFjcm9Ob2RlKHN0bXQsIGVudiwgbWFjcm9DdHgpO1xuICB9IGNhdGNoIChyZXQpIHtcbiAgICBpZiAocmV0IGluc3RhbmNlb2YgUmV0dXJuU2lnbmFsKSBvdXQgPSByZXQudmFsdWU7XG4gICAgZWxzZSB0aHJvdyByZXQ7XG4gIH1cblxuICBpZiAoaXNOb2RlKG91dCkpIHJldHVybiBvdXQ7XG4gIGlmIChpc05vZGVMaXN0KG91dCkpIHJldHVybiBvdXQ7XG4gIHJldHVybiB0b05vZGUob3V0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZU1ha3JlbGxNYWNybyhuYW1lOiBzdHJpbmcsIHBhcmFtczogc3RyaW5nW10sIGJvZHk6IE5vZGVbXSwgcmVnaXN0cnk6IE1hY3JvUmVnaXN0cnkpOiBNYWNyb0ZuIHtcbiAgcmVnaXN0cnkucmVnaXN0ZXJNYWtyZWxsKG5hbWUsIHBhcmFtcywgYm9keSk7XG4gIGNvbnN0IGZuOiBNYWNyb0ZuID0gKGFyZ3M6IE5vZGVbXSwgbWFjcm9DdHg6IE1hY3JvQ29udGV4dCk6IE5vZGUgfCBOb2RlW10gPT4ge1xuICAgIHJldHVybiBydW5NYWtyZWxsTWFjcm9EZWYocGFyYW1zLCBib2R5LCBhcmdzLCByZWdpc3RyeSwgbWFjcm9DdHgpO1xuICB9O1xuICByZXR1cm4gZm47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZVNlcmlhbGl6ZWRNYWtyZWxsTWFjcm8ocGF5bG9hZDoge1xuICB0YXJnZXQ6IFNlcmlhbGl6ZWRNYWtyZWxsTWFjcm87XG4gIGFyZ3M6IE5vZGVbXTtcbiAgcmVnaXN0cnk6IFNlcmlhbGl6ZWRNYWtyZWxsTWFjcm9bXTtcbn0pOiBOb2RlIHwgTm9kZVtdIHtcbiAgY29uc3QgcmVnaXN0cnkgPSBuZXcgTWFjcm9SZWdpc3RyeSgpO1xuICBmb3IgKGNvbnN0IHIgb2YgcGF5bG9hZC5yZWdpc3RyeSkge1xuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyTWFrcmVsbChyLm5hbWUsIHIucGFyYW1zLCByLmJvZHkpO1xuICB9XG4gIHJldHVybiBydW5NYWtyZWxsTWFjcm9EZWYoXG4gICAgcGF5bG9hZC50YXJnZXQucGFyYW1zLFxuICAgIHBheWxvYWQudGFyZ2V0LmJvZHksXG4gICAgcGF5bG9hZC5hcmdzLFxuICAgIHJlZ2lzdHJ5LFxuICAgIGRlZmF1bHRNYWNyb0NvbnRleHQoKSxcbiAgKTtcbn1cbiIsCiAgImltcG9ydCB7IEN1cmx5QnJhY2tldHNOb2RlLCBOb2RlLCBTb3VyY2VTcGFuLCBTcXVhcmVCcmFja2V0c05vZGUsIGlzSWRlbnQgfSBmcm9tIFwiLi9hc3RcIjtcbmltcG9ydCB7XG4gIE1ha3JlbGxNYWNyb0VudHJ5LFxuICBNYWNyb1JlZ2lzdHJ5LFxuICBTZXJpYWxpemVkTWFrcmVsbE1hY3JvLFxuICBkZWZhdWx0TWFjcm9Db250ZXh0LFxuICBkZWZpbmVNYWtyZWxsTWFjcm8sXG4gIHJ1bk1ha3JlbGxNYWNyb0RlZixcbn0gZnJvbSBcIi4vbWFjcm9zXCI7XG5pbXBvcnQgdHlwZSB7IE1ldGFSdW50aW1lQWRhcHRlciB9IGZyb20gXCIuL21ldGFfcnVudGltZVwiO1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tIFwiLi9wYXJzZXJcIjtcblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlT3B0aW9ucyB7XG4gIG1hY3Jvcz86IE1hY3JvUmVnaXN0cnk7XG4gIG1ldGFSdW50aW1lPzogTWV0YVJ1bnRpbWVBZGFwdGVyO1xuICBtb2R1bGVSZXNvbHZlcj86IChtb2R1bGVOYW1lOiBzdHJpbmcpID0+IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBtZXRhTW9kdWxlUmVzb2x2ZXI/OiAobW9kdWxlTmFtZTogc3RyaW5nKSA9PiB7IF9fbXJfbWV0YV9fPzogU2VyaWFsaXplZE1ha3JlbGxNYWNyb1tdIH0gfCBudWxsO1xufVxuXG50eXBlIEVtaXRUYXJnZXQgPSBcImpzXCIgfCBcInRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZURpYWdub3N0aWMge1xuICBtZXNzYWdlOiBzdHJpbmc7XG4gIGxvYz86IFNvdXJjZVNwYW47XG59XG5cbmV4cG9ydCBjbGFzcyBDb21waWxlRmFpbHVyZSBleHRlbmRzIEVycm9yIHtcbiAgZGlhZ25vc3RpYzogQ29tcGlsZURpYWdub3N0aWM7XG5cbiAgY29uc3RydWN0b3IoZGlhZ25vc3RpYzogQ29tcGlsZURpYWdub3N0aWMpIHtcbiAgICBjb25zdCB3aGVyZSA9IGRpYWdub3N0aWMubG9jXG4gICAgICA/IGAgW2xpbmUgJHtkaWFnbm9zdGljLmxvYy5zdGFydC5saW5lfSwgY29sICR7ZGlhZ25vc3RpYy5sb2Muc3RhcnQuY29sdW1ufV1gXG4gICAgICA6IFwiXCI7XG4gICAgc3VwZXIoYCR7ZGlhZ25vc3RpYy5tZXNzYWdlfSR7d2hlcmV9YCk7XG4gICAgdGhpcy5kaWFnbm9zdGljID0gZGlhZ25vc3RpYztcbiAgfVxufVxuXG5pbnRlcmZhY2UgQ3R4IHtcbiAgbWFjcm9zOiBNYWNyb1JlZ2lzdHJ5O1xuICBtYWNyb0N0eDogUmV0dXJuVHlwZTx0eXBlb2YgZGVmYXVsdE1hY3JvQ29udGV4dD47XG4gIG1ldGFSdW50aW1lOiBNZXRhUnVudGltZUFkYXB0ZXI7XG4gIG1vZHVsZVJlc29sdmVyPzogKG1vZHVsZU5hbWU6IHN0cmluZykgPT4gUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIG1ldGFNb2R1bGVSZXNvbHZlcj86IChtb2R1bGVOYW1lOiBzdHJpbmcpID0+IHsgX19tcl9tZXRhX18/OiBTZXJpYWxpemVkTWFrcmVsbE1hY3JvW10gfSB8IG51bGw7XG4gIGZuRGVwdGg6IG51bWJlcjtcbiAgdGVtcElkOiBudW1iZXI7XG4gIHRoaXNBbGlhcz86IHN0cmluZztcbiAgZW1pdFRhcmdldDogRW1pdFRhcmdldDtcbn1cblxuY2xhc3MgSW5saW5lTWV0YVJ1bnRpbWVBZGFwdGVyIGltcGxlbWVudHMgTWV0YVJ1bnRpbWVBZGFwdGVyIHtcbiAga2luZCA9IFwiaW5saW5lXCI7XG5cbiAgcnVuTWFrcmVsbE1hY3JvKF9uYW1lOiBzdHJpbmcsIG1hY3JvOiBNYWtyZWxsTWFjcm9FbnRyeSwgYXJnczogTm9kZVtdLCByZWdpc3RyeTogTWFjcm9SZWdpc3RyeSk6IE5vZGUgfCBOb2RlW10ge1xuICAgIHJldHVybiBydW5NYWtyZWxsTWFjcm9EZWYobWFjcm8ucGFyYW1zLCBtYWNyby5ib2R5LCBhcmdzLCByZWdpc3RyeSwgZGVmYXVsdE1hY3JvQ29udGV4dCgpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBuZXh0VG1wKGN0eDogQ3R4KTogc3RyaW5nIHtcbiAgY3R4LnRlbXBJZCArPSAxO1xuICByZXR1cm4gYF9fbXJfdG1wXyR7Y3R4LnRlbXBJZH1gO1xufVxuXG5mdW5jdGlvbiBmYWlsKG1lc3NhZ2U6IHN0cmluZywgbm9kZT86IE5vZGUpOiBuZXZlciB7XG4gIHRocm93IG5ldyBDb21waWxlRmFpbHVyZSh7IG1lc3NhZ2UsIGxvYzogbm9kZT8ubG9jIH0pO1xufVxuXG5mdW5jdGlvbiBleHBhbmRNYWNybyhuOiBDdXJseUJyYWNrZXRzTm9kZSwgY3R4OiBDdHgpOiBOb2RlW10gfCBudWxsIHtcbiAgaWYgKG4ubm9kZXMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgaGVhZCA9IG4ubm9kZXNbMF07XG4gIGlmIChoZWFkLmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgZW50cnkgPSBjdHgubWFjcm9zLmdldEVudHJ5KGhlYWQudmFsdWUpO1xuICBpZiAoIWVudHJ5KSByZXR1cm4gbnVsbDtcbiAgY29uc3Qgb3V0ID0gZW50cnkua2luZCA9PT0gXCJuYXRpdmVcIlxuICAgID8gZW50cnkuZm4obi5ub2Rlcy5zbGljZSgxKSwgY3R4Lm1hY3JvQ3R4KVxuICAgIDogY3R4Lm1ldGFSdW50aW1lLnJ1bk1ha3JlbGxNYWNybyhoZWFkLnZhbHVlLCBlbnRyeSwgbi5ub2Rlcy5zbGljZSgxKSwgY3R4Lm1hY3Jvcyk7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KG91dCkgPyBvdXQgOiBbb3V0XTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJNYWNyb0RlZihuOiBDdXJseUJyYWNrZXRzTm9kZSwgY3R4OiBDdHgpOiBib29sZWFuIHtcbiAgaWYgKG4ubm9kZXMubGVuZ3RoIDwgNSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoIWlzSWRlbnQobi5ub2Rlc1swXSwgXCJkZWZcIikgfHwgIWlzSWRlbnQobi5ub2Rlc1sxXSwgXCJtYWNyb1wiKSkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBuYW1lTm9kZSA9IG4ubm9kZXNbMl07XG4gIGNvbnN0IHBhcmFtc05vZGUgPSBuLm5vZGVzWzNdO1xuICBpZiAobmFtZU5vZGUua2luZCAhPT0gXCJpZGVudGlmaWVyXCIgfHwgcGFyYW1zTm9kZS5raW5kICE9PSBcInNxdWFyZVwiKSB7XG4gICAgZmFpbChcIk1hY3JvIGRlZmluaXRpb24gbXVzdCBiZSB7ZGVmIG1hY3JvIG5hbWUgW3BhcmFtc10gLi4ufVwiLCBuKTtcbiAgfVxuICBjb25zdCBwYXJhbXMgPSBwYXJhbXNOb2RlLm5vZGVzLm1hcCgocCkgPT4ge1xuICAgIGlmIChwLmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSBmYWlsKFwiTWFjcm8gcGFyYW1zIG11c3QgYmUgaWRlbnRpZmllcnNcIiwgcCk7XG4gICAgcmV0dXJuIHAudmFsdWU7XG4gIH0pO1xuICBjb25zdCBib2R5ID0gbi5ub2Rlcy5zbGljZSg0KTtcbiAgZGVmaW5lTWFrcmVsbE1hY3JvKG5hbWVOb2RlLnZhbHVlLCBwYXJhbXMsIGJvZHksIGN0eC5tYWNyb3MpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZW1pdExpdGVyYWxJZGVudGlmaWVyKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChuYW1lID09PSBcInRydWVcIiB8fCBuYW1lID09PSBcImZhbHNlXCIgfHwgbmFtZSA9PT0gXCJudWxsXCIpIHJldHVybiBuYW1lO1xuICByZXR1cm4gbmFtZTtcbn1cblxuZnVuY3Rpb24gZW1pdFR5cGVOb2RlKG46IE5vZGUpOiBzdHJpbmcge1xuICBpZiAobi5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgIGlmIChuLnZhbHVlID09PSBcInN0clwiKSByZXR1cm4gXCJzdHJpbmdcIjtcbiAgICBpZiAobi52YWx1ZSA9PT0gXCJpbnRcIiB8fCBuLnZhbHVlID09PSBcImZsb2F0XCIpIHJldHVybiBcIm51bWJlclwiO1xuICAgIGlmIChuLnZhbHVlID09PSBcImJvb2xcIikgcmV0dXJuIFwiYm9vbGVhblwiO1xuICAgIGlmIChuLnZhbHVlID09PSBcImxpc3RcIikgcmV0dXJuIFwidW5rbm93bltdXCI7XG4gICAgaWYgKG4udmFsdWUgPT09IFwiZGljdFwiKSByZXR1cm4gXCJSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlwiO1xuICAgIGlmIChuLnZhbHVlID09PSBcIm51bGxcIikgcmV0dXJuIFwibnVsbFwiO1xuICAgIHJldHVybiBuLnZhbHVlO1xuICB9XG4gIGlmIChuLmtpbmQgPT09IFwic3RyaW5nXCIpIHJldHVybiBKU09OLnN0cmluZ2lmeShuLnZhbHVlKTtcbiAgaWYgKG4ua2luZCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIG4udmFsdWU7XG4gIGlmIChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcInxcIikgcmV0dXJuIGAke2VtaXRUeXBlTm9kZShuLmxlZnQpfSB8ICR7ZW1pdFR5cGVOb2RlKG4ucmlnaHQpfWA7XG4gIGlmIChuLmtpbmQgPT09IFwic3F1YXJlXCIpIHtcbiAgICBpZiAobi5ub2Rlcy5sZW5ndGggPiAwICYmIG4ubm9kZXNbMF0ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICAgIGNvbnN0IGhlYWQgPSBuLm5vZGVzWzBdLnZhbHVlO1xuICAgICAgY29uc3QgYXJncyA9IG4ubm9kZXMuc2xpY2UoMSkubWFwKCh4KSA9PiBlbWl0VHlwZU5vZGUoeCkpLmpvaW4oXCIsIFwiKTtcbiAgICAgIHJldHVybiBhcmdzLmxlbmd0aCA+IDAgPyBgJHtoZWFkfTwke2FyZ3N9PmAgOiBoZWFkO1xuICAgIH1cbiAgICByZXR1cm4gYFske24ubm9kZXMubWFwKCh4KSA9PiBlbWl0VHlwZU5vZGUoeCkpLmpvaW4oXCIsIFwiKX1dYDtcbiAgfVxuICBpZiAobi5raW5kID09PSBcImN1cmx5XCIgJiYgbi5ub2Rlcy5sZW5ndGggPj0gMyAmJiBpc0lkZW50KG4ubm9kZXNbMF0sIFwiJGRpY3RcIikpIHtcbiAgICBjb25zdCBrZXlQYXJ0ID0gbi5ub2Rlc1sxXTtcbiAgICBjb25zdCB2YWxUeXBlID0gZW1pdFR5cGVOb2RlKG4ubm9kZXNbMl0pO1xuICAgIGlmIChrZXlQYXJ0LmtpbmQgPT09IFwic3F1YXJlXCIgJiYga2V5UGFydC5ub2Rlcy5sZW5ndGggPT09IDMgJiYga2V5UGFydC5ub2Rlc1sxXS5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgICAgY29uc3QgayA9IGtleVBhcnQubm9kZXNbMF07XG4gICAgICBjb25zdCBrSW4gPSBrZXlQYXJ0Lm5vZGVzWzFdO1xuICAgICAgY29uc3Qga2V5cyA9IGtleVBhcnQubm9kZXNbMl07XG4gICAgICBpZiAoay5raW5kID09PSBcImlkZW50aWZpZXJcIiAmJiBrSW4udmFsdWUgPT09IFwiaW5cIikge1xuICAgICAgICByZXR1cm4gYHsgWyR7ay52YWx1ZX0gaW4gJHtlbWl0VHlwZU5vZGUoa2V5cyl9XTogJHt2YWxUeXBlfSB9YDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGBSZWNvcmQ8c3RyaW5nLCAke3ZhbFR5cGV9PmA7XG4gIH1cbiAgcmV0dXJuIFwidW5rbm93blwiO1xufVxuXG5mdW5jdGlvbiBjb21waWxlQXNzaWduTGVmdChuOiBOb2RlLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGlmIChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcIjpcIikgcmV0dXJuIGNvbXBpbGVBc3NpZ25MZWZ0KG4ubGVmdCwgY3R4KTtcbiAgaWYgKG4ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHJldHVybiBuLnZhbHVlO1xuICBpZiAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCIuXCIpIHJldHVybiBgJHtjb21waWxlRXhwcihuLmxlZnQsIGN0eCl9LiR7Y29tcGlsZUV4cHIobi5yaWdodCwgY3R4KX1gO1xuICBmYWlsKFwiSW52YWxpZCBhc3NpZ25tZW50IHRhcmdldFwiLCBuKTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZUlmRXhwcihub2RlczogTm9kZVtdLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGlmIChub2Rlcy5sZW5ndGggPT09IDApIHJldHVybiBcIm51bGxcIjtcbiAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGNvbXBpbGVFeHByKG5vZGVzWzBdLCBjdHgpO1xuXG4gIGNvbnN0IHdhbGsgPSAoc3RhcnQ6IG51bWJlcik6IHN0cmluZyA9PiB7XG4gICAgaWYgKHN0YXJ0ID49IG5vZGVzLmxlbmd0aCkgcmV0dXJuIFwibnVsbFwiO1xuICAgIGlmIChzdGFydCA9PT0gbm9kZXMubGVuZ3RoIC0gMSkgcmV0dXJuIGNvbXBpbGVFeHByKG5vZGVzW3N0YXJ0XSwgY3R4KTtcbiAgICBjb25zdCBjb25kID0gY29tcGlsZUV4cHIobm9kZXNbc3RhcnRdLCBjdHgpO1xuICAgIGNvbnN0IHllcyA9IGNvbXBpbGVFeHByKG5vZGVzW3N0YXJ0ICsgMV0sIGN0eCk7XG4gICAgY29uc3Qgbm8gPSB3YWxrKHN0YXJ0ICsgMik7XG4gICAgcmV0dXJuIGAoJHtjb25kfSA/ICR7eWVzfSA6ICR7bm99KWA7XG4gIH07XG5cbiAgcmV0dXJuIHdhbGsoMCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVEb0V4cHIobm9kZXM6IE5vZGVbXSwgY3R4OiBDdHgpOiBzdHJpbmcge1xuICBjb25zdCBib2R5ID0gY29tcGlsZUJsb2NrKG5vZGVzLCBjdHgsIHRydWUpO1xuICByZXR1cm4gYCgoKSA9PiB7JHtib2R5fX0pKClgO1xufVxuXG5mdW5jdGlvbiBjb21waWxlTWF0Y2hFeHByKG5vZGVzOiBOb2RlW10sIGN0eDogQ3R4KTogc3RyaW5nIHtcbiAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwibnVsbFwiO1xuICBjb25zdCB2YWx1ZUV4cHIgPSBjb21waWxlRXhwcihub2Rlc1swXSwgY3R4KTtcbiAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMikge1xuICAgIGNvbnN0IHBhdHQgPSBKU09OLnN0cmluZ2lmeShub2Rlc1sxXSk7XG4gICAgcmV0dXJuIGBfX21yX21hdGNoUGF0dGVybigke3ZhbHVlRXhwcn0sICR7cGF0dH0pYDtcbiAgfVxuICBjb25zdCB0bXAgPSBuZXh0VG1wKGN0eCk7XG5cbiAgY29uc3QgY2h1bmtzOiBzdHJpbmdbXSA9IFtdO1xuICBjaHVua3MucHVzaChgY29uc3QgJHt0bXB9ID0gJHt2YWx1ZUV4cHJ9O2ApO1xuXG4gIGZvciAobGV0IGkgPSAxOyBpIDwgbm9kZXMubGVuZ3RoIC0gMTsgaSArPSAyKSB7XG4gICAgY29uc3QgcGF0dCA9IEpTT04uc3RyaW5naWZ5KG5vZGVzW2ldKTtcbiAgICBjb25zdCByZXR2YWwgPSBjb21waWxlRXhwcihub2Rlc1tpICsgMV0sIGN0eCk7XG4gICAgY2h1bmtzLnB1c2goYGlmIChfX21yX21hdGNoUGF0dGVybigke3RtcH0sICR7cGF0dH0pKSByZXR1cm4gJHtyZXR2YWx9O2ApO1xuICB9XG4gIGNodW5rcy5wdXNoKFwicmV0dXJuIG51bGw7XCIpO1xuXG4gIHJldHVybiBgKCgpID0+IHske2NodW5rcy5qb2luKFwiXFxuXCIpfX0pKClgO1xufVxuXG5mdW5jdGlvbiBjb21waWxlRnVuRXhwcihub2RlczogTm9kZVtdLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGNvbnN0IHJlc3QgPSBub2Rlcy5zbGljZSgxKTtcbiAgbGV0IG5hbWUgPSBcIlwiO1xuICBsZXQgYXJnc05vZGU6IFNxdWFyZUJyYWNrZXRzTm9kZSB8IG51bGwgPSBudWxsO1xuICBsZXQgYm9keVN0YXJ0ID0gMDtcblxuICBpZiAocmVzdFswXT8ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIgJiYgcmVzdFsxXT8ua2luZCA9PT0gXCJzcXVhcmVcIikge1xuICAgIG5hbWUgPSByZXN0WzBdLnZhbHVlO1xuICAgIGFyZ3NOb2RlID0gcmVzdFsxXTtcbiAgICBib2R5U3RhcnQgPSAyO1xuICB9IGVsc2UgaWYgKHJlc3RbMF0/LmtpbmQgPT09IFwic3F1YXJlXCIpIHtcbiAgICBhcmdzTm9kZSA9IHJlc3RbMF07XG4gICAgYm9keVN0YXJ0ID0gMTtcbiAgfSBlbHNlIHtcbiAgICBmYWlsKFwiSW52YWxpZCBmdW4gc3ludGF4LiBFeHBlY3RlZCB7ZnVuIG5hbWUgW2FyZ3NdIC4uLn0gb3Ige2Z1biBbYXJnc10gLi4ufVwiLCBub2Rlc1swXSk7XG4gIH1cblxuICBjb25zdCBhcmdzID0gYXJnc05vZGUubm9kZXNcbiAgICAubWFwKChuKSA9PiB7XG4gICAgICBpZiAobi5raW5kID09PSBcImlkZW50aWZpZXJcIikgcmV0dXJuIG4udmFsdWU7XG4gICAgICBpZiAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCI6XCIgJiYgbi5sZWZ0LmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSB7XG4gICAgICAgIGlmIChjdHguZW1pdFRhcmdldCA9PT0gXCJ0c1wiKSByZXR1cm4gYCR7bi5sZWZ0LnZhbHVlfTogJHtlbWl0VHlwZU5vZGUobi5yaWdodCl9YDtcbiAgICAgICAgcmV0dXJuIG4ubGVmdC52YWx1ZTtcbiAgICAgIH1cbiAgICAgIGZhaWwoXCJGdW5jdGlvbiBhcmdzIG11c3QgYmUgaWRlbnRpZmllcnMgb3IgdHlwZWQgaWRlbnRpZmllcnNcIiwgbik7XG4gICAgfSlcbiAgICAuam9pbihcIiwgXCIpO1xuXG4gIGNvbnN0IGlubmVyQ3R4OiBDdHggPSB7IC4uLmN0eCwgZm5EZXB0aDogY3R4LmZuRGVwdGggKyAxIH07XG4gIGNvbnN0IGJvZHkgPSBjb21waWxlQmxvY2socmVzdC5zbGljZShib2R5U3RhcnQpLCBpbm5lckN0eCwgdHJ1ZSk7XG5cbiAgaWYgKG5hbWUpIHtcbiAgICByZXR1cm4gYChmdW5jdGlvbiAke25hbWV9KCR7YXJnc30pIHske2JvZHl9fSlgO1xuICB9XG4gIHJldHVybiBgKCgke2FyZ3N9KSA9PiB7JHtib2R5fX0pYDtcbn1cblxuZnVuY3Rpb24gY29tcGlsZVdoZW5FeHByKG5vZGVzOiBOb2RlW10sIGN0eDogQ3R4KTogc3RyaW5nIHtcbiAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwibnVsbFwiO1xuICBjb25zdCBjb25kID0gY29tcGlsZUV4cHIobm9kZXNbMF0sIGN0eCk7XG4gIGNvbnN0IHRoZW5Cb2R5ID0gY29tcGlsZUJsb2NrKG5vZGVzLnNsaWNlKDEpLCBjdHgsIHRydWUpO1xuICByZXR1cm4gYCgoKSA9PiB7IGlmICgke2NvbmR9KSB7ICR7dGhlbkJvZHl9IH0gcmV0dXJuIG51bGw7IH0pKClgO1xufVxuXG5mdW5jdGlvbiBjb21waWxlV2hpbGVFeHByKG5vZGVzOiBOb2RlW10sIGN0eDogQ3R4KTogc3RyaW5nIHtcbiAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwibnVsbFwiO1xuICBjb25zdCBjb25kID0gY29tcGlsZUV4cHIobm9kZXNbMF0sIGN0eCk7XG4gIGNvbnN0IGJvZHkgPSBjb21waWxlQmxvY2sobm9kZXMuc2xpY2UoMSksIGN0eCwgZmFsc2UpO1xuICByZXR1cm4gYCgoKSA9PiB7IHdoaWxlICgke2NvbmR9KSB7ICR7Ym9keX0gfSByZXR1cm4gbnVsbDsgfSkoKWA7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVGb3JFeHByKG5vZGVzOiBOb2RlW10sIGN0eDogQ3R4KTogc3RyaW5nIHtcbiAgaWYgKG5vZGVzLmxlbmd0aCA8IDIpIHJldHVybiBcIm51bGxcIjtcbiAgY29uc3QgdGFyZ2V0ID0gbm9kZXNbMF07XG4gIGlmICh0YXJnZXQua2luZCAhPT0gXCJpZGVudGlmaWVyXCIpIGZhaWwoXCJmb3IgdGFyZ2V0IG11c3QgYmUgaWRlbnRpZmllclwiLCB0YXJnZXQpO1xuICBjb25zdCBpdGVyYWJsZSA9IGNvbXBpbGVFeHByKG5vZGVzWzFdLCBjdHgpO1xuICBjb25zdCBib2R5ID0gY29tcGlsZUJsb2NrKG5vZGVzLnNsaWNlKDIpLCBjdHgsIGZhbHNlKTtcbiAgcmV0dXJuIGAoKCkgPT4geyBmb3IgKGNvbnN0ICR7dGFyZ2V0LnZhbHVlfSBvZiAke2l0ZXJhYmxlfSkgeyAke2JvZHl9IH0gcmV0dXJuIG51bGw7IH0pKClgO1xufVxuXG5mdW5jdGlvbiBjb21waWxlTWV0aG9kKG46IEN1cmx5QnJhY2tldHNOb2RlLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGlmIChuLm5vZGVzLmxlbmd0aCA8IDQgfHwgIWlzSWRlbnQobi5ub2Rlc1swXSwgXCJmdW5cIikgfHwgbi5ub2Rlc1sxXS5raW5kICE9PSBcImlkZW50aWZpZXJcIiB8fCBuLm5vZGVzWzJdLmtpbmQgIT09IFwic3F1YXJlXCIpIHtcbiAgICBmYWlsKFwiQ2xhc3MgbWV0aG9kcyBtdXN0IHVzZSB7ZnVuIG5hbWUgW2FyZ3NdIC4uLn1cIiwgbik7XG4gIH1cbiAgY29uc3QgcmF3TmFtZSA9IG4ubm9kZXNbMV0udmFsdWU7XG4gIGNvbnN0IG1ldGhvZE5hbWUgPSByYXdOYW1lID09PSBcIl9faW5pdF9fXCIgPyBcImNvbnN0cnVjdG9yXCIgOiByYXdOYW1lO1xuICBjb25zdCBhcmdOb2RlcyA9IG4ubm9kZXNbMl0ubm9kZXM7XG4gIGNvbnN0IHBhcmFtczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdOb2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IGFyZyA9IGFyZ05vZGVzW2ldO1xuICAgIGxldCBuYW1lID0gXCJcIjtcbiAgICBpZiAoYXJnLmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSBuYW1lID0gYXJnLnZhbHVlO1xuICAgIGVsc2UgaWYgKGFyZy5raW5kID09PSBcImJpbm9wXCIgJiYgYXJnLm9wID09PSBcIjpcIiAmJiBhcmcubGVmdC5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgICAgbmFtZSA9IGN0eC5lbWl0VGFyZ2V0ID09PSBcInRzXCIgPyBgJHthcmcubGVmdC52YWx1ZX06ICR7ZW1pdFR5cGVOb2RlKGFyZy5yaWdodCl9YCA6IGFyZy5sZWZ0LnZhbHVlO1xuICAgIH1cbiAgICBlbHNlIGZhaWwoXCJNZXRob2QgYXJndW1lbnRzIG11c3QgYmUgaWRlbnRpZmllcnMgb3IgdHlwZWQgaWRlbnRpZmllcnNcIiwgYXJnKTtcbiAgICBpZiAoaSA9PT0gMCAmJiBuYW1lID09PSBcInNlbGZcIikgY29udGludWU7XG4gICAgcGFyYW1zLnB1c2gobmFtZSk7XG4gIH1cbiAgY29uc3QgbWV0aG9kQ3R4OiBDdHggPSB7IC4uLmN0eCwgZm5EZXB0aDogY3R4LmZuRGVwdGggKyAxLCB0aGlzQWxpYXM6IFwic2VsZlwiIH07XG4gIGNvbnN0IGJvZHkgPSBjb21waWxlQmxvY2sobi5ub2Rlcy5zbGljZSgzKSwgbWV0aG9kQ3R4LCBtZXRob2ROYW1lICE9PSBcImNvbnN0cnVjdG9yXCIpO1xuICByZXR1cm4gYCR7bWV0aG9kTmFtZX0oJHtwYXJhbXMuam9pbihcIiwgXCIpfSkgeyR7Ym9keX19YDtcbn1cblxuZnVuY3Rpb24gY29tcGlsZUNsYXNzRXhwcihub2RlczogTm9kZVtdLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGlmIChub2Rlcy5sZW5ndGggPCAyIHx8IG5vZGVzWzFdLmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSB7XG4gICAgZmFpbChcImNsYXNzIHJlcXVpcmVzIG5hbWUgaWRlbnRpZmllclwiLCBub2Rlc1swXSk7XG4gIH1cbiAgY29uc3QgY2xhc3NOYW1lID0gbm9kZXNbMV0udmFsdWU7XG4gIGxldCBib2R5U3RhcnQgPSAyO1xuICBpZiAobm9kZXNbMl0/LmtpbmQgPT09IFwic3F1YXJlXCIpIGJvZHlTdGFydCA9IDM7XG4gIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IG4gb2Ygbm9kZXMuc2xpY2UoYm9keVN0YXJ0KSkge1xuICAgIGlmIChuLmtpbmQgPT09IFwiY3VybHlcIiAmJiBpc0lkZW50KG4ubm9kZXNbMF0sIFwiZnVuXCIpKSB7XG4gICAgICBwYXJ0cy5wdXNoKGNvbXBpbGVNZXRob2QobiwgY3R4KSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBgY2xhc3MgJHtjbGFzc05hbWV9IHske3BhcnRzLmpvaW4oXCJcXG5cIil9fWA7XG59XG5cbmZ1bmN0aW9uIG5vZGVUb01vZHVsZU5hbWUobjogTm9kZSk6IHN0cmluZyB7XG4gIGlmIChuLmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSByZXR1cm4gbi52YWx1ZTtcbiAgaWYgKG4ua2luZCA9PT0gXCJiaW5vcFwiICYmIG4ub3AgPT09IFwiLlwiKSByZXR1cm4gYCR7bm9kZVRvTW9kdWxlTmFtZShuLmxlZnQpfS4ke25vZGVUb01vZHVsZU5hbWUobi5yaWdodCl9YDtcbiAgZmFpbChcIkludmFsaWQgbW9kdWxlIGlkZW50aWZpZXJcIiwgbik7XG59XG5cbmZ1bmN0aW9uIHBhcnNlSW1wb3J0RnJvbU5hbWVzKG46IE5vZGUpOiBzdHJpbmdbXSB7XG4gIGlmIChuLmtpbmQgPT09IFwic3F1YXJlXCIgfHwgbi5raW5kID09PSBcInJvdW5kXCIpIHtcbiAgICByZXR1cm4gbi5ub2Rlc1xuICAgICAgLm1hcCgoeCkgPT4ge1xuICAgICAgICBpZiAoeC5raW5kICE9PSBcImlkZW50aWZpZXJcIikgZmFpbChcImltcG9ydCBmcm9tIG5hbWVzIG11c3QgYmUgaWRlbnRpZmllcnNcIiwgeCk7XG4gICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgfSk7XG4gIH1cbiAgZmFpbChcIkludmFsaWQgaW1wb3J0IGZyb20gbGlzdFwiLCBuKTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZUltcG9ydEV4cHIobm9kZXM6IE5vZGVbXSk6IHN0cmluZyB7XG4gIGNvbnN0IHN0ZXBzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IG4gb2Ygbm9kZXMpIHtcbiAgICBpZiAobi5raW5kID09PSBcImlkZW50aWZpZXJcIiB8fCAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCIuXCIpKSB7XG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gbm9kZVRvTW9kdWxlTmFtZShuKTtcbiAgICAgIGNvbnN0IGFsaWFzID0gbW9kdWxlTmFtZS5pbmNsdWRlcyhcIi5cIikgPyBtb2R1bGVOYW1lLnNwbGl0KFwiLlwiKS5hdCgtMSkgPz8gbW9kdWxlTmFtZSA6IG1vZHVsZU5hbWU7XG4gICAgICBzdGVwcy5wdXNoKGBfX21yX2ltcG9ydCgke0pTT04uc3RyaW5naWZ5KG1vZHVsZU5hbWUpfSwgJHtKU09OLnN0cmluZ2lmeShhbGlhcyl9KTtgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCJAXCIpIHtcbiAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBub2RlVG9Nb2R1bGVOYW1lKG4ubGVmdCk7XG4gICAgICBjb25zdCBuYW1lcyA9IHBhcnNlSW1wb3J0RnJvbU5hbWVzKG4ucmlnaHQpO1xuICAgICAgc3RlcHMucHVzaChgX19tcl9pbXBvcnRfZnJvbSgke0pTT04uc3RyaW5naWZ5KG1vZHVsZU5hbWUpfSwgJHtKU09OLnN0cmluZ2lmeShuYW1lcyl9KTtgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBmYWlsKFwiVW5zdXBwb3J0ZWQgaW1wb3J0IGZvcm1cIiwgbik7XG4gIH1cbiAgc3RlcHMucHVzaChcInJldHVybiBudWxsO1wiKTtcbiAgcmV0dXJuIGAoKCkgPT4geyR7c3RlcHMuam9pbihcIlxcblwiKX19KSgpYDtcbn1cblxuZnVuY3Rpb24gYXBwbHlJbXBvcnRtKG5vZGVzOiBOb2RlW10sIGN0eDogQ3R4KTogdm9pZCB7XG4gIGNvbnN0IHJlc29sdmVyID0gY3R4Lm1ldGFNb2R1bGVSZXNvbHZlciA/PyAoKG5hbWU6IHN0cmluZykgPT4gY3R4Lm1vZHVsZVJlc29sdmVyPy4obmFtZSkgYXMgeyBfX21yX21ldGFfXz86IFNlcmlhbGl6ZWRNYWtyZWxsTWFjcm9bXSB9IHwgbnVsbCk7XG4gIGlmICghcmVzb2x2ZXIpIGZhaWwoXCJpbXBvcnRtIHJlcXVpcmVzIGEgbWV0YSBtb2R1bGUgcmVzb2x2ZXJcIik7XG5cbiAgY29uc3QgYXBwbHlNb2R1bGUgPSAobW9kdWxlTmFtZTogc3RyaW5nLCBuYW1lcz86IHN0cmluZ1tdKTogdm9pZCA9PiB7XG4gICAgY29uc3QgbW9kID0gcmVzb2x2ZXIobW9kdWxlTmFtZSk7XG4gICAgaWYgKCFtb2QgfHwgIUFycmF5LmlzQXJyYXkobW9kLl9fbXJfbWV0YV9fKSkge1xuICAgICAgZmFpbChgTW9kdWxlICcke21vZHVsZU5hbWV9JyBoYXMgbm8gX19tcl9tZXRhX18gZGVmaW5pdGlvbnNgKTtcbiAgICB9XG4gICAgY29uc3Qgd2FudGVkID0gbmFtZXMgPyBuZXcgU2V0KG5hbWVzKSA6IG51bGw7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBtb2QuX19tcl9tZXRhX18pIHtcbiAgICAgIGlmICh3YW50ZWQgJiYgIXdhbnRlZC5oYXMoZW50cnkubmFtZSkpIGNvbnRpbnVlO1xuICAgICAgZGVmaW5lTWFrcmVsbE1hY3JvKGVudHJ5Lm5hbWUsIGVudHJ5LnBhcmFtcywgZW50cnkuYm9keSwgY3R4Lm1hY3Jvcyk7XG4gICAgfVxuICB9O1xuXG4gIGZvciAoY29uc3QgbiBvZiBub2Rlcykge1xuICAgIGlmIChuLmtpbmQgPT09IFwiaWRlbnRpZmllclwiIHx8IChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcIi5cIikpIHtcbiAgICAgIGFwcGx5TW9kdWxlKG5vZGVUb01vZHVsZU5hbWUobikpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcIkBcIikge1xuICAgICAgYXBwbHlNb2R1bGUobm9kZVRvTW9kdWxlTmFtZShuLmxlZnQpLCBwYXJzZUltcG9ydEZyb21OYW1lcyhuLnJpZ2h0KSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgZmFpbChcIlVuc3VwcG9ydGVkIGltcG9ydG0gZm9ybVwiLCBuKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb21waWxlQ3VybHkobjogQ3VybHlCcmFja2V0c05vZGUsIGN0eDogQ3R4KTogc3RyaW5nIHtcbiAgaWYgKHJlZ2lzdGVyTWFjcm9EZWYobiwgY3R4KSkgcmV0dXJuIFwibnVsbFwiO1xuXG4gIGNvbnN0IGV4cGFuZGVkID0gZXhwYW5kTWFjcm8obiwgY3R4KTtcbiAgaWYgKGV4cGFuZGVkKSB7XG4gICAgaWYgKGV4cGFuZGVkLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwibnVsbFwiO1xuICAgIGlmIChleHBhbmRlZC5sZW5ndGggPT09IDEpIHJldHVybiBjb21waWxlRXhwcihleHBhbmRlZFswXSwgY3R4KTtcbiAgICByZXR1cm4gY29tcGlsZURvRXhwcihleHBhbmRlZCwgY3R4KTtcbiAgfVxuXG4gIGlmIChuLm5vZGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwibnVsbFwiO1xuICBjb25zdCBoZWFkID0gbi5ub2Rlc1swXTtcblxuICBpZiAoaXNJZGVudChoZWFkLCBcImlmXCIpKSByZXR1cm4gY29tcGlsZUlmRXhwcihuLm5vZGVzLnNsaWNlKDEpLCBjdHgpO1xuICBpZiAoaXNJZGVudChoZWFkLCBcImRvXCIpKSByZXR1cm4gY29tcGlsZURvRXhwcihuLm5vZGVzLnNsaWNlKDEpLCBjdHgpO1xuICBpZiAoaXNJZGVudChoZWFkLCBcIndoZW5cIikpIHJldHVybiBjb21waWxlV2hlbkV4cHIobi5ub2Rlcy5zbGljZSgxKSwgY3R4KTtcbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJ3aGlsZVwiKSkgcmV0dXJuIGNvbXBpbGVXaGlsZUV4cHIobi5ub2Rlcy5zbGljZSgxKSwgY3R4KTtcbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJmb3JcIikpIHJldHVybiBjb21waWxlRm9yRXhwcihuLm5vZGVzLnNsaWNlKDEpLCBjdHgpO1xuICBpZiAoaXNJZGVudChoZWFkLCBcImltcG9ydFwiKSkgcmV0dXJuIGNvbXBpbGVJbXBvcnRFeHByKG4ubm9kZXMuc2xpY2UoMSkpO1xuICBpZiAoaXNJZGVudChoZWFkLCBcImltcG9ydG1cIikpIHtcbiAgICBhcHBseUltcG9ydG0obi5ub2Rlcy5zbGljZSgxKSwgY3R4KTtcbiAgICByZXR1cm4gXCJudWxsXCI7XG4gIH1cbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJtYXRjaFwiKSkgcmV0dXJuIGNvbXBpbGVNYXRjaEV4cHIobi5ub2Rlcy5zbGljZSgxKSwgY3R4KTtcbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJmdW5cIikpIHJldHVybiBjb21waWxlRnVuRXhwcihuLm5vZGVzLCBjdHgpO1xuICBpZiAoaXNJZGVudChoZWFkLCBcImNsYXNzXCIpKSByZXR1cm4gY29tcGlsZUNsYXNzRXhwcihuLm5vZGVzLCBjdHgpO1xuICBpZiAoaXNJZGVudChoZWFkLCBcIm5ld1wiKSkge1xuICAgIGlmIChuLm5vZGVzLmxlbmd0aCA8IDIpIGZhaWwoXCJuZXcgcmVxdWlyZXMgY29uc3RydWN0b3IgZXhwcmVzc2lvblwiLCBuKTtcbiAgICBjb25zdCBjdG9yRXhwciA9IGNvbXBpbGVFeHByKG4ubm9kZXNbMV0sIGN0eCk7XG4gICAgY29uc3QgcmF3QXJncyA9IG4ubm9kZXMuc2xpY2UoMik7XG4gICAgaWYgKHJhd0FyZ3MubGVuZ3RoID09PSAxICYmIHJhd0FyZ3NbMF0ua2luZCA9PT0gXCJzcXVhcmVcIikge1xuICAgICAgY29uc3QgYXJncyA9IHJhd0FyZ3NbMF0ubm9kZXMubWFwKChhcmcpID0+IGNvbXBpbGVFeHByKGFyZywgY3R4KSkuam9pbihcIiwgXCIpO1xuICAgICAgcmV0dXJuIGBuZXcgJHtjdG9yRXhwcn0oJHthcmdzfSlgO1xuICAgIH1cbiAgICBjb25zdCBhcmdzID0gcmF3QXJncy5tYXAoKGFyZykgPT4gY29tcGlsZUV4cHIoYXJnLCBjdHgpKS5qb2luKFwiLCBcIik7XG4gICAgcmV0dXJuIGBuZXcgJHtjdG9yRXhwcn0oJHthcmdzfSlgO1xuICB9XG5cbiAgY29uc3QgY2FsbGVlID0gY29tcGlsZUV4cHIoaGVhZCwgY3R4KTtcbiAgY29uc3QgYXJncyA9IG4ubm9kZXMuc2xpY2UoMSkubWFwKChhcmcpID0+IGNvbXBpbGVFeHByKGFyZywgY3R4KSkuam9pbihcIiwgXCIpO1xuICByZXR1cm4gYCR7Y2FsbGVlfSgke2FyZ3N9KWA7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVQaXBlKGxlZnQ6IE5vZGUsIHJpZ2h0OiBOb2RlLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGNvbnN0IGxlZnRFeHByID0gY29tcGlsZUV4cHIobGVmdCwgY3R4KTtcbiAgaWYgKHJpZ2h0LmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSByZXR1cm4gYCR7cmlnaHQudmFsdWV9KCR7bGVmdEV4cHJ9KWA7XG4gIGlmIChyaWdodC5raW5kID09PSBcImN1cmx5XCIgJiYgcmlnaHQubm9kZXMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGhlYWQgPSBjb21waWxlRXhwcihyaWdodC5ub2Rlc1swXSwgY3R4KTtcbiAgICBjb25zdCByZXN0ID0gcmlnaHQubm9kZXMuc2xpY2UoMSkubWFwKChhKSA9PiBjb21waWxlRXhwcihhLCBjdHgpKTtcbiAgICByZXR1cm4gYCR7aGVhZH0oJHtbbGVmdEV4cHIsIC4uLnJlc3RdLmpvaW4oXCIsIFwiKX0pYDtcbiAgfVxuICByZXR1cm4gYCR7Y29tcGlsZUV4cHIocmlnaHQsIGN0eCl9KCR7bGVmdEV4cHJ9KWA7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVFeHByKG46IE5vZGUsIGN0eDogQ3R4KTogc3RyaW5nIHtcbiAgc3dpdGNoIChuLmtpbmQpIHtcbiAgICBjYXNlIFwiaWRlbnRpZmllclwiOlxuICAgICAgaWYgKGN0eC50aGlzQWxpYXMgJiYgbi52YWx1ZSA9PT0gY3R4LnRoaXNBbGlhcykgcmV0dXJuIFwidGhpc1wiO1xuICAgICAgcmV0dXJuIGVtaXRMaXRlcmFsSWRlbnRpZmllcihuLnZhbHVlKTtcbiAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkobi52YWx1ZSk7XG4gICAgY2FzZSBcIm51bWJlclwiOlxuICAgICAgcmV0dXJuIG4udmFsdWU7XG4gICAgY2FzZSBcInJvdW5kXCI6XG4gICAgICBpZiAobi5ub2Rlcy5sZW5ndGggPT09IDApIHJldHVybiBcIm51bGxcIjtcbiAgICAgIGlmIChuLm5vZGVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGAoJHtjb21waWxlRXhwcihuLm5vZGVzWzBdLCBjdHgpfSlgO1xuICAgICAgcmV0dXJuIGBbJHtuLm5vZGVzLm1hcCgoeCkgPT4gY29tcGlsZUV4cHIoeCwgY3R4KSkuam9pbihcIiwgXCIpfV1gO1xuICAgIGNhc2UgXCJzcXVhcmVcIjpcbiAgICAgIHJldHVybiBgWyR7bi5ub2Rlcy5tYXAoKHgpID0+IGNvbXBpbGVFeHByKHgsIGN0eCkpLmpvaW4oXCIsIFwiKX1dYDtcbiAgICBjYXNlIFwiY3VybHlcIjpcbiAgICAgIHJldHVybiBjb21waWxlQ3VybHkobiwgY3R4KTtcbiAgICBjYXNlIFwiYmlub3BcIjoge1xuICAgICAgaWYgKG4ub3AgPT09IFwiPVwiKSB7XG4gICAgICAgIGNvbnN0IGxocyA9IGNvbXBpbGVBc3NpZ25MZWZ0KG4ubGVmdCwgY3R4KTtcbiAgICAgICAgY29uc3QgcmhzID0gY29tcGlsZUV4cHIobi5yaWdodCwgY3R4KTtcbiAgICAgICAgcmV0dXJuIGAoJHtsaHN9ID0gJHtyaHN9KWA7XG4gICAgICB9XG4gICAgICBpZiAobi5vcCA9PT0gXCJ8XCIpIHJldHVybiBjb21waWxlUGlwZShuLmxlZnQsIG4ucmlnaHQsIGN0eCk7XG4gICAgICBpZiAobi5vcCA9PT0gXCItPlwiKSB7XG4gICAgICAgIGxldCBhcmdzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBpZiAobi5sZWZ0LmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSBhcmdzID0gW24ubGVmdC52YWx1ZV07XG4gICAgICAgIGVsc2UgaWYgKG4ubGVmdC5raW5kID09PSBcInNxdWFyZVwiKSB7XG4gICAgICAgICAgYXJncyA9IG4ubGVmdC5ub2Rlcy5tYXAoKHgpID0+IHtcbiAgICAgICAgICAgIGlmICh4LmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSB0aHJvdyBuZXcgRXJyb3IoXCJMYW1iZGEgYXJncyBtdXN0IGJlIGlkZW50aWZpZXJzXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZmFpbChcIkludmFsaWQgbGFtYmRhIGFyZ3NcIiwgbi5sZWZ0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYCgoJHthcmdzLmpvaW4oXCIsIFwiKX0pID0+ICgke2NvbXBpbGVFeHByKG4ucmlnaHQsIGN0eCl9KSlgO1xuICAgICAgfVxuICAgICAgaWYgKG4ub3AgPT09IFwiLlwiKSByZXR1cm4gYCR7Y29tcGlsZUV4cHIobi5sZWZ0LCBjdHgpfS4ke2NvbXBpbGVFeHByKG4ucmlnaHQsIGN0eCl9YDtcbiAgICAgIGlmIChuLm9wID09PSBcIjpcIikgcmV0dXJuIGNvbXBpbGVFeHByKG4ubGVmdCwgY3R4KTtcbiAgICAgIHJldHVybiBgKCR7Y29tcGlsZUV4cHIobi5sZWZ0LCBjdHgpfSAke24ub3B9ICR7Y29tcGlsZUV4cHIobi5yaWdodCwgY3R4KX0pYDtcbiAgICB9XG4gICAgY2FzZSBcIm9wZXJhdG9yXCI6XG4gICAgICBmYWlsKGBVbmV4cGVjdGVkIHN0YW5kYWxvbmUgb3BlcmF0b3IgJyR7bi52YWx1ZX0nYCwgbik7XG4gICAgY2FzZSBcInNlcXVlbmNlXCI6XG4gICAgICByZXR1cm4gY29tcGlsZURvRXhwcihuLm5vZGVzLCBjdHgpO1xuICAgIGRlZmF1bHQ6XG4gICAgICBmYWlsKGBVbmtub3duIG5vZGUga2luZDogJHsobiBhcyBOb2RlKS5raW5kfWAsIG4pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRnVuRGVjbChuOiBOb2RlKTogbiBpcyBDdXJseUJyYWNrZXRzTm9kZSB7XG4gIHJldHVybiBuLmtpbmQgPT09IFwiY3VybHlcIiAmJiBuLm5vZGVzLmxlbmd0aCA+PSAzICYmIGlzSWRlbnQobi5ub2Rlc1swXSwgXCJmdW5cIikgJiYgbi5ub2Rlc1sxXS5raW5kID09PSBcImlkZW50aWZpZXJcIjtcbn1cblxuZnVuY3Rpb24gaXNNYWNyb0RlY2wobjogTm9kZSk6IG4gaXMgQ3VybHlCcmFja2V0c05vZGUge1xuICByZXR1cm4gbi5raW5kID09PSBcImN1cmx5XCIgJiYgbi5ub2Rlcy5sZW5ndGggPj0gNSAmJiBpc0lkZW50KG4ubm9kZXNbMF0sIFwiZGVmXCIpICYmIGlzSWRlbnQobi5ub2Rlc1sxXSwgXCJtYWNyb1wiKTtcbn1cblxuZnVuY3Rpb24gaXNDbGFzc0RlY2wobjogTm9kZSk6IG4gaXMgQ3VybHlCcmFja2V0c05vZGUge1xuICByZXR1cm4gbi5raW5kID09PSBcImN1cmx5XCIgJiYgbi5ub2Rlcy5sZW5ndGggPj0gMiAmJiBpc0lkZW50KG4ubm9kZXNbMF0sIFwiY2xhc3NcIikgJiYgbi5ub2Rlc1sxXS5raW5kID09PSBcImlkZW50aWZpZXJcIjtcbn1cblxuZnVuY3Rpb24gY29tcGlsZVN0bXQobjogTm9kZSwgY3R4OiBDdHgsIGlzTGFzdDogYm9vbGVhbik6IHN0cmluZyB7XG4gIGlmIChpc01hY3JvRGVjbChuKSkge1xuICAgIHJlZ2lzdGVyTWFjcm9EZWYobiwgY3R4KTtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuXG4gIGlmIChuLmtpbmQgPT09IFwiY3VybHlcIikge1xuICAgIGNvbnN0IGV4cGFuZGVkID0gZXhwYW5kTWFjcm8obiwgY3R4KTtcbiAgICBpZiAoZXhwYW5kZWQpIHtcbiAgICAgIGlmIChleHBhbmRlZC5sZW5ndGggPT09IDApIHJldHVybiBpc0xhc3QgPyBcInJldHVybiBudWxsO1wiIDogXCJcIjtcbiAgICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHBhbmRlZC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBjb25zdCBwYXJ0ID0gY29tcGlsZVN0bXQoZXhwYW5kZWRbaV0sIGN0eCwgaXNMYXN0ICYmIGkgPT09IGV4cGFuZGVkLmxlbmd0aCAtIDEpO1xuICAgICAgICBpZiAocGFydCkgcGFydHMucHVzaChwYXJ0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYXJ0cy5qb2luKFwiXFxuXCIpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChpc0Z1bkRlY2wobikpIHtcbiAgICBjb25zdCBmbk5hbWUgPSAobi5ub2Rlc1sxXSBhcyB7IHZhbHVlOiBzdHJpbmcgfSkudmFsdWU7XG4gICAgY29uc3QgZm5FeHByID0gY29tcGlsZUZ1bkV4cHIobi5ub2RlcywgY3R4KTtcbiAgICByZXR1cm4gYGNvbnN0ICR7Zm5OYW1lfSA9ICR7Zm5FeHByfTtgO1xuICB9XG5cbiAgaWYgKGlzQ2xhc3NEZWNsKG4pKSB7XG4gICAgY29uc3QgY2xhc3NFeHByID0gY29tcGlsZUNsYXNzRXhwcihuLm5vZGVzLCBjdHgpO1xuICAgIGlmIChpc0xhc3QpIHJldHVybiBgJHtjbGFzc0V4cHJ9O1xcbnJldHVybiAkeyhuLm5vZGVzWzFdIGFzIHsgdmFsdWU6IHN0cmluZyB9KS52YWx1ZX07YDtcbiAgICByZXR1cm4gYCR7Y2xhc3NFeHByfTtgO1xuICB9XG5cbiAgaWYgKG4ua2luZCA9PT0gXCJiaW5vcFwiICYmIG4ub3AgPT09IFwiPVwiICYmIG4ubGVmdC5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgIGNvbnN0IHJocyA9IGNvbXBpbGVFeHByKG4ucmlnaHQsIGN0eCk7XG4gICAgY29uc3QgYXNzaWduID0gYHZhciAke24ubGVmdC52YWx1ZX0gPSAke3Joc307YDtcbiAgICBpZiAoaXNMYXN0KSByZXR1cm4gYCR7YXNzaWdufVxcbnJldHVybiAke24ubGVmdC52YWx1ZX07YDtcbiAgICByZXR1cm4gYXNzaWduO1xuICB9XG4gIGlmIChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcIj1cIiAmJiBuLmxlZnQua2luZCA9PT0gXCJiaW5vcFwiICYmIG4ubGVmdC5vcCA9PT0gXCI6XCIgJiYgbi5sZWZ0LmxlZnQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICBjb25zdCByaHMgPSBjb21waWxlRXhwcihuLnJpZ2h0LCBjdHgpO1xuICAgIGNvbnN0IHQgPSBlbWl0VHlwZU5vZGUobi5sZWZ0LnJpZ2h0KTtcbiAgICBjb25zdCBkZWNsID0gY3R4LmVtaXRUYXJnZXQgPT09IFwidHNcIlxuICAgICAgPyBgdmFyICR7bi5sZWZ0LmxlZnQudmFsdWV9OiAke3R9ID0gJHtyaHN9O2BcbiAgICAgIDogYHZhciAke24ubGVmdC5sZWZ0LnZhbHVlfSA9ICR7cmhzfTtgO1xuICAgIGlmIChpc0xhc3QpIHJldHVybiBgJHtkZWNsfVxcbnJldHVybiAke24ubGVmdC5sZWZ0LnZhbHVlfTtgO1xuICAgIHJldHVybiBkZWNsO1xuICB9XG5cbiAgaWYgKG4ua2luZCA9PT0gXCJjdXJseVwiICYmIG4ubm9kZXMubGVuZ3RoID4gMCAmJiBpc0lkZW50KG4ubm9kZXNbMF0sIFwicmV0dXJuXCIpKSB7XG4gICAgY29uc3QgdmFsID0gbi5ub2Rlc1sxXSA/IGNvbXBpbGVFeHByKG4ubm9kZXNbMV0sIGN0eCkgOiBcIm51bGxcIjtcbiAgICByZXR1cm4gYHJldHVybiAke3ZhbH07YDtcbiAgfVxuXG4gIGNvbnN0IGV4cHIgPSBjb21waWxlRXhwcihuLCBjdHgpO1xuICBpZiAoaXNMYXN0KSByZXR1cm4gYHJldHVybiAke2V4cHJ9O2A7XG4gIHJldHVybiBgJHtleHByfTtgO1xufVxuXG5mdW5jdGlvbiBjb21waWxlQmxvY2sobm9kZXM6IE5vZGVbXSwgY3R4OiBDdHgsIGF1dG9SZXR1cm46IGJvb2xlYW4pOiBzdHJpbmcge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgZmlsdGVyZWQgPSBub2Rlcy5maWx0ZXIoQm9vbGVhbik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsdGVyZWQubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCBsaW5lID0gY29tcGlsZVN0bXQoZmlsdGVyZWRbaV0sIGN0eCwgYXV0b1JldHVybiAmJiBpID09PSBmaWx0ZXJlZC5sZW5ndGggLSAxKTtcbiAgICBpZiAobGluZSkgbGluZXMucHVzaChsaW5lKTtcbiAgfVxuICBpZiAobGluZXMubGVuZ3RoID09PSAwICYmIGF1dG9SZXR1cm4pIGxpbmVzLnB1c2goXCJyZXR1cm4gbnVsbDtcIik7XG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZVRvSnMoc3JjOiBzdHJpbmcsIG9wdGlvbnM6IENvbXBpbGVPcHRpb25zID0ge30pOiBzdHJpbmcge1xuICBjb25zdCBjdHg6IEN0eCA9IHtcbiAgICBtYWNyb3M6IG9wdGlvbnMubWFjcm9zID8/IG5ldyBNYWNyb1JlZ2lzdHJ5KCksXG4gICAgbWFjcm9DdHg6IGRlZmF1bHRNYWNyb0NvbnRleHQoKSxcbiAgICBtZXRhUnVudGltZTogb3B0aW9ucy5tZXRhUnVudGltZSA/PyBuZXcgSW5saW5lTWV0YVJ1bnRpbWVBZGFwdGVyKCksXG4gICAgbW9kdWxlUmVzb2x2ZXI6IG9wdGlvbnMubW9kdWxlUmVzb2x2ZXIsXG4gICAgbWV0YU1vZHVsZVJlc29sdmVyOiBvcHRpb25zLm1ldGFNb2R1bGVSZXNvbHZlcixcbiAgICBmbkRlcHRoOiAwLFxuICAgIHRlbXBJZDogMCxcbiAgICBlbWl0VGFyZ2V0OiBcImpzXCIsXG4gIH07XG5cbiAgY29uc3Qgbm9kZXMgPSBwYXJzZShzcmMpO1xuICBjb25zdCBib2R5ID0gY29tcGlsZUJsb2NrKG5vZGVzLCBjdHgsIHRydWUpO1xuICByZXR1cm4gYCgoKSA9PiB7XFxuJHtib2R5fVxcbn0pKClgO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZVRvVHMoc3JjOiBzdHJpbmcsIG9wdGlvbnM6IENvbXBpbGVPcHRpb25zID0ge30pOiBzdHJpbmcge1xuICBjb25zdCBjdHg6IEN0eCA9IHtcbiAgICBtYWNyb3M6IG9wdGlvbnMubWFjcm9zID8/IG5ldyBNYWNyb1JlZ2lzdHJ5KCksXG4gICAgbWFjcm9DdHg6IGRlZmF1bHRNYWNyb0NvbnRleHQoKSxcbiAgICBtZXRhUnVudGltZTogb3B0aW9ucy5tZXRhUnVudGltZSA/PyBuZXcgSW5saW5lTWV0YVJ1bnRpbWVBZGFwdGVyKCksXG4gICAgbW9kdWxlUmVzb2x2ZXI6IG9wdGlvbnMubW9kdWxlUmVzb2x2ZXIsXG4gICAgbWV0YU1vZHVsZVJlc29sdmVyOiBvcHRpb25zLm1ldGFNb2R1bGVSZXNvbHZlcixcbiAgICBmbkRlcHRoOiAwLFxuICAgIHRlbXBJZDogMCxcbiAgICBlbWl0VGFyZ2V0OiBcInRzXCIsXG4gIH07XG4gIGNvbnN0IG5vZGVzID0gcGFyc2Uoc3JjKTtcbiAgY29uc3QgYm9keSA9IGNvbXBpbGVCbG9jayhub2RlcywgY3R4LCB0cnVlKTtcbiAgcmV0dXJuIGAoKCkgPT4ge1xcbiR7Ym9keX1cXG59KSgpYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVUb0R0cyhzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IG5vZGVzID0gcGFyc2Uoc3JjKTtcbiAgY29uc3Qgb3V0OiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGVtaXRBcmdEZWNsID0gKG46IE5vZGUpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChuLmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSByZXR1cm4gYCR7bi52YWx1ZX06IHVua25vd25gO1xuICAgIGlmIChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcIjpcIiAmJiBuLmxlZnQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHJldHVybiBgJHtuLmxlZnQudmFsdWV9OiAke2VtaXRUeXBlTm9kZShuLnJpZ2h0KX1gO1xuICAgIHJldHVybiBcImFyZzogdW5rbm93blwiO1xuICB9O1xuXG4gIGZvciAoY29uc3QgbiBvZiBub2Rlcykge1xuICAgIGlmIChuLmtpbmQgPT09IFwiY3VybHlcIiAmJiBuLm5vZGVzLmxlbmd0aCA+PSAzICYmIGlzSWRlbnQobi5ub2Rlc1swXSwgXCJmdW5cIikgJiYgbi5ub2Rlc1sxXS5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgICAgY29uc3QgbmFtZSA9IG4ubm9kZXNbMV0udmFsdWU7XG4gICAgICBjb25zdCBhcmdzTm9kZSA9IG4ubm9kZXNbMl07XG4gICAgICBjb25zdCBhcmdzID0gYXJnc05vZGUua2luZCA9PT0gXCJzcXVhcmVcIiA/IGFyZ3NOb2RlLm5vZGVzLm1hcChlbWl0QXJnRGVjbCkuam9pbihcIiwgXCIpIDogXCJcIjtcbiAgICAgIG91dC5wdXNoKGBleHBvcnQgZnVuY3Rpb24gJHtuYW1lfSgke2FyZ3N9KTogdW5rbm93bjtgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAobi5raW5kID09PSBcImN1cmx5XCIgJiYgbi5ub2Rlcy5sZW5ndGggPj0gMiAmJiBpc0lkZW50KG4ubm9kZXNbMF0sIFwiY2xhc3NcIikgJiYgbi5ub2Rlc1sxXS5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgICAgb3V0LnB1c2goYGV4cG9ydCBjbGFzcyAke24ubm9kZXNbMV0udmFsdWV9IHt9YCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKG4ua2luZCA9PT0gXCJiaW5vcFwiICYmIG4ub3AgPT09IFwiPVwiICYmIG4ubGVmdC5raW5kID09PSBcImJpbm9wXCIgJiYgbi5sZWZ0Lm9wID09PSBcIjpcIiAmJiBuLmxlZnQubGVmdC5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgICAgb3V0LnB1c2goYGV4cG9ydCBsZXQgJHtuLmxlZnQubGVmdC52YWx1ZX06ICR7ZW1pdFR5cGVOb2RlKG4ubGVmdC5yaWdodCl9O2ApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcIj1cIiAmJiBuLmxlZnQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICAgIG91dC5wdXNoKGBleHBvcnQgbGV0ICR7bi5sZWZ0LnZhbHVlfTogdW5rbm93bjtgKTtcbiAgICB9XG4gIH1cblxuICBpZiAob3V0Lmxlbmd0aCA9PT0gMCkgb3V0LnB1c2goXCJleHBvcnQge307XCIpO1xuICByZXR1cm4gb3V0LmpvaW4oXCJcXG5cIik7XG59XG4iLAogICJpbXBvcnQgeyBDdXJseUJyYWNrZXRzTm9kZSwgTm9kZSwgU291cmNlU3BhbiwgU3F1YXJlQnJhY2tldHNOb2RlLCBpc0lkZW50IH0gZnJvbSBcIi4vYXN0XCI7XG5pbXBvcnQge1xuICBNYWtyZWxsTWFjcm9FbnRyeSxcbiAgTWFjcm9SZWdpc3RyeSxcbiAgU2VyaWFsaXplZE1ha3JlbGxNYWNybyxcbiAgZGVmYXVsdE1hY3JvQ29udGV4dCxcbiAgZGVmaW5lTWFrcmVsbE1hY3JvLFxuICBydW5NYWtyZWxsTWFjcm9EZWYsXG59IGZyb20gXCIuL21hY3Jvc1wiO1xuaW1wb3J0IHR5cGUgeyBNZXRhUnVudGltZUFkYXB0ZXIgfSBmcm9tIFwiLi9tZXRhX3J1bnRpbWVcIjtcbmltcG9ydCB7IHBhcnNlIH0gZnJvbSBcIi4vcGFyc2VyXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZU9wdGlvbnMge1xuICBtYWNyb3M/OiBNYWNyb1JlZ2lzdHJ5O1xuICBtZXRhUnVudGltZT86IE1ldGFSdW50aW1lQWRhcHRlcjtcbiAgbW9kdWxlUmVzb2x2ZXI/OiAobW9kdWxlTmFtZTogc3RyaW5nKSA9PiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgbWV0YU1vZHVsZVJlc29sdmVyPzogKG1vZHVsZU5hbWU6IHN0cmluZykgPT4geyBfX21yX21ldGFfXz86IFNlcmlhbGl6ZWRNYWtyZWxsTWFjcm9bXSB9IHwgbnVsbDtcbn1cblxudHlwZSBFbWl0VGFyZ2V0ID0gXCJqc1wiIHwgXCJ0c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVEaWFnbm9zdGljIHtcbiAgbWVzc2FnZTogc3RyaW5nO1xuICBsb2M/OiBTb3VyY2VTcGFuO1xufVxuXG5leHBvcnQgY2xhc3MgQ29tcGlsZUZhaWx1cmUgZXh0ZW5kcyBFcnJvciB7XG4gIGRpYWdub3N0aWM6IENvbXBpbGVEaWFnbm9zdGljO1xuXG4gIGNvbnN0cnVjdG9yKGRpYWdub3N0aWM6IENvbXBpbGVEaWFnbm9zdGljKSB7XG4gICAgY29uc3Qgd2hlcmUgPSBkaWFnbm9zdGljLmxvY1xuICAgICAgPyBgIFtsaW5lICR7ZGlhZ25vc3RpYy5sb2Muc3RhcnQubGluZX0sIGNvbCAke2RpYWdub3N0aWMubG9jLnN0YXJ0LmNvbHVtbn1dYFxuICAgICAgOiBcIlwiO1xuICAgIHN1cGVyKGAke2RpYWdub3N0aWMubWVzc2FnZX0ke3doZXJlfWApO1xuICAgIHRoaXMuZGlhZ25vc3RpYyA9IGRpYWdub3N0aWM7XG4gIH1cbn1cblxuaW50ZXJmYWNlIEN0eCB7XG4gIG1hY3JvczogTWFjcm9SZWdpc3RyeTtcbiAgbWFjcm9DdHg6IFJldHVyblR5cGU8dHlwZW9mIGRlZmF1bHRNYWNyb0NvbnRleHQ+O1xuICBtZXRhUnVudGltZTogTWV0YVJ1bnRpbWVBZGFwdGVyO1xuICBtb2R1bGVSZXNvbHZlcj86IChtb2R1bGVOYW1lOiBzdHJpbmcpID0+IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBtZXRhTW9kdWxlUmVzb2x2ZXI/OiAobW9kdWxlTmFtZTogc3RyaW5nKSA9PiB7IF9fbXJfbWV0YV9fPzogU2VyaWFsaXplZE1ha3JlbGxNYWNyb1tdIH0gfCBudWxsO1xuICBmbkRlcHRoOiBudW1iZXI7XG4gIHRlbXBJZDogbnVtYmVyO1xuICB0aGlzQWxpYXM/OiBzdHJpbmc7XG4gIGVtaXRUYXJnZXQ6IEVtaXRUYXJnZXQ7XG59XG5cbmNsYXNzIElubGluZU1ldGFSdW50aW1lQWRhcHRlciBpbXBsZW1lbnRzIE1ldGFSdW50aW1lQWRhcHRlciB7XG4gIGtpbmQgPSBcImlubGluZVwiO1xuXG4gIHJ1bk1ha3JlbGxNYWNybyhfbmFtZTogc3RyaW5nLCBtYWNybzogTWFrcmVsbE1hY3JvRW50cnksIGFyZ3M6IE5vZGVbXSwgcmVnaXN0cnk6IE1hY3JvUmVnaXN0cnkpOiBOb2RlIHwgTm9kZVtdIHtcbiAgICByZXR1cm4gcnVuTWFrcmVsbE1hY3JvRGVmKG1hY3JvLnBhcmFtcywgbWFjcm8uYm9keSwgYXJncywgcmVnaXN0cnksIGRlZmF1bHRNYWNyb0NvbnRleHQoKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbmV4dFRtcChjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGN0eC50ZW1wSWQgKz0gMTtcbiAgcmV0dXJuIGBfX21yX3RtcF8ke2N0eC50ZW1wSWR9YDtcbn1cblxuZnVuY3Rpb24gZmFpbChtZXNzYWdlOiBzdHJpbmcsIG5vZGU/OiBOb2RlKTogbmV2ZXIge1xuICB0aHJvdyBuZXcgQ29tcGlsZUZhaWx1cmUoeyBtZXNzYWdlLCBsb2M6IG5vZGU/LmxvYyB9KTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kTWFjcm8objogQ3VybHlCcmFja2V0c05vZGUsIGN0eDogQ3R4KTogTm9kZVtdIHwgbnVsbCB7XG4gIGlmIChuLm5vZGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGhlYWQgPSBuLm5vZGVzWzBdO1xuICBpZiAoaGVhZC5raW5kICE9PSBcImlkZW50aWZpZXJcIikgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGVudHJ5ID0gY3R4Lm1hY3Jvcy5nZXRFbnRyeShoZWFkLnZhbHVlKTtcbiAgaWYgKCFlbnRyeSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IG91dCA9IGVudHJ5LmtpbmQgPT09IFwibmF0aXZlXCJcbiAgICA/IGVudHJ5LmZuKG4ubm9kZXMuc2xpY2UoMSksIGN0eC5tYWNyb0N0eClcbiAgICA6IGN0eC5tZXRhUnVudGltZS5ydW5NYWtyZWxsTWFjcm8oaGVhZC52YWx1ZSwgZW50cnksIG4ubm9kZXMuc2xpY2UoMSksIGN0eC5tYWNyb3MpO1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShvdXQpID8gb3V0IDogW291dF07XG59XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyTWFjcm9EZWYobjogQ3VybHlCcmFja2V0c05vZGUsIGN0eDogQ3R4KTogYm9vbGVhbiB7XG4gIGlmIChuLm5vZGVzLmxlbmd0aCA8IDUpIHJldHVybiBmYWxzZTtcbiAgaWYgKCFpc0lkZW50KG4ubm9kZXNbMF0sIFwiZGVmXCIpIHx8ICFpc0lkZW50KG4ubm9kZXNbMV0sIFwibWFjcm9cIikpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgbmFtZU5vZGUgPSBuLm5vZGVzWzJdO1xuICBjb25zdCBwYXJhbXNOb2RlID0gbi5ub2Rlc1szXTtcbiAgaWYgKG5hbWVOb2RlLmtpbmQgIT09IFwiaWRlbnRpZmllclwiIHx8IHBhcmFtc05vZGUua2luZCAhPT0gXCJzcXVhcmVcIikge1xuICAgIGZhaWwoXCJNYWNybyBkZWZpbml0aW9uIG11c3QgYmUge2RlZiBtYWNybyBuYW1lIFtwYXJhbXNdIC4uLn1cIiwgbik7XG4gIH1cbiAgY29uc3QgcGFyYW1zID0gcGFyYW1zTm9kZS5ub2Rlcy5tYXAoKHApID0+IHtcbiAgICBpZiAocC5raW5kICE9PSBcImlkZW50aWZpZXJcIikgZmFpbChcIk1hY3JvIHBhcmFtcyBtdXN0IGJlIGlkZW50aWZpZXJzXCIsIHApO1xuICAgIHJldHVybiBwLnZhbHVlO1xuICB9KTtcbiAgY29uc3QgYm9keSA9IG4ubm9kZXMuc2xpY2UoNCk7XG4gIGRlZmluZU1ha3JlbGxNYWNybyhuYW1lTm9kZS52YWx1ZSwgcGFyYW1zLCBib2R5LCBjdHgubWFjcm9zKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGVtaXRMaXRlcmFsSWRlbnRpZmllcihuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAobmFtZSA9PT0gXCJ0cnVlXCIgfHwgbmFtZSA9PT0gXCJmYWxzZVwiIHx8IG5hbWUgPT09IFwibnVsbFwiKSByZXR1cm4gbmFtZTtcbiAgcmV0dXJuIG5hbWU7XG59XG5cbmZ1bmN0aW9uIGVtaXRUeXBlTm9kZShuOiBOb2RlKTogc3RyaW5nIHtcbiAgaWYgKG4ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICBpZiAobi52YWx1ZSA9PT0gXCJzdHJcIikgcmV0dXJuIFwic3RyaW5nXCI7XG4gICAgaWYgKG4udmFsdWUgPT09IFwiaW50XCIgfHwgbi52YWx1ZSA9PT0gXCJmbG9hdFwiKSByZXR1cm4gXCJudW1iZXJcIjtcbiAgICBpZiAobi52YWx1ZSA9PT0gXCJib29sXCIpIHJldHVybiBcImJvb2xlYW5cIjtcbiAgICBpZiAobi52YWx1ZSA9PT0gXCJsaXN0XCIpIHJldHVybiBcInVua25vd25bXVwiO1xuICAgIGlmIChuLnZhbHVlID09PSBcImRpY3RcIikgcmV0dXJuIFwiUmVjb3JkPHN0cmluZywgdW5rbm93bj5cIjtcbiAgICBpZiAobi52YWx1ZSA9PT0gXCJudWxsXCIpIHJldHVybiBcIm51bGxcIjtcbiAgICByZXR1cm4gbi52YWx1ZTtcbiAgfVxuICBpZiAobi5raW5kID09PSBcInN0cmluZ1wiKSByZXR1cm4gSlNPTi5zdHJpbmdpZnkobi52YWx1ZSk7XG4gIGlmIChuLmtpbmQgPT09IFwibnVtYmVyXCIpIHJldHVybiBuLnZhbHVlO1xuICBpZiAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCJ8XCIpIHJldHVybiBgJHtlbWl0VHlwZU5vZGUobi5sZWZ0KX0gfCAke2VtaXRUeXBlTm9kZShuLnJpZ2h0KX1gO1xuICBpZiAobi5raW5kID09PSBcInNxdWFyZVwiKSB7XG4gICAgaWYgKG4ubm9kZXMubGVuZ3RoID4gMCAmJiBuLm5vZGVzWzBdLmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSB7XG4gICAgICBjb25zdCBoZWFkID0gbi5ub2Rlc1swXS52YWx1ZTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBuLm5vZGVzLnNsaWNlKDEpLm1hcCgoeCkgPT4gZW1pdFR5cGVOb2RlKHgpKS5qb2luKFwiLCBcIik7XG4gICAgICByZXR1cm4gYXJncy5sZW5ndGggPiAwID8gYCR7aGVhZH08JHthcmdzfT5gIDogaGVhZDtcbiAgICB9XG4gICAgcmV0dXJuIGBbJHtuLm5vZGVzLm1hcCgoeCkgPT4gZW1pdFR5cGVOb2RlKHgpKS5qb2luKFwiLCBcIil9XWA7XG4gIH1cbiAgaWYgKG4ua2luZCA9PT0gXCJjdXJseVwiICYmIG4ubm9kZXMubGVuZ3RoID49IDMgJiYgaXNJZGVudChuLm5vZGVzWzBdLCBcIiRkaWN0XCIpKSB7XG4gICAgY29uc3Qga2V5UGFydCA9IG4ubm9kZXNbMV07XG4gICAgY29uc3QgdmFsVHlwZSA9IGVtaXRUeXBlTm9kZShuLm5vZGVzWzJdKTtcbiAgICBpZiAoa2V5UGFydC5raW5kID09PSBcInNxdWFyZVwiICYmIGtleVBhcnQubm9kZXMubGVuZ3RoID09PSAzICYmIGtleVBhcnQubm9kZXNbMV0ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICAgIGNvbnN0IGsgPSBrZXlQYXJ0Lm5vZGVzWzBdO1xuICAgICAgY29uc3Qga0luID0ga2V5UGFydC5ub2Rlc1sxXTtcbiAgICAgIGNvbnN0IGtleXMgPSBrZXlQYXJ0Lm5vZGVzWzJdO1xuICAgICAgaWYgKGsua2luZCA9PT0gXCJpZGVudGlmaWVyXCIgJiYga0luLnZhbHVlID09PSBcImluXCIpIHtcbiAgICAgICAgcmV0dXJuIGB7IFske2sudmFsdWV9IGluICR7ZW1pdFR5cGVOb2RlKGtleXMpfV06ICR7dmFsVHlwZX0gfWA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBgUmVjb3JkPHN0cmluZywgJHt2YWxUeXBlfT5gO1xuICB9XG4gIHJldHVybiBcInVua25vd25cIjtcbn1cblxuZnVuY3Rpb24gY29tcGlsZUFzc2lnbkxlZnQobjogTm9kZSwgY3R4OiBDdHgpOiBzdHJpbmcge1xuICBpZiAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCI6XCIpIHJldHVybiBjb21waWxlQXNzaWduTGVmdChuLmxlZnQsIGN0eCk7XG4gIGlmIChuLmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSByZXR1cm4gbi52YWx1ZTtcbiAgaWYgKG4ua2luZCA9PT0gXCJiaW5vcFwiICYmIG4ub3AgPT09IFwiLlwiKSByZXR1cm4gYCR7Y29tcGlsZUV4cHIobi5sZWZ0LCBjdHgpfS4ke2NvbXBpbGVFeHByKG4ucmlnaHQsIGN0eCl9YDtcbiAgZmFpbChcIkludmFsaWQgYXNzaWdubWVudCB0YXJnZXRcIiwgbik7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVJZkV4cHIobm9kZXM6IE5vZGVbXSwgY3R4OiBDdHgpOiBzdHJpbmcge1xuICBpZiAobm9kZXMubGVuZ3RoID09PSAwKSByZXR1cm4gXCJudWxsXCI7XG4gIGlmIChub2Rlcy5sZW5ndGggPT09IDEpIHJldHVybiBjb21waWxlRXhwcihub2Rlc1swXSwgY3R4KTtcblxuICBjb25zdCB3YWxrID0gKHN0YXJ0OiBudW1iZXIpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChzdGFydCA+PSBub2Rlcy5sZW5ndGgpIHJldHVybiBcIm51bGxcIjtcbiAgICBpZiAoc3RhcnQgPT09IG5vZGVzLmxlbmd0aCAtIDEpIHJldHVybiBjb21waWxlRXhwcihub2Rlc1tzdGFydF0sIGN0eCk7XG4gICAgY29uc3QgY29uZCA9IGNvbXBpbGVFeHByKG5vZGVzW3N0YXJ0XSwgY3R4KTtcbiAgICBjb25zdCB5ZXMgPSBjb21waWxlRXhwcihub2Rlc1tzdGFydCArIDFdLCBjdHgpO1xuICAgIGNvbnN0IG5vID0gd2FsayhzdGFydCArIDIpO1xuICAgIHJldHVybiBgKCR7Y29uZH0gPyAke3llc30gOiAke25vfSlgO1xuICB9O1xuXG4gIHJldHVybiB3YWxrKDApO1xufVxuXG5mdW5jdGlvbiBjb21waWxlRG9FeHByKG5vZGVzOiBOb2RlW10sIGN0eDogQ3R4KTogc3RyaW5nIHtcbiAgY29uc3QgYm9keSA9IGNvbXBpbGVCbG9jayhub2RlcywgY3R4LCB0cnVlKTtcbiAgcmV0dXJuIGAoKCkgPT4geyR7Ym9keX19KSgpYDtcbn1cblxuZnVuY3Rpb24gY29tcGlsZU1hdGNoRXhwcihub2RlczogTm9kZVtdLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGlmIChub2Rlcy5sZW5ndGggPT09IDApIHJldHVybiBcIm51bGxcIjtcbiAgY29uc3QgdmFsdWVFeHByID0gY29tcGlsZUV4cHIobm9kZXNbMF0sIGN0eCk7XG4gIGlmIChub2Rlcy5sZW5ndGggPT09IDIpIHtcbiAgICBjb25zdCBwYXR0ID0gSlNPTi5zdHJpbmdpZnkobm9kZXNbMV0pO1xuICAgIHJldHVybiBgX19tcl9tYXRjaFBhdHRlcm4oJHt2YWx1ZUV4cHJ9LCAke3BhdHR9KWA7XG4gIH1cbiAgY29uc3QgdG1wID0gbmV4dFRtcChjdHgpO1xuXG4gIGNvbnN0IGNodW5rczogc3RyaW5nW10gPSBbXTtcbiAgY2h1bmtzLnB1c2goYGNvbnN0ICR7dG1wfSA9ICR7dmFsdWVFeHByfTtgKTtcblxuICBmb3IgKGxldCBpID0gMTsgaSA8IG5vZGVzLmxlbmd0aCAtIDE7IGkgKz0gMikge1xuICAgIGNvbnN0IHBhdHQgPSBKU09OLnN0cmluZ2lmeShub2Rlc1tpXSk7XG4gICAgY29uc3QgcmV0dmFsID0gY29tcGlsZUV4cHIobm9kZXNbaSArIDFdLCBjdHgpO1xuICAgIGNodW5rcy5wdXNoKGBpZiAoX19tcl9tYXRjaFBhdHRlcm4oJHt0bXB9LCAke3BhdHR9KSkgcmV0dXJuICR7cmV0dmFsfTtgKTtcbiAgfVxuICBjaHVua3MucHVzaChcInJldHVybiBudWxsO1wiKTtcblxuICByZXR1cm4gYCgoKSA9PiB7JHtjaHVua3Muam9pbihcIlxcblwiKX19KSgpYDtcbn1cblxuZnVuY3Rpb24gY29tcGlsZUZ1bkV4cHIobm9kZXM6IE5vZGVbXSwgY3R4OiBDdHgpOiBzdHJpbmcge1xuICBjb25zdCByZXN0ID0gbm9kZXMuc2xpY2UoMSk7XG4gIGxldCBuYW1lID0gXCJcIjtcbiAgbGV0IGFyZ3NOb2RlOiBTcXVhcmVCcmFja2V0c05vZGUgfCBudWxsID0gbnVsbDtcbiAgbGV0IGJvZHlTdGFydCA9IDA7XG5cbiAgaWYgKHJlc3RbMF0/LmtpbmQgPT09IFwiaWRlbnRpZmllclwiICYmIHJlc3RbMV0/LmtpbmQgPT09IFwic3F1YXJlXCIpIHtcbiAgICBuYW1lID0gcmVzdFswXS52YWx1ZTtcbiAgICBhcmdzTm9kZSA9IHJlc3RbMV07XG4gICAgYm9keVN0YXJ0ID0gMjtcbiAgfSBlbHNlIGlmIChyZXN0WzBdPy5raW5kID09PSBcInNxdWFyZVwiKSB7XG4gICAgYXJnc05vZGUgPSByZXN0WzBdO1xuICAgIGJvZHlTdGFydCA9IDE7XG4gIH0gZWxzZSB7XG4gICAgZmFpbChcIkludmFsaWQgZnVuIHN5bnRheC4gRXhwZWN0ZWQge2Z1biBuYW1lIFthcmdzXSAuLi59IG9yIHtmdW4gW2FyZ3NdIC4uLn1cIiwgbm9kZXNbMF0pO1xuICB9XG5cbiAgY29uc3QgYXJncyA9IGFyZ3NOb2RlLm5vZGVzXG4gICAgLm1hcCgobikgPT4ge1xuICAgICAgaWYgKG4ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHJldHVybiBuLnZhbHVlO1xuICAgICAgaWYgKG4ua2luZCA9PT0gXCJiaW5vcFwiICYmIG4ub3AgPT09IFwiOlwiICYmIG4ubGVmdC5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgICAgICBpZiAoY3R4LmVtaXRUYXJnZXQgPT09IFwidHNcIikgcmV0dXJuIGAke24ubGVmdC52YWx1ZX06ICR7ZW1pdFR5cGVOb2RlKG4ucmlnaHQpfWA7XG4gICAgICAgIHJldHVybiBuLmxlZnQudmFsdWU7XG4gICAgICB9XG4gICAgICBmYWlsKFwiRnVuY3Rpb24gYXJncyBtdXN0IGJlIGlkZW50aWZpZXJzIG9yIHR5cGVkIGlkZW50aWZpZXJzXCIsIG4pO1xuICAgIH0pXG4gICAgLmpvaW4oXCIsIFwiKTtcblxuICBjb25zdCBpbm5lckN0eDogQ3R4ID0geyAuLi5jdHgsIGZuRGVwdGg6IGN0eC5mbkRlcHRoICsgMSB9O1xuICBjb25zdCBib2R5ID0gY29tcGlsZUJsb2NrKHJlc3Quc2xpY2UoYm9keVN0YXJ0KSwgaW5uZXJDdHgsIHRydWUpO1xuXG4gIGlmIChuYW1lKSB7XG4gICAgcmV0dXJuIGAoZnVuY3Rpb24gJHtuYW1lfSgke2FyZ3N9KSB7JHtib2R5fX0pYDtcbiAgfVxuICByZXR1cm4gYCgoJHthcmdzfSkgPT4geyR7Ym9keX19KWA7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVXaGVuRXhwcihub2RlczogTm9kZVtdLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGlmIChub2Rlcy5sZW5ndGggPT09IDApIHJldHVybiBcIm51bGxcIjtcbiAgY29uc3QgY29uZCA9IGNvbXBpbGVFeHByKG5vZGVzWzBdLCBjdHgpO1xuICBjb25zdCB0aGVuQm9keSA9IGNvbXBpbGVCbG9jayhub2Rlcy5zbGljZSgxKSwgY3R4LCB0cnVlKTtcbiAgcmV0dXJuIGAoKCkgPT4geyBpZiAoJHtjb25kfSkgeyAke3RoZW5Cb2R5fSB9IHJldHVybiBudWxsOyB9KSgpYDtcbn1cblxuZnVuY3Rpb24gY29tcGlsZVdoaWxlRXhwcihub2RlczogTm9kZVtdLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGlmIChub2Rlcy5sZW5ndGggPT09IDApIHJldHVybiBcIm51bGxcIjtcbiAgY29uc3QgY29uZCA9IGNvbXBpbGVFeHByKG5vZGVzWzBdLCBjdHgpO1xuICBjb25zdCBib2R5ID0gY29tcGlsZUJsb2NrKG5vZGVzLnNsaWNlKDEpLCBjdHgsIGZhbHNlKTtcbiAgcmV0dXJuIGAoKCkgPT4geyB3aGlsZSAoJHtjb25kfSkgeyAke2JvZHl9IH0gcmV0dXJuIG51bGw7IH0pKClgO1xufVxuXG5mdW5jdGlvbiBjb21waWxlRm9yRXhwcihub2RlczogTm9kZVtdLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGlmIChub2Rlcy5sZW5ndGggPCAyKSByZXR1cm4gXCJudWxsXCI7XG4gIGNvbnN0IHRhcmdldCA9IG5vZGVzWzBdO1xuICBpZiAodGFyZ2V0LmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSBmYWlsKFwiZm9yIHRhcmdldCBtdXN0IGJlIGlkZW50aWZpZXJcIiwgdGFyZ2V0KTtcbiAgY29uc3QgaXRlcmFibGUgPSBjb21waWxlRXhwcihub2Rlc1sxXSwgY3R4KTtcbiAgY29uc3QgYm9keSA9IGNvbXBpbGVCbG9jayhub2Rlcy5zbGljZSgyKSwgY3R4LCBmYWxzZSk7XG4gIHJldHVybiBgKCgpID0+IHsgZm9yIChjb25zdCAke3RhcmdldC52YWx1ZX0gb2YgJHtpdGVyYWJsZX0pIHsgJHtib2R5fSB9IHJldHVybiBudWxsOyB9KSgpYDtcbn1cblxuZnVuY3Rpb24gY29tcGlsZU1ldGhvZChuOiBDdXJseUJyYWNrZXRzTm9kZSwgY3R4OiBDdHgpOiBzdHJpbmcge1xuICBpZiAobi5ub2Rlcy5sZW5ndGggPCA0IHx8ICFpc0lkZW50KG4ubm9kZXNbMF0sIFwiZnVuXCIpIHx8IG4ubm9kZXNbMV0ua2luZCAhPT0gXCJpZGVudGlmaWVyXCIgfHwgbi5ub2Rlc1syXS5raW5kICE9PSBcInNxdWFyZVwiKSB7XG4gICAgZmFpbChcIkNsYXNzIG1ldGhvZHMgbXVzdCB1c2Uge2Z1biBuYW1lIFthcmdzXSAuLi59XCIsIG4pO1xuICB9XG4gIGNvbnN0IHJhd05hbWUgPSBuLm5vZGVzWzFdLnZhbHVlO1xuICBjb25zdCBtZXRob2ROYW1lID0gcmF3TmFtZSA9PT0gXCJfX2luaXRfX1wiID8gXCJjb25zdHJ1Y3RvclwiIDogcmF3TmFtZTtcbiAgY29uc3QgYXJnTm9kZXMgPSBuLm5vZGVzWzJdLm5vZGVzO1xuICBjb25zdCBwYXJhbXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJnTm9kZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCBhcmcgPSBhcmdOb2Rlc1tpXTtcbiAgICBsZXQgbmFtZSA9IFwiXCI7XG4gICAgaWYgKGFyZy5raW5kID09PSBcImlkZW50aWZpZXJcIikgbmFtZSA9IGFyZy52YWx1ZTtcbiAgICBlbHNlIGlmIChhcmcua2luZCA9PT0gXCJiaW5vcFwiICYmIGFyZy5vcCA9PT0gXCI6XCIgJiYgYXJnLmxlZnQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICAgIG5hbWUgPSBjdHguZW1pdFRhcmdldCA9PT0gXCJ0c1wiID8gYCR7YXJnLmxlZnQudmFsdWV9OiAke2VtaXRUeXBlTm9kZShhcmcucmlnaHQpfWAgOiBhcmcubGVmdC52YWx1ZTtcbiAgICB9XG4gICAgZWxzZSBmYWlsKFwiTWV0aG9kIGFyZ3VtZW50cyBtdXN0IGJlIGlkZW50aWZpZXJzIG9yIHR5cGVkIGlkZW50aWZpZXJzXCIsIGFyZyk7XG4gICAgaWYgKGkgPT09IDAgJiYgbmFtZSA9PT0gXCJzZWxmXCIpIGNvbnRpbnVlO1xuICAgIHBhcmFtcy5wdXNoKG5hbWUpO1xuICB9XG4gIGNvbnN0IG1ldGhvZEN0eDogQ3R4ID0geyAuLi5jdHgsIGZuRGVwdGg6IGN0eC5mbkRlcHRoICsgMSwgdGhpc0FsaWFzOiBcInNlbGZcIiB9O1xuICBjb25zdCBib2R5ID0gY29tcGlsZUJsb2NrKG4ubm9kZXMuc2xpY2UoMyksIG1ldGhvZEN0eCwgbWV0aG9kTmFtZSAhPT0gXCJjb25zdHJ1Y3RvclwiKTtcbiAgcmV0dXJuIGAke21ldGhvZE5hbWV9KCR7cGFyYW1zLmpvaW4oXCIsIFwiKX0pIHske2JvZHl9fWA7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVDbGFzc0V4cHIobm9kZXM6IE5vZGVbXSwgY3R4OiBDdHgpOiBzdHJpbmcge1xuICBpZiAobm9kZXMubGVuZ3RoIDwgMiB8fCBub2Rlc1sxXS5raW5kICE9PSBcImlkZW50aWZpZXJcIikge1xuICAgIGZhaWwoXCJjbGFzcyByZXF1aXJlcyBuYW1lIGlkZW50aWZpZXJcIiwgbm9kZXNbMF0pO1xuICB9XG4gIGNvbnN0IGNsYXNzTmFtZSA9IG5vZGVzWzFdLnZhbHVlO1xuICBsZXQgYm9keVN0YXJ0ID0gMjtcbiAgaWYgKG5vZGVzWzJdPy5raW5kID09PSBcInNxdWFyZVwiKSBib2R5U3RhcnQgPSAzO1xuICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBuIG9mIG5vZGVzLnNsaWNlKGJvZHlTdGFydCkpIHtcbiAgICBpZiAobi5raW5kID09PSBcImN1cmx5XCIgJiYgaXNJZGVudChuLm5vZGVzWzBdLCBcImZ1blwiKSkge1xuICAgICAgcGFydHMucHVzaChjb21waWxlTWV0aG9kKG4sIGN0eCkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYGNsYXNzICR7Y2xhc3NOYW1lfSB7JHtwYXJ0cy5qb2luKFwiXFxuXCIpfX1gO1xufVxuXG5mdW5jdGlvbiBub2RlVG9Nb2R1bGVOYW1lKG46IE5vZGUpOiBzdHJpbmcge1xuICBpZiAobi5raW5kID09PSBcImlkZW50aWZpZXJcIikgcmV0dXJuIG4udmFsdWU7XG4gIGlmIChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcIi5cIikgcmV0dXJuIGAke25vZGVUb01vZHVsZU5hbWUobi5sZWZ0KX0uJHtub2RlVG9Nb2R1bGVOYW1lKG4ucmlnaHQpfWA7XG4gIGZhaWwoXCJJbnZhbGlkIG1vZHVsZSBpZGVudGlmaWVyXCIsIG4pO1xufVxuXG5mdW5jdGlvbiBwYXJzZUltcG9ydEZyb21OYW1lcyhuOiBOb2RlKTogc3RyaW5nW10ge1xuICBpZiAobi5raW5kID09PSBcInNxdWFyZVwiIHx8IG4ua2luZCA9PT0gXCJyb3VuZFwiKSB7XG4gICAgcmV0dXJuIG4ubm9kZXNcbiAgICAgIC5tYXAoKHgpID0+IHtcbiAgICAgICAgaWYgKHgua2luZCAhPT0gXCJpZGVudGlmaWVyXCIpIGZhaWwoXCJpbXBvcnQgZnJvbSBuYW1lcyBtdXN0IGJlIGlkZW50aWZpZXJzXCIsIHgpO1xuICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgIH0pO1xuICB9XG4gIGZhaWwoXCJJbnZhbGlkIGltcG9ydCBmcm9tIGxpc3RcIiwgbik7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVJbXBvcnRFeHByKG5vZGVzOiBOb2RlW10pOiBzdHJpbmcge1xuICBjb25zdCBzdGVwczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCBuIG9mIG5vZGVzKSB7XG4gICAgaWYgKG4ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIgfHwgKG4ua2luZCA9PT0gXCJiaW5vcFwiICYmIG4ub3AgPT09IFwiLlwiKSkge1xuICAgICAgY29uc3QgbW9kdWxlTmFtZSA9IG5vZGVUb01vZHVsZU5hbWUobik7XG4gICAgICBjb25zdCBhbGlhcyA9IG1vZHVsZU5hbWUuaW5jbHVkZXMoXCIuXCIpID8gbW9kdWxlTmFtZS5zcGxpdChcIi5cIikuYXQoLTEpID8/IG1vZHVsZU5hbWUgOiBtb2R1bGVOYW1lO1xuICAgICAgc3RlcHMucHVzaChgX19tcl9pbXBvcnQoJHtKU09OLnN0cmluZ2lmeShtb2R1bGVOYW1lKX0sICR7SlNPTi5zdHJpbmdpZnkoYWxpYXMpfSk7YCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKG4ua2luZCA9PT0gXCJiaW5vcFwiICYmIG4ub3AgPT09IFwiQFwiKSB7XG4gICAgICBjb25zdCBtb2R1bGVOYW1lID0gbm9kZVRvTW9kdWxlTmFtZShuLmxlZnQpO1xuICAgICAgY29uc3QgbmFtZXMgPSBwYXJzZUltcG9ydEZyb21OYW1lcyhuLnJpZ2h0KTtcbiAgICAgIHN0ZXBzLnB1c2goYF9fbXJfaW1wb3J0X2Zyb20oJHtKU09OLnN0cmluZ2lmeShtb2R1bGVOYW1lKX0sICR7SlNPTi5zdHJpbmdpZnkobmFtZXMpfSk7YCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgZmFpbChcIlVuc3VwcG9ydGVkIGltcG9ydCBmb3JtXCIsIG4pO1xuICB9XG4gIHN0ZXBzLnB1c2goXCJyZXR1cm4gbnVsbDtcIik7XG4gIHJldHVybiBgKCgpID0+IHske3N0ZXBzLmpvaW4oXCJcXG5cIil9fSkoKWA7XG59XG5cbmZ1bmN0aW9uIGFwcGx5SW1wb3J0bShub2RlczogTm9kZVtdLCBjdHg6IEN0eCk6IHZvaWQge1xuICBjb25zdCByZXNvbHZlciA9IGN0eC5tZXRhTW9kdWxlUmVzb2x2ZXIgPz8gKChuYW1lOiBzdHJpbmcpID0+IGN0eC5tb2R1bGVSZXNvbHZlcj8uKG5hbWUpIGFzIHsgX19tcl9tZXRhX18/OiBTZXJpYWxpemVkTWFrcmVsbE1hY3JvW10gfSB8IG51bGwpO1xuICBpZiAoIXJlc29sdmVyKSBmYWlsKFwiaW1wb3J0bSByZXF1aXJlcyBhIG1ldGEgbW9kdWxlIHJlc29sdmVyXCIpO1xuXG4gIGNvbnN0IGFwcGx5TW9kdWxlID0gKG1vZHVsZU5hbWU6IHN0cmluZywgbmFtZXM/OiBzdHJpbmdbXSk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IG1vZCA9IHJlc29sdmVyKG1vZHVsZU5hbWUpO1xuICAgIGlmICghbW9kIHx8ICFBcnJheS5pc0FycmF5KG1vZC5fX21yX21ldGFfXykpIHtcbiAgICAgIGZhaWwoYE1vZHVsZSAnJHttb2R1bGVOYW1lfScgaGFzIG5vIF9fbXJfbWV0YV9fIGRlZmluaXRpb25zYCk7XG4gICAgfVxuICAgIGNvbnN0IHdhbnRlZCA9IG5hbWVzID8gbmV3IFNldChuYW1lcykgOiBudWxsO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgbW9kLl9fbXJfbWV0YV9fKSB7XG4gICAgICBpZiAod2FudGVkICYmICF3YW50ZWQuaGFzKGVudHJ5Lm5hbWUpKSBjb250aW51ZTtcbiAgICAgIGRlZmluZU1ha3JlbGxNYWNybyhlbnRyeS5uYW1lLCBlbnRyeS5wYXJhbXMsIGVudHJ5LmJvZHksIGN0eC5tYWNyb3MpO1xuICAgIH1cbiAgfTtcblxuICBmb3IgKGNvbnN0IG4gb2Ygbm9kZXMpIHtcbiAgICBpZiAobi5raW5kID09PSBcImlkZW50aWZpZXJcIiB8fCAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCIuXCIpKSB7XG4gICAgICBhcHBseU1vZHVsZShub2RlVG9Nb2R1bGVOYW1lKG4pKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCJAXCIpIHtcbiAgICAgIGFwcGx5TW9kdWxlKG5vZGVUb01vZHVsZU5hbWUobi5sZWZ0KSwgcGFyc2VJbXBvcnRGcm9tTmFtZXMobi5yaWdodCkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGZhaWwoXCJVbnN1cHBvcnRlZCBpbXBvcnRtIGZvcm1cIiwgbik7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29tcGlsZUN1cmx5KG46IEN1cmx5QnJhY2tldHNOb2RlLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIGlmIChyZWdpc3Rlck1hY3JvRGVmKG4sIGN0eCkpIHJldHVybiBcIm51bGxcIjtcblxuICBjb25zdCBleHBhbmRlZCA9IGV4cGFuZE1hY3JvKG4sIGN0eCk7XG4gIGlmIChleHBhbmRlZCkge1xuICAgIGlmIChleHBhbmRlZC5sZW5ndGggPT09IDApIHJldHVybiBcIm51bGxcIjtcbiAgICBpZiAoZXhwYW5kZWQubGVuZ3RoID09PSAxKSByZXR1cm4gY29tcGlsZUV4cHIoZXhwYW5kZWRbMF0sIGN0eCk7XG4gICAgcmV0dXJuIGNvbXBpbGVEb0V4cHIoZXhwYW5kZWQsIGN0eCk7XG4gIH1cblxuICBpZiAobi5ub2Rlcy5sZW5ndGggPT09IDApIHJldHVybiBcIm51bGxcIjtcbiAgY29uc3QgaGVhZCA9IG4ubm9kZXNbMF07XG5cbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJpZlwiKSkgcmV0dXJuIGNvbXBpbGVJZkV4cHIobi5ub2Rlcy5zbGljZSgxKSwgY3R4KTtcbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJkb1wiKSkgcmV0dXJuIGNvbXBpbGVEb0V4cHIobi5ub2Rlcy5zbGljZSgxKSwgY3R4KTtcbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJ3aGVuXCIpKSByZXR1cm4gY29tcGlsZVdoZW5FeHByKG4ubm9kZXMuc2xpY2UoMSksIGN0eCk7XG4gIGlmIChpc0lkZW50KGhlYWQsIFwid2hpbGVcIikpIHJldHVybiBjb21waWxlV2hpbGVFeHByKG4ubm9kZXMuc2xpY2UoMSksIGN0eCk7XG4gIGlmIChpc0lkZW50KGhlYWQsIFwiZm9yXCIpKSByZXR1cm4gY29tcGlsZUZvckV4cHIobi5ub2Rlcy5zbGljZSgxKSwgY3R4KTtcbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJpbXBvcnRcIikpIHJldHVybiBjb21waWxlSW1wb3J0RXhwcihuLm5vZGVzLnNsaWNlKDEpKTtcbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJpbXBvcnRtXCIpKSB7XG4gICAgYXBwbHlJbXBvcnRtKG4ubm9kZXMuc2xpY2UoMSksIGN0eCk7XG4gICAgcmV0dXJuIFwibnVsbFwiO1xuICB9XG4gIGlmIChpc0lkZW50KGhlYWQsIFwibWF0Y2hcIikpIHJldHVybiBjb21waWxlTWF0Y2hFeHByKG4ubm9kZXMuc2xpY2UoMSksIGN0eCk7XG4gIGlmIChpc0lkZW50KGhlYWQsIFwiZnVuXCIpKSByZXR1cm4gY29tcGlsZUZ1bkV4cHIobi5ub2RlcywgY3R4KTtcbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJjbGFzc1wiKSkgcmV0dXJuIGNvbXBpbGVDbGFzc0V4cHIobi5ub2RlcywgY3R4KTtcbiAgaWYgKGlzSWRlbnQoaGVhZCwgXCJuZXdcIikpIHtcbiAgICBpZiAobi5ub2Rlcy5sZW5ndGggPCAyKSBmYWlsKFwibmV3IHJlcXVpcmVzIGNvbnN0cnVjdG9yIGV4cHJlc3Npb25cIiwgbik7XG4gICAgY29uc3QgY3RvckV4cHIgPSBjb21waWxlRXhwcihuLm5vZGVzWzFdLCBjdHgpO1xuICAgIGNvbnN0IHJhd0FyZ3MgPSBuLm5vZGVzLnNsaWNlKDIpO1xuICAgIGlmIChyYXdBcmdzLmxlbmd0aCA9PT0gMSAmJiByYXdBcmdzWzBdLmtpbmQgPT09IFwic3F1YXJlXCIpIHtcbiAgICAgIGNvbnN0IGFyZ3MgPSByYXdBcmdzWzBdLm5vZGVzLm1hcCgoYXJnKSA9PiBjb21waWxlRXhwcihhcmcsIGN0eCkpLmpvaW4oXCIsIFwiKTtcbiAgICAgIHJldHVybiBgbmV3ICR7Y3RvckV4cHJ9KCR7YXJnc30pYDtcbiAgICB9XG4gICAgY29uc3QgYXJncyA9IHJhd0FyZ3MubWFwKChhcmcpID0+IGNvbXBpbGVFeHByKGFyZywgY3R4KSkuam9pbihcIiwgXCIpO1xuICAgIHJldHVybiBgbmV3ICR7Y3RvckV4cHJ9KCR7YXJnc30pYDtcbiAgfVxuXG4gIGNvbnN0IGNhbGxlZSA9IGNvbXBpbGVFeHByKGhlYWQsIGN0eCk7XG4gIGNvbnN0IGFyZ3MgPSBuLm5vZGVzLnNsaWNlKDEpLm1hcCgoYXJnKSA9PiBjb21waWxlRXhwcihhcmcsIGN0eCkpLmpvaW4oXCIsIFwiKTtcbiAgcmV0dXJuIGAke2NhbGxlZX0oJHthcmdzfSlgO1xufVxuXG5mdW5jdGlvbiBjb21waWxlUGlwZShsZWZ0OiBOb2RlLCByaWdodDogTm9kZSwgY3R4OiBDdHgpOiBzdHJpbmcge1xuICBjb25zdCBsZWZ0RXhwciA9IGNvbXBpbGVFeHByKGxlZnQsIGN0eCk7XG4gIGlmIChyaWdodC5raW5kID09PSBcImlkZW50aWZpZXJcIikgcmV0dXJuIGAke3JpZ2h0LnZhbHVlfSgke2xlZnRFeHByfSlgO1xuICBpZiAocmlnaHQua2luZCA9PT0gXCJjdXJseVwiICYmIHJpZ2h0Lm5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBoZWFkID0gY29tcGlsZUV4cHIocmlnaHQubm9kZXNbMF0sIGN0eCk7XG4gICAgY29uc3QgcmVzdCA9IHJpZ2h0Lm5vZGVzLnNsaWNlKDEpLm1hcCgoYSkgPT4gY29tcGlsZUV4cHIoYSwgY3R4KSk7XG4gICAgcmV0dXJuIGAke2hlYWR9KCR7W2xlZnRFeHByLCAuLi5yZXN0XS5qb2luKFwiLCBcIil9KWA7XG4gIH1cbiAgcmV0dXJuIGAke2NvbXBpbGVFeHByKHJpZ2h0LCBjdHgpfSgke2xlZnRFeHByfSlgO1xufVxuXG5mdW5jdGlvbiBjb21waWxlRXhwcihuOiBOb2RlLCBjdHg6IEN0eCk6IHN0cmluZyB7XG4gIHN3aXRjaCAobi5raW5kKSB7XG4gICAgY2FzZSBcImlkZW50aWZpZXJcIjpcbiAgICAgIGlmIChjdHgudGhpc0FsaWFzICYmIG4udmFsdWUgPT09IGN0eC50aGlzQWxpYXMpIHJldHVybiBcInRoaXNcIjtcbiAgICAgIHJldHVybiBlbWl0TGl0ZXJhbElkZW50aWZpZXIobi52YWx1ZSk7XG4gICAgY2FzZSBcInN0cmluZ1wiOlxuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG4udmFsdWUpO1xuICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgIHJldHVybiBuLnZhbHVlO1xuICAgIGNhc2UgXCJyb3VuZFwiOlxuICAgICAgaWYgKG4ubm9kZXMubGVuZ3RoID09PSAwKSByZXR1cm4gXCJudWxsXCI7XG4gICAgICBpZiAobi5ub2Rlcy5sZW5ndGggPT09IDEpIHJldHVybiBgKCR7Y29tcGlsZUV4cHIobi5ub2Rlc1swXSwgY3R4KX0pYDtcbiAgICAgIHJldHVybiBgWyR7bi5ub2Rlcy5tYXAoKHgpID0+IGNvbXBpbGVFeHByKHgsIGN0eCkpLmpvaW4oXCIsIFwiKX1dYDtcbiAgICBjYXNlIFwic3F1YXJlXCI6XG4gICAgICByZXR1cm4gYFske24ubm9kZXMubWFwKCh4KSA9PiBjb21waWxlRXhwcih4LCBjdHgpKS5qb2luKFwiLCBcIil9XWA7XG4gICAgY2FzZSBcImN1cmx5XCI6XG4gICAgICByZXR1cm4gY29tcGlsZUN1cmx5KG4sIGN0eCk7XG4gICAgY2FzZSBcImJpbm9wXCI6IHtcbiAgICAgIGlmIChuLm9wID09PSBcIj1cIikge1xuICAgICAgICBjb25zdCBsaHMgPSBjb21waWxlQXNzaWduTGVmdChuLmxlZnQsIGN0eCk7XG4gICAgICAgIGNvbnN0IHJocyA9IGNvbXBpbGVFeHByKG4ucmlnaHQsIGN0eCk7XG4gICAgICAgIHJldHVybiBgKCR7bGhzfSA9ICR7cmhzfSlgO1xuICAgICAgfVxuICAgICAgaWYgKG4ub3AgPT09IFwifFwiKSByZXR1cm4gY29tcGlsZVBpcGUobi5sZWZ0LCBuLnJpZ2h0LCBjdHgpO1xuICAgICAgaWYgKG4ub3AgPT09IFwiLT5cIikge1xuICAgICAgICBsZXQgYXJnczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgaWYgKG4ubGVmdC5raW5kID09PSBcImlkZW50aWZpZXJcIikgYXJncyA9IFtuLmxlZnQudmFsdWVdO1xuICAgICAgICBlbHNlIGlmIChuLmxlZnQua2luZCA9PT0gXCJzcXVhcmVcIikge1xuICAgICAgICAgIGFyZ3MgPSBuLmxlZnQubm9kZXMubWFwKCh4KSA9PiB7XG4gICAgICAgICAgICBpZiAoeC5raW5kICE9PSBcImlkZW50aWZpZXJcIikgdGhyb3cgbmV3IEVycm9yKFwiTGFtYmRhIGFyZ3MgbXVzdCBiZSBpZGVudGlmaWVyc1wiKTtcbiAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZhaWwoXCJJbnZhbGlkIGxhbWJkYSBhcmdzXCIsIG4ubGVmdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAoKCR7YXJncy5qb2luKFwiLCBcIil9KSA9PiAoJHtjb21waWxlRXhwcihuLnJpZ2h0LCBjdHgpfSkpYDtcbiAgICAgIH1cbiAgICAgIGlmIChuLm9wID09PSBcIi5cIikgcmV0dXJuIGAke2NvbXBpbGVFeHByKG4ubGVmdCwgY3R4KX0uJHtjb21waWxlRXhwcihuLnJpZ2h0LCBjdHgpfWA7XG4gICAgICBpZiAobi5vcCA9PT0gXCI6XCIpIHJldHVybiBjb21waWxlRXhwcihuLmxlZnQsIGN0eCk7XG4gICAgICByZXR1cm4gYCgke2NvbXBpbGVFeHByKG4ubGVmdCwgY3R4KX0gJHtuLm9wfSAke2NvbXBpbGVFeHByKG4ucmlnaHQsIGN0eCl9KWA7XG4gICAgfVxuICAgIGNhc2UgXCJvcGVyYXRvclwiOlxuICAgICAgZmFpbChgVW5leHBlY3RlZCBzdGFuZGFsb25lIG9wZXJhdG9yICcke24udmFsdWV9J2AsIG4pO1xuICAgIGNhc2UgXCJzZXF1ZW5jZVwiOlxuICAgICAgcmV0dXJuIGNvbXBpbGVEb0V4cHIobi5ub2RlcywgY3R4KTtcbiAgICBkZWZhdWx0OlxuICAgICAgZmFpbChgVW5rbm93biBub2RlIGtpbmQ6ICR7KG4gYXMgTm9kZSkua2luZH1gLCBuKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0Z1bkRlY2wobjogTm9kZSk6IG4gaXMgQ3VybHlCcmFja2V0c05vZGUge1xuICByZXR1cm4gbi5raW5kID09PSBcImN1cmx5XCIgJiYgbi5ub2Rlcy5sZW5ndGggPj0gMyAmJiBpc0lkZW50KG4ubm9kZXNbMF0sIFwiZnVuXCIpICYmIG4ubm9kZXNbMV0ua2luZCA9PT0gXCJpZGVudGlmaWVyXCI7XG59XG5cbmZ1bmN0aW9uIGlzTWFjcm9EZWNsKG46IE5vZGUpOiBuIGlzIEN1cmx5QnJhY2tldHNOb2RlIHtcbiAgcmV0dXJuIG4ua2luZCA9PT0gXCJjdXJseVwiICYmIG4ubm9kZXMubGVuZ3RoID49IDUgJiYgaXNJZGVudChuLm5vZGVzWzBdLCBcImRlZlwiKSAmJiBpc0lkZW50KG4ubm9kZXNbMV0sIFwibWFjcm9cIik7XG59XG5cbmZ1bmN0aW9uIGlzQ2xhc3NEZWNsKG46IE5vZGUpOiBuIGlzIEN1cmx5QnJhY2tldHNOb2RlIHtcbiAgcmV0dXJuIG4ua2luZCA9PT0gXCJjdXJseVwiICYmIG4ubm9kZXMubGVuZ3RoID49IDIgJiYgaXNJZGVudChuLm5vZGVzWzBdLCBcImNsYXNzXCIpICYmIG4ubm9kZXNbMV0ua2luZCA9PT0gXCJpZGVudGlmaWVyXCI7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVTdG10KG46IE5vZGUsIGN0eDogQ3R4LCBpc0xhc3Q6IGJvb2xlYW4pOiBzdHJpbmcge1xuICBpZiAoaXNNYWNyb0RlY2wobikpIHtcbiAgICByZWdpc3Rlck1hY3JvRGVmKG4sIGN0eCk7XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICBpZiAobi5raW5kID09PSBcImN1cmx5XCIpIHtcbiAgICBjb25zdCBleHBhbmRlZCA9IGV4cGFuZE1hY3JvKG4sIGN0eCk7XG4gICAgaWYgKGV4cGFuZGVkKSB7XG4gICAgICBpZiAoZXhwYW5kZWQubGVuZ3RoID09PSAwKSByZXR1cm4gaXNMYXN0ID8gXCJyZXR1cm4gbnVsbDtcIiA6IFwiXCI7XG4gICAgICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZXhwYW5kZWQubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgY29uc3QgcGFydCA9IGNvbXBpbGVTdG10KGV4cGFuZGVkW2ldLCBjdHgsIGlzTGFzdCAmJiBpID09PSBleHBhbmRlZC5sZW5ndGggLSAxKTtcbiAgICAgICAgaWYgKHBhcnQpIHBhcnRzLnB1c2gocGFydCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFydHMuam9pbihcIlxcblwiKTtcbiAgICB9XG4gIH1cblxuICBpZiAoaXNGdW5EZWNsKG4pKSB7XG4gICAgY29uc3QgZm5OYW1lID0gKG4ubm9kZXNbMV0gYXMgeyB2YWx1ZTogc3RyaW5nIH0pLnZhbHVlO1xuICAgIGNvbnN0IGZuRXhwciA9IGNvbXBpbGVGdW5FeHByKG4ubm9kZXMsIGN0eCk7XG4gICAgcmV0dXJuIGBjb25zdCAke2ZuTmFtZX0gPSAke2ZuRXhwcn07YDtcbiAgfVxuXG4gIGlmIChpc0NsYXNzRGVjbChuKSkge1xuICAgIGNvbnN0IGNsYXNzRXhwciA9IGNvbXBpbGVDbGFzc0V4cHIobi5ub2RlcywgY3R4KTtcbiAgICBpZiAoaXNMYXN0KSByZXR1cm4gYCR7Y2xhc3NFeHByfTtcXG5yZXR1cm4gJHsobi5ub2Rlc1sxXSBhcyB7IHZhbHVlOiBzdHJpbmcgfSkudmFsdWV9O2A7XG4gICAgcmV0dXJuIGAke2NsYXNzRXhwcn07YDtcbiAgfVxuXG4gIGlmIChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcIj1cIiAmJiBuLmxlZnQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICBjb25zdCByaHMgPSBjb21waWxlRXhwcihuLnJpZ2h0LCBjdHgpO1xuICAgIGNvbnN0IGFzc2lnbiA9IGB2YXIgJHtuLmxlZnQudmFsdWV9ID0gJHtyaHN9O2A7XG4gICAgaWYgKGlzTGFzdCkgcmV0dXJuIGAke2Fzc2lnbn1cXG5yZXR1cm4gJHtuLmxlZnQudmFsdWV9O2A7XG4gICAgcmV0dXJuIGFzc2lnbjtcbiAgfVxuICBpZiAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCI9XCIgJiYgbi5sZWZ0LmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLmxlZnQub3AgPT09IFwiOlwiICYmIG4ubGVmdC5sZWZ0LmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSB7XG4gICAgY29uc3QgcmhzID0gY29tcGlsZUV4cHIobi5yaWdodCwgY3R4KTtcbiAgICBjb25zdCB0ID0gZW1pdFR5cGVOb2RlKG4ubGVmdC5yaWdodCk7XG4gICAgY29uc3QgZGVjbCA9IGN0eC5lbWl0VGFyZ2V0ID09PSBcInRzXCJcbiAgICAgID8gYHZhciAke24ubGVmdC5sZWZ0LnZhbHVlfTogJHt0fSA9ICR7cmhzfTtgXG4gICAgICA6IGB2YXIgJHtuLmxlZnQubGVmdC52YWx1ZX0gPSAke3Joc307YDtcbiAgICBpZiAoaXNMYXN0KSByZXR1cm4gYCR7ZGVjbH1cXG5yZXR1cm4gJHtuLmxlZnQubGVmdC52YWx1ZX07YDtcbiAgICByZXR1cm4gZGVjbDtcbiAgfVxuXG4gIGlmIChuLmtpbmQgPT09IFwiY3VybHlcIiAmJiBuLm5vZGVzLmxlbmd0aCA+IDAgJiYgaXNJZGVudChuLm5vZGVzWzBdLCBcInJldHVyblwiKSkge1xuICAgIGNvbnN0IHZhbCA9IG4ubm9kZXNbMV0gPyBjb21waWxlRXhwcihuLm5vZGVzWzFdLCBjdHgpIDogXCJudWxsXCI7XG4gICAgcmV0dXJuIGByZXR1cm4gJHt2YWx9O2A7XG4gIH1cblxuICBjb25zdCBleHByID0gY29tcGlsZUV4cHIobiwgY3R4KTtcbiAgaWYgKGlzTGFzdCkgcmV0dXJuIGByZXR1cm4gJHtleHByfTtgO1xuICByZXR1cm4gYCR7ZXhwcn07YDtcbn1cblxuZnVuY3Rpb24gY29tcGlsZUJsb2NrKG5vZGVzOiBOb2RlW10sIGN0eDogQ3R4LCBhdXRvUmV0dXJuOiBib29sZWFuKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGZpbHRlcmVkID0gbm9kZXMuZmlsdGVyKEJvb2xlYW4pO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGZpbHRlcmVkLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29uc3QgbGluZSA9IGNvbXBpbGVTdG10KGZpbHRlcmVkW2ldLCBjdHgsIGF1dG9SZXR1cm4gJiYgaSA9PT0gZmlsdGVyZWQubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGxpbmUpIGxpbmVzLnB1c2gobGluZSk7XG4gIH1cbiAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMCAmJiBhdXRvUmV0dXJuKSBsaW5lcy5wdXNoKFwicmV0dXJuIG51bGw7XCIpO1xuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVUb0pzKHNyYzogc3RyaW5nLCBvcHRpb25zOiBDb21waWxlT3B0aW9ucyA9IHt9KTogc3RyaW5nIHtcbiAgY29uc3QgY3R4OiBDdHggPSB7XG4gICAgbWFjcm9zOiBvcHRpb25zLm1hY3JvcyA/PyBuZXcgTWFjcm9SZWdpc3RyeSgpLFxuICAgIG1hY3JvQ3R4OiBkZWZhdWx0TWFjcm9Db250ZXh0KCksXG4gICAgbWV0YVJ1bnRpbWU6IG9wdGlvbnMubWV0YVJ1bnRpbWUgPz8gbmV3IElubGluZU1ldGFSdW50aW1lQWRhcHRlcigpLFxuICAgIG1vZHVsZVJlc29sdmVyOiBvcHRpb25zLm1vZHVsZVJlc29sdmVyLFxuICAgIG1ldGFNb2R1bGVSZXNvbHZlcjogb3B0aW9ucy5tZXRhTW9kdWxlUmVzb2x2ZXIsXG4gICAgZm5EZXB0aDogMCxcbiAgICB0ZW1wSWQ6IDAsXG4gICAgZW1pdFRhcmdldDogXCJqc1wiLFxuICB9O1xuXG4gIGNvbnN0IG5vZGVzID0gcGFyc2Uoc3JjKTtcbiAgY29uc3QgYm9keSA9IGNvbXBpbGVCbG9jayhub2RlcywgY3R4LCB0cnVlKTtcbiAgcmV0dXJuIGAoKCkgPT4ge1xcbiR7Ym9keX1cXG59KSgpYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVUb1RzKHNyYzogc3RyaW5nLCBvcHRpb25zOiBDb21waWxlT3B0aW9ucyA9IHt9KTogc3RyaW5nIHtcbiAgY29uc3QgY3R4OiBDdHggPSB7XG4gICAgbWFjcm9zOiBvcHRpb25zLm1hY3JvcyA/PyBuZXcgTWFjcm9SZWdpc3RyeSgpLFxuICAgIG1hY3JvQ3R4OiBkZWZhdWx0TWFjcm9Db250ZXh0KCksXG4gICAgbWV0YVJ1bnRpbWU6IG9wdGlvbnMubWV0YVJ1bnRpbWUgPz8gbmV3IElubGluZU1ldGFSdW50aW1lQWRhcHRlcigpLFxuICAgIG1vZHVsZVJlc29sdmVyOiBvcHRpb25zLm1vZHVsZVJlc29sdmVyLFxuICAgIG1ldGFNb2R1bGVSZXNvbHZlcjogb3B0aW9ucy5tZXRhTW9kdWxlUmVzb2x2ZXIsXG4gICAgZm5EZXB0aDogMCxcbiAgICB0ZW1wSWQ6IDAsXG4gICAgZW1pdFRhcmdldDogXCJ0c1wiLFxuICB9O1xuICBjb25zdCBub2RlcyA9IHBhcnNlKHNyYyk7XG4gIGNvbnN0IGJvZHkgPSBjb21waWxlQmxvY2sobm9kZXMsIGN0eCwgdHJ1ZSk7XG4gIHJldHVybiBgKCgpID0+IHtcXG4ke2JvZHl9XFxufSkoKWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlVG9EdHMoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBub2RlcyA9IHBhcnNlKHNyYyk7XG4gIGNvbnN0IG91dDogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdCBlbWl0QXJnRGVjbCA9IChuOiBOb2RlKTogc3RyaW5nID0+IHtcbiAgICBpZiAobi5raW5kID09PSBcImlkZW50aWZpZXJcIikgcmV0dXJuIGAke24udmFsdWV9OiB1bmtub3duYDtcbiAgICBpZiAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCI6XCIgJiYgbi5sZWZ0LmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSByZXR1cm4gYCR7bi5sZWZ0LnZhbHVlfTogJHtlbWl0VHlwZU5vZGUobi5yaWdodCl9YDtcbiAgICByZXR1cm4gXCJhcmc6IHVua25vd25cIjtcbiAgfTtcblxuICBmb3IgKGNvbnN0IG4gb2Ygbm9kZXMpIHtcbiAgICBpZiAobi5raW5kID09PSBcImN1cmx5XCIgJiYgbi5ub2Rlcy5sZW5ndGggPj0gMyAmJiBpc0lkZW50KG4ubm9kZXNbMF0sIFwiZnVuXCIpICYmIG4ubm9kZXNbMV0ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBuLm5vZGVzWzFdLnZhbHVlO1xuICAgICAgY29uc3QgYXJnc05vZGUgPSBuLm5vZGVzWzJdO1xuICAgICAgY29uc3QgYXJncyA9IGFyZ3NOb2RlLmtpbmQgPT09IFwic3F1YXJlXCIgPyBhcmdzTm9kZS5ub2Rlcy5tYXAoZW1pdEFyZ0RlY2wpLmpvaW4oXCIsIFwiKSA6IFwiXCI7XG4gICAgICBvdXQucHVzaChgZXhwb3J0IGZ1bmN0aW9uICR7bmFtZX0oJHthcmdzfSk6IHVua25vd247YCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKG4ua2luZCA9PT0gXCJjdXJseVwiICYmIG4ubm9kZXMubGVuZ3RoID49IDIgJiYgaXNJZGVudChuLm5vZGVzWzBdLCBcImNsYXNzXCIpICYmIG4ubm9kZXNbMV0ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICAgIG91dC5wdXNoKGBleHBvcnQgY2xhc3MgJHtuLm5vZGVzWzFdLnZhbHVlfSB7fWApO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChuLmtpbmQgPT09IFwiYmlub3BcIiAmJiBuLm9wID09PSBcIj1cIiAmJiBuLmxlZnQua2luZCA9PT0gXCJiaW5vcFwiICYmIG4ubGVmdC5vcCA9PT0gXCI6XCIgJiYgbi5sZWZ0LmxlZnQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICAgIG91dC5wdXNoKGBleHBvcnQgbGV0ICR7bi5sZWZ0LmxlZnQudmFsdWV9OiAke2VtaXRUeXBlTm9kZShuLmxlZnQucmlnaHQpfTtgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAobi5raW5kID09PSBcImJpbm9wXCIgJiYgbi5vcCA9PT0gXCI9XCIgJiYgbi5sZWZ0LmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSB7XG4gICAgICBvdXQucHVzaChgZXhwb3J0IGxldCAke24ubGVmdC52YWx1ZX06IHVua25vd247YCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG91dC5sZW5ndGggPT09IDApIG91dC5wdXNoKFwiZXhwb3J0IHt9O1wiKTtcbiAgcmV0dXJuIG91dC5qb2luKFwiXFxuXCIpO1xufVxuIiwKICAiaW1wb3J0IHsgQmluT3BOb2RlLCBDdXJseUJyYWNrZXRzTm9kZSwgSWRlbnRpZmllck5vZGUsIE5vZGUsIGlzSWRlbnQgfSBmcm9tIFwiLi9hc3RcIjtcblxudHlwZSBFbnYgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuZXhwb3J0IGludGVyZmFjZSBQYXR0ZXJuSG9vayB7XG4gIG5hbWU6IHN0cmluZztcbiAgY2FuSGFuZGxlOiAocGF0dGVybjogTm9kZSkgPT4gYm9vbGVhbjtcbiAgbWF0Y2g6ICh2YWx1ZTogdW5rbm93biwgcGF0dGVybjogTm9kZSwgZW52OiBFbnYsIG5leHQ6ICh2YWx1ZTogdW5rbm93biwgcGF0dGVybjogTm9kZSwgZW52OiBFbnYpID0+IEVudiB8IG51bGwpID0+IEVudiB8IG51bGw7XG59XG5cbmNvbnN0IHBhdHRlcm5Ib29rczogUGF0dGVybkhvb2tbXSA9IFtdO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJQYXR0ZXJuSG9vayhob29rOiBQYXR0ZXJuSG9vayk6IHZvaWQge1xuICBwYXR0ZXJuSG9va3MudW5zaGlmdChob29rKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyUGF0dGVybkhvb2tzKCk6IHZvaWQge1xuICBwYXR0ZXJuSG9va3MubGVuZ3RoID0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUGF0dGVybih2YWx1ZTogdW5rbm93biwgcGF0dGVybjogTm9kZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gISFtYXRjaFdpdGhFbnYodmFsdWUsIHBhdHRlcm4sIHt9KTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hXaXRoRW52KHZhbHVlOiB1bmtub3duLCBwYXR0ZXJuOiBOb2RlLCBlbnY6IEVudik6IEVudiB8IG51bGwge1xuICBmb3IgKGNvbnN0IGhvb2sgb2YgcGF0dGVybkhvb2tzKSB7XG4gICAgaWYgKGhvb2suY2FuSGFuZGxlKHBhdHRlcm4pKSB7XG4gICAgICByZXR1cm4gaG9vay5tYXRjaCh2YWx1ZSwgcGF0dGVybiwgZW52LCBtYXRjaFdpdGhFbnYpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChpc0lkZW50KHBhdHRlcm4sIFwiX1wiKSkgcmV0dXJuIGVudjtcbiAgaWYgKGlzSWRlbnQocGF0dGVybiwgXCIkXCIpKSByZXR1cm4gdmFsdWUgPyBlbnYgOiBudWxsO1xuXG4gIGlmIChwYXR0ZXJuLmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSB7XG4gICAgaWYgKHBhdHRlcm4udmFsdWUgPT09IFwidHJ1ZVwiKSByZXR1cm4gdmFsdWUgPT09IHRydWUgPyBlbnYgOiBudWxsO1xuICAgIGlmIChwYXR0ZXJuLnZhbHVlID09PSBcImZhbHNlXCIpIHJldHVybiB2YWx1ZSA9PT0gZmFsc2UgPyBlbnYgOiBudWxsO1xuICAgIGlmIChwYXR0ZXJuLnZhbHVlID09PSBcIm51bGxcIikgcmV0dXJuIHZhbHVlID09PSBudWxsID8gZW52IDogbnVsbDtcbiAgICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm4udmFsdWUgPyBlbnYgOiBudWxsO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4ua2luZCA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHZhbHVlID09PSBwYXR0ZXJuLnZhbHVlID8gZW52IDogbnVsbDtcbiAgaWYgKHBhdHRlcm4ua2luZCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIE51bWJlcihwYXR0ZXJuLnZhbHVlKSA9PT0gdmFsdWUgPyBlbnYgOiBudWxsO1xuICBpZiAocGF0dGVybi5raW5kID09PSBcInJvdW5kXCIpIHtcbiAgICBpZiAocGF0dGVybi5ub2Rlcy5sZW5ndGggPT09IDApIHJldHVybiB2YWx1ZSA9PT0gbnVsbCA/IGVudiA6IG51bGw7XG4gICAgaWYgKHBhdHRlcm4ubm9kZXMubGVuZ3RoID09PSAxKSByZXR1cm4gbWF0Y2hXaXRoRW52KHZhbHVlLCBwYXR0ZXJuLm5vZGVzWzBdLCBlbnYpO1xuICAgIGZvciAoY29uc3QgcG4gb2YgcGF0dGVybi5ub2Rlcykge1xuICAgICAgY29uc3QgbSA9IG1hdGNoV2l0aEVudih2YWx1ZSwgcG4sIHsgLi4uZW52IH0pO1xuICAgICAgaWYgKG0pIHJldHVybiBtO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmIChwYXR0ZXJuLmtpbmQgPT09IFwic3F1YXJlXCIpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSByZXR1cm4gbnVsbDtcbiAgICBpZiAodmFsdWUubGVuZ3RoICE9PSBwYXR0ZXJuLm5vZGVzLmxlbmd0aCkgcmV0dXJuIG51bGw7XG4gICAgbGV0IG5leHRFbnY6IEVudiB8IG51bGwgPSBlbnY7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJuLm5vZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBpZiAoIW5leHRFbnYpIHJldHVybiBudWxsO1xuICAgICAgbmV4dEVudiA9IG1hdGNoV2l0aEVudih2YWx1ZVtpXSwgcGF0dGVybi5ub2Rlc1tpXSwgbmV4dEVudik7XG4gICAgfVxuICAgIHJldHVybiBuZXh0RW52O1xuICB9XG5cbiAgaWYgKHBhdHRlcm4ua2luZCA9PT0gXCJjdXJseVwiKSB7XG4gICAgaWYgKGlzQ3VybHlIZWFkKHBhdHRlcm4sIFwiJHJcIikpIHJldHVybiBtYXRjaFJlZ3VsYXIodmFsdWUsIHBhdHRlcm4sIGVudik7XG4gICAgaWYgKGlzQ3VybHlIZWFkKHBhdHRlcm4sIFwiJHR5cGVcIikpIHJldHVybiBtYXRjaFR5cGVDdG9yKHZhbHVlLCBwYXR0ZXJuLCBlbnYpO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4ua2luZCA9PT0gXCJiaW5vcFwiKSB7XG4gICAgY29uc3QgYm9wID0gcGF0dGVybiBhcyBCaW5PcE5vZGU7XG5cbiAgICBpZiAoYm9wLm9wID09PSBcInxcIikge1xuICAgICAgcmV0dXJuIG1hdGNoV2l0aEVudih2YWx1ZSwgYm9wLmxlZnQsIHsgLi4uZW52IH0pID8/IG1hdGNoV2l0aEVudih2YWx1ZSwgYm9wLnJpZ2h0LCB7IC4uLmVudiB9KTtcbiAgICB9XG5cbiAgICBpZiAoYm9wLm9wID09PSBcIiZcIikge1xuICAgICAgY29uc3QgbGVmdCA9IG1hdGNoV2l0aEVudih2YWx1ZSwgYm9wLmxlZnQsIHsgLi4uZW52IH0pO1xuICAgICAgaWYgKCFsZWZ0KSByZXR1cm4gbnVsbDtcbiAgICAgIHJldHVybiBtYXRjaFdpdGhFbnYodmFsdWUsIGJvcC5yaWdodCwgbGVmdCk7XG4gICAgfVxuXG4gICAgaWYgKGJvcC5vcCA9PT0gXCI6XCIgJiYgaXNJZGVudChib3AubGVmdCwgXCJfXCIpICYmIGJvcC5yaWdodC5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgICAgcmV0dXJuIGNoZWNrVHlwZSh2YWx1ZSwgYm9wLnJpZ2h0LnZhbHVlKSA/IGVudiA6IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKGJvcC5vcCA9PT0gXCI9XCIpIHtcbiAgICAgIGlmIChib3AubGVmdC5raW5kICE9PSBcImlkZW50aWZpZXJcIikgcmV0dXJuIG51bGw7XG4gICAgICBjb25zdCBtYXRjaGVkID0gbWF0Y2hXaXRoRW52KHZhbHVlLCBib3AucmlnaHQsIHsgLi4uZW52IH0pO1xuICAgICAgaWYgKCFtYXRjaGVkKSByZXR1cm4gbnVsbDtcbiAgICAgIG1hdGNoZWRbYm9wLmxlZnQudmFsdWVdID0gdmFsdWU7XG4gICAgICByZXR1cm4gbWF0Y2hlZDtcbiAgICB9XG5cbiAgICByZXR1cm4gZXZhbFdpdGhWYWx1ZShib3AsIHZhbHVlKSA/IGVudiA6IG51bGw7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNDdXJseUhlYWQobjogQ3VybHlCcmFja2V0c05vZGUsIHdhbnRlZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBuLm5vZGVzLmxlbmd0aCA+IDAgJiYgbi5ub2Rlc1swXS5raW5kID09PSBcImlkZW50aWZpZXJcIiAmJiBuLm5vZGVzWzBdLnZhbHVlID09PSB3YW50ZWQ7XG59XG5cbmZ1bmN0aW9uIGNoZWNrVHlwZSh2YWx1ZTogdW5rbm93biwgdHlwZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAodHlwZU5hbWUgPT09IFwic3RyXCIgfHwgdHlwZU5hbWUgPT09IFwic3RyaW5nXCIpIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCI7XG4gIGlmICh0eXBlTmFtZSA9PT0gXCJpbnRcIikgcmV0dXJuIE51bWJlci5pc0ludGVnZXIodmFsdWUpO1xuICBpZiAodHlwZU5hbWUgPT09IFwiZmxvYXRcIiB8fCB0eXBlTmFtZSA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIjtcbiAgaWYgKHR5cGVOYW1lID09PSBcImJvb2xcIiB8fCB0eXBlTmFtZSA9PT0gXCJib29sZWFuXCIpIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwiYm9vbGVhblwiO1xuICBpZiAodHlwZU5hbWUgPT09IFwibGlzdFwiIHx8IHR5cGVOYW1lID09PSBcImFycmF5XCIpIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKTtcbiAgaWYgKHR5cGVOYW1lID09PSBcImRpY3RcIiB8fCB0eXBlTmFtZSA9PT0gXCJvYmplY3RcIikgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHZhbHVlKTtcbiAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIikge1xuICAgIGNvbnN0IGN0b3JOYW1lID0gKHZhbHVlIGFzIHsgY29uc3RydWN0b3I/OiB7IG5hbWU/OiBzdHJpbmcgfSB9KS5jb25zdHJ1Y3Rvcj8ubmFtZTtcbiAgICBpZiAoY3Rvck5hbWUgPT09IHR5cGVOYW1lKSByZXR1cm4gdHJ1ZTtcbiAgfVxuICBjb25zdCBjdG9yID0gKGdsb2JhbFRoaXMgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW3R5cGVOYW1lXTtcbiAgcmV0dXJuIHR5cGVvZiBjdG9yID09PSBcImZ1bmN0aW9uXCIgJiYgdmFsdWUgaW5zdGFuY2VvZiAoY3RvciBhcyBuZXcgKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bik7XG59XG5cbmZ1bmN0aW9uIGV2YWxXaXRoVmFsdWUobm9kZTogTm9kZSwgdmFsdWU6IHVua25vd24pOiB1bmtub3duIHtcbiAgaWYgKGlzSWRlbnQobm9kZSwgXCIkXCIpKSByZXR1cm4gdmFsdWU7XG4gIGlmIChub2RlLmtpbmQgPT09IFwiaWRlbnRpZmllclwiKSB7XG4gICAgaWYgKG5vZGUudmFsdWUgPT09IFwidHJ1ZVwiKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAobm9kZS52YWx1ZSA9PT0gXCJmYWxzZVwiKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5vZGUudmFsdWUgPT09IFwibnVsbFwiKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gbm9kZS52YWx1ZTtcbiAgfVxuICBpZiAobm9kZS5raW5kID09PSBcIm51bWJlclwiKSByZXR1cm4gTnVtYmVyKG5vZGUudmFsdWUpO1xuICBpZiAobm9kZS5raW5kID09PSBcInN0cmluZ1wiKSByZXR1cm4gbm9kZS52YWx1ZTtcblxuICBpZiAobm9kZS5raW5kID09PSBcImJpbm9wXCIpIHtcbiAgICBjb25zdCBsZWZ0ID0gZXZhbFdpdGhWYWx1ZShub2RlLmxlZnQsIHZhbHVlKTtcbiAgICBjb25zdCByaWdodCA9IGV2YWxXaXRoVmFsdWUobm9kZS5yaWdodCwgdmFsdWUpO1xuICAgIHN3aXRjaCAobm9kZS5vcCkge1xuICAgICAgY2FzZSBcIj09XCI6XG4gICAgICAgIHJldHVybiBsZWZ0ID09PSByaWdodDtcbiAgICAgIGNhc2UgXCIhPVwiOlxuICAgICAgICByZXR1cm4gbGVmdCAhPT0gcmlnaHQ7XG4gICAgICBjYXNlIFwiPFwiOlxuICAgICAgICByZXR1cm4gKGxlZnQgYXMgbnVtYmVyKSA8IChyaWdodCBhcyBudW1iZXIpO1xuICAgICAgY2FzZSBcIjw9XCI6XG4gICAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpIDw9IChyaWdodCBhcyBudW1iZXIpO1xuICAgICAgY2FzZSBcIj5cIjpcbiAgICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgPiAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICAgIGNhc2UgXCI+PVwiOlxuICAgICAgICByZXR1cm4gKGxlZnQgYXMgbnVtYmVyKSA+PSAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICAgIGNhc2UgXCIrXCI6XG4gICAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpICsgKHJpZ2h0IGFzIG51bWJlcik7XG4gICAgICBjYXNlIFwiLVwiOlxuICAgICAgICByZXR1cm4gKGxlZnQgYXMgbnVtYmVyKSAtIChyaWdodCBhcyBudW1iZXIpO1xuICAgICAgY2FzZSBcIipcIjpcbiAgICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgKiAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICAgIGNhc2UgXCIvXCI6XG4gICAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpIC8gKHJpZ2h0IGFzIG51bWJlcik7XG4gICAgICBjYXNlIFwiJVwiOlxuICAgICAgICByZXR1cm4gKGxlZnQgYXMgbnVtYmVyKSAlIChyaWdodCBhcyBudW1iZXIpO1xuICAgICAgY2FzZSBcIiYmXCI6XG4gICAgICAgIHJldHVybiBCb29sZWFuKGxlZnQpICYmIEJvb2xlYW4ocmlnaHQpO1xuICAgICAgY2FzZSBcInx8XCI6XG4gICAgICAgIHJldHVybiBCb29sZWFuKGxlZnQpIHx8IEJvb2xlYW4ocmlnaHQpO1xuICAgICAgY2FzZSBcIi5cIjpcbiAgICAgICAgcmV0dXJuIChsZWZ0IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVtTdHJpbmcocmlnaHQpXTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZiAobm9kZS5raW5kID09PSBcInJvdW5kXCIpIHtcbiAgICBpZiAobm9kZS5ub2Rlcy5sZW5ndGggPT09IDEpIHJldHVybiBldmFsV2l0aFZhbHVlKG5vZGUubm9kZXNbMF0sIHZhbHVlKTtcbiAgICByZXR1cm4gbm9kZS5ub2Rlcy5tYXAoKG4pID0+IGV2YWxXaXRoVmFsdWUobiwgdmFsdWUpKTtcbiAgfVxuXG4gIGlmIChub2RlLmtpbmQgPT09IFwic3F1YXJlXCIpIHtcbiAgICByZXR1cm4gbm9kZS5ub2Rlcy5tYXAoKG4pID0+IGV2YWxXaXRoVmFsdWUobiwgdmFsdWUpKTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBtYXRjaFJlZ3VsYXIodmFsdWU6IHVua25vd24sIHBhdHRlcm46IEN1cmx5QnJhY2tldHNOb2RlLCBlbnY6IEVudik6IEVudiB8IG51bGwge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcGFydHMgPSBwYXR0ZXJuLm5vZGVzLnNsaWNlKDEpO1xuXG4gIGNvbnN0IG1hdGNoZXNQYXJ0ID0gKHY6IHVua25vd24sIHA6IE5vZGUpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gISFtYXRjaFdpdGhFbnYodiwgcCwge30pO1xuICB9O1xuXG4gIGNvbnN0IHF1YW50Qm91bmRzID0gKHE6IE5vZGUpOiBbbnVtYmVyLCBudW1iZXIgfCBudWxsXSB8IG51bGwgPT4ge1xuICAgIGlmIChxLmtpbmQgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgIGNvbnN0IG4gPSBOdW1iZXIocS52YWx1ZSk7XG4gICAgICBpZiAoIU51bWJlci5pc0Zpbml0ZShuKSkgcmV0dXJuIG51bGw7XG4gICAgICByZXR1cm4gW24sIG5dO1xuICAgIH1cbiAgICBpZiAocS5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgICAgY29uc3Qga2V5ID0gcS52YWx1ZS5zdGFydHNXaXRoKFwiJFwiKSA/IHEudmFsdWUuc2xpY2UoMSkgOiBxLnZhbHVlO1xuICAgICAgaWYgKGtleSA9PT0gXCJtYXliZVwiKSByZXR1cm4gWzAsIDFdO1xuICAgICAgaWYgKGtleSA9PT0gXCJzb21lXCIpIHJldHVybiBbMSwgbnVsbF07XG4gICAgICBpZiAoa2V5ID09PSBcImFueVwiKSByZXR1cm4gWzAsIG51bGxdO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChxLmtpbmQgPT09IFwicm91bmRcIiAmJiBxLm5vZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIHF1YW50Qm91bmRzKHEubm9kZXNbMF0pO1xuICAgIH1cbiAgICBpZiAocS5raW5kID09PSBcImJpbm9wXCIgJiYgcS5vcCA9PT0gXCIuLlwiICYmIHEubGVmdC5raW5kID09PSBcIm51bWJlclwiICYmIHEucmlnaHQua2luZCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgcmV0dXJuIFtOdW1iZXIocS5sZWZ0LnZhbHVlKSwgTnVtYmVyKHEucmlnaHQudmFsdWUpXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgY29uc3Qgc3RlcCA9ICh2aTogbnVtYmVyLCBwaTogbnVtYmVyKTogYm9vbGVhbiA9PiB7XG4gICAgaWYgKHBpID49IHBhcnRzLmxlbmd0aCkgcmV0dXJuIHZpID09PSB2YWx1ZS5sZW5ndGg7XG4gICAgY29uc3QgcCA9IHBhcnRzW3BpXTtcblxuICAgIGlmIChwLmtpbmQgPT09IFwiaWRlbnRpZmllclwiICYmIHAudmFsdWUgPT09IFwiJHJlc3RcIikgcmV0dXJuIHRydWU7XG5cbiAgICBpZiAocC5raW5kID09PSBcImJpbm9wXCIgJiYgcC5vcCA9PT0gXCIqXCIpIHtcbiAgICAgIGNvbnN0IGIgPSBxdWFudEJvdW5kcyhwLmxlZnQpO1xuICAgICAgaWYgKCFiKSByZXR1cm4gZmFsc2U7XG4gICAgICBjb25zdCBbbWluQ291bnQsIG1heENvdW50XSA9IGI7XG4gICAgICBjb25zdCBtYXhUcnkgPSBtYXhDb3VudCA9PT0gbnVsbCA/IHZhbHVlLmxlbmd0aCAtIHZpIDogTWF0aC5taW4obWF4Q291bnQsIHZhbHVlLmxlbmd0aCAtIHZpKTtcbiAgICAgIGZvciAobGV0IGNvdW50ID0gbWluQ291bnQ7IGNvdW50IDw9IG1heFRyeTsgY291bnQgKz0gMSkge1xuICAgICAgICBsZXQgb2sgPSB0cnVlO1xuICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IGNvdW50OyBrICs9IDEpIHtcbiAgICAgICAgICBpZiAoIW1hdGNoZXNQYXJ0KHZhbHVlW3ZpICsga10sIHAucmlnaHQpKSB7XG4gICAgICAgICAgICBvayA9IGZhbHNlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChvayAmJiBzdGVwKHZpICsgY291bnQsIHBpICsgMSkpIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICh2aSA+PSB2YWx1ZS5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIW1hdGNoZXNQYXJ0KHZhbHVlW3ZpXSwgcCkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gc3RlcCh2aSArIDEsIHBpICsgMSk7XG4gIH07XG5cbiAgcmV0dXJuIHN0ZXAoMCwgMCkgPyBlbnYgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBtYXRjaFR5cGVDdG9yKHZhbHVlOiB1bmtub3duLCBwYXR0ZXJuOiBDdXJseUJyYWNrZXRzTm9kZSwgZW52OiBFbnYpOiBFbnYgfCBudWxsIHtcbiAgaWYgKHBhdHRlcm4ubm9kZXMubGVuZ3RoIDwgMikgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHR5cGVOb2RlID0gcGF0dGVybi5ub2Rlc1sxXTtcbiAgaWYgKHR5cGVOb2RlLmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSByZXR1cm4gbnVsbDtcbiAgaWYgKCFjaGVja1R5cGUodmFsdWUsIHR5cGVOb2RlLnZhbHVlKSkgcmV0dXJuIG51bGw7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiKSByZXR1cm4gZW52O1xuXG4gIGxldCBwb3NpdGlvbmFsOiBOb2RlW10gfCBudWxsID0gbnVsbDtcbiAgY29uc3Qga2V5d29yZHM6IEFycmF5PHsga2V5OiBzdHJpbmc7IHBhdHQ6IE5vZGUgfT4gPSBbXTtcblxuICBmb3IgKGNvbnN0IGV4dHJhIG9mIHBhdHRlcm4ubm9kZXMuc2xpY2UoMikpIHtcbiAgICBpZiAoZXh0cmEua2luZCAhPT0gXCJzcXVhcmVcIikgcmV0dXJuIG51bGw7XG4gICAgaWYgKGV4dHJhLm5vZGVzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XG5cbiAgICBjb25zdCBhbGxLdyA9IGV4dHJhLm5vZGVzLmV2ZXJ5KCh4KSA9PiB4LmtpbmQgPT09IFwiYmlub3BcIiAmJiB4Lm9wID09PSBcIj1cIiAmJiB4LmxlZnQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpO1xuICAgIGNvbnN0IGFueUt3ID0gZXh0cmEubm9kZXMuc29tZSgoeCkgPT4geC5raW5kID09PSBcImJpbm9wXCIgJiYgeC5vcCA9PT0gXCI9XCIpO1xuXG4gICAgaWYgKGFueUt3ICYmICFhbGxLdykgcmV0dXJuIG51bGw7XG4gICAgaWYgKGFsbEt3KSB7XG4gICAgICBmb3IgKGNvbnN0IG4gb2YgZXh0cmEubm9kZXMpIHtcbiAgICAgICAgY29uc3QgYiA9IG4gYXMgQmluT3BOb2RlO1xuICAgICAgICBrZXl3b3Jkcy5wdXNoKHsga2V5OiAoYi5sZWZ0IGFzIElkZW50aWZpZXJOb2RlKS52YWx1ZSwgcGF0dDogYi5yaWdodCB9KTtcbiAgICAgIH1cbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAocG9zaXRpb25hbCkgcmV0dXJuIG51bGw7XG4gICAgcG9zaXRpb25hbCA9IGV4dHJhLm5vZGVzO1xuICB9XG5cbiAgaWYgKHBvc2l0aW9uYWwpIHtcbiAgICBjb25zdCBtYXliZU1hdGNoQXJncyA9ICh2YWx1ZSBhcyB7IF9fbWF0Y2hfYXJnc19fPzogdW5rbm93biB9KS5fX21hdGNoX2FyZ3NfXztcbiAgICBjb25zdCBtYXRjaEFyZ3MgPSBBcnJheS5pc0FycmF5KG1heWJlTWF0Y2hBcmdzKVxuICAgICAgPyBtYXliZU1hdGNoQXJncy5maWx0ZXIoKHgpOiB4IGlzIHN0cmluZyA9PiB0eXBlb2YgeCA9PT0gXCJzdHJpbmdcIilcbiAgICAgIDogT2JqZWN0LmtleXModmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pO1xuICAgIGlmIChtYXRjaEFyZ3MubGVuZ3RoIDwgcG9zaXRpb25hbC5sZW5ndGgpIHJldHVybiBudWxsO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcG9zaXRpb25hbC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgY29uc3Qga2V5ID0gbWF0Y2hBcmdzW2ldO1xuICAgICAgY29uc3QgdiA9ICh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilba2V5XTtcbiAgICAgIGlmICghbWF0Y2hXaXRoRW52KHYsIHBvc2l0aW9uYWxbaV0sIHsgLi4uZW52IH0pKSByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IGt3IG9mIGtleXdvcmRzKSB7XG4gICAgY29uc3QgdiA9ICh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilba3cua2V5XTtcbiAgICBpZiAoIW1hdGNoV2l0aEVudih2LCBrdy5wYXR0LCB7IC4uLmVudiB9KSkgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gZW52O1xufVxuIiwKICAiaW1wb3J0IHsgY29tcGlsZVRvSnMgfSBmcm9tIFwiLi9jb21waWxlclwiO1xuaW1wb3J0IHsgbWF0Y2hQYXR0ZXJuIH0gZnJvbSBcIi4vcGF0dGVyblwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJyb3dzZXJSdW5PcHRpb25zIHtcbiAgc2NvcGU/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVGb3JCcm93c2VyKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbXBpbGVUb0pzKHNyYyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5JbkJyb3dzZXIoc3JjOiBzdHJpbmcsIG9wdGlvbnM6IEJyb3dzZXJSdW5PcHRpb25zID0ge30pOiB1bmtub3duIHtcbiAgY29uc3Qgc2NvcGUgPSBvcHRpb25zLnNjb3BlID8/IHt9O1xuICBjb25zdCBmbiA9IG5ldyBGdW5jdGlvbihcbiAgICBcIl9fc2NvcGVcIixcbiAgICBcIl9fbWFrcmVsbF9tYXRjaFBhdHRlcm5cIixcbiAgICBgY29uc3QgX19tcl9tYXRjaFBhdHRlcm4gPSBfX21ha3JlbGxfbWF0Y2hQYXR0ZXJuOyB3aXRoIChfX3Njb3BlKSB7IHJldHVybiAke2NvbXBpbGVUb0pzKHNyYyl9OyB9YCxcbiAgKSBhcyAoc2NvcGVPYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBtYXRjaGVyOiB0eXBlb2YgbWF0Y2hQYXR0ZXJuKSA9PiB1bmtub3duO1xuICByZXR1cm4gZm4oc2NvcGUsIG1hdGNoUGF0dGVybik7XG59XG4iCiAg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RyxXQUFPO0FBQzlDLE9BQUssZ0JBQWdCLFVBQVU7QUFBVSxXQUFPO0FBRWhELE1BQUksYUFBNEI7QUFDaEMsUUFBTSxXQUErQyxDQUFDO0FBRXRELGFBQVcsU0FBUyxRQUFRLE1BQU0sTUFBTSxDQUFDLEdBQUc7QUFDMUMsUUFBSSxNQUFNLFNBQVM7QUFBVSxhQUFPO0FBQ3BDLFFBQUksTUFBTSxNQUFNLFdBQVc7QUFBRztBQUU5QixVQUFNLFFBQVEsTUFBTSxNQUFNLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxXQUFXLEVBQUUsT0FBTyxPQUFPLEVBQUUsS0FBSyxTQUFTLFlBQVk7QUFDekcsVUFBTSxRQUFRLE1BQU0sTUFBTSxLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsV0FBVyxFQUFFLE9BQU8sR0FBRztBQUV4RSxRQUFJLFVBQVU7QUFBTyxhQUFPO0FBQzVCLFFBQUksT0FBTztBQUNULGlCQUFXLEtBQUssTUFBTSxPQUFPO0FBQzNCLGNBQU0sSUFBSTtBQUNWLGlCQUFTLEtBQUssRUFBRSxLQUFNLEVBQUUsS0FBd0IsT0FBTyxNQUFNLEVBQUUsTUFBTSxDQUFDO0FBQUEsTUFDeEU7QUFDQTtBQUFBLElBQ0Y7QUFDQSxRQUFJO0FBQVksYUFBTztBQUN2QixpQkFBYSxNQUFNO0FBQUEsRUFDckI7QUFFQSxNQUFJLFlBQVk7QUFDZCxVQUFNLGlCQUFrQixNQUF1QztBQUMvRCxVQUFNLFlBQVksTUFBTSxRQUFRLGNBQWMsSUFDMUMsZUFBZSxPQUFPLENBQUMsYUFBMEIsTUFBTSxRQUFRLElBQy9ELE9BQU8sS0FBSyxLQUFnQztBQUNoRCxRQUFJLFVBQVUsU0FBUyxXQUFXO0FBQVEsYUFBTztBQUNqRCxhQUFTLElBQUksRUFBRyxJQUFJLFdBQVcsUUFBUSxLQUFLLEdBQUc7QUFDN0MsWUFBTSxNQUFNLFVBQVU7QUFDdEIsWUFBTSxJQUFLLE1BQWtDO0FBQzdDLFdBQUssYUFBYSxHQUFHLFdBQVcsSUFBSSxLQUFLLElBQUksQ0FBQztBQUFHLGVBQU87QUFBQSxJQUMxRDtBQUFBLEVBQ0Y7QUFFQSxhQUFXLE1BQU0sVUFBVTtBQUN6QixVQUFNLElBQUssTUFBa0MsR0FBRztBQUNoRCxTQUFLLGFBQWEsR0FBRyxHQUFHLE1BQU0sS0FBSyxJQUFJLENBQUM7QUFBRyxhQUFPO0FBQUEsRUFDcEQ7QUFFQSxTQUFPO0FBQUE7QUF0UlQsSUFBTSxlQUE4QixDQUFDOzs7QUNIOUIsU0FBUyxpQkFBaUIsQ0FBQyxLQUFxQjtBQUNyRCxTQUFPLFlBQVksR0FBRztBQUFBO0FBR2pCLFNBQVMsWUFBWSxDQUFDLEtBQWEsVUFBNkIsQ0FBQyxHQUFZO0FBQ2xGLFFBQU0sUUFBUSxRQUFRLFNBQVMsQ0FBQztBQUNoQyxRQUFNLEtBQUssSUFBSSxTQUNiLFdBQ0EsMEJBQ0EsNkVBQTZFLFlBQVksR0FBRyxNQUM5RjtBQUNBLFNBQU8sR0FBRyxPQUFPLFlBQVk7QUFBQTsiLAogICJkZWJ1Z0lkIjogIjVCQzFEQ0M2QkJDQTU1QzU2NDc1NmUyMTY0NzU2ZTIxIiwKICAibmFtZXMiOiBbXQp9
