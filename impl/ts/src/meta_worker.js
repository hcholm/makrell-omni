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

// src/meta_worker.ts
self.onmessage = (ev) => {
  const msg = ev.data;
  let out;
  try {
    const result = evaluateSerializedMakrellMacro(msg.payload);
    out = { id: msg.id, ok: true, result };
  } catch (err) {
    out = { id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(out);
};

//# debugId=7A909E239BB8A9CC64756e2164756e21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi5cXC4uXFxzcmNcXGFzdC50cyIsICIuLlxcLi5cXHNyY1xcdG9rZW5pemVyLnRzIiwgIi4uXFwuLlxcc3JjXFxwYXJzZXIudHMiLCAiLi5cXC4uXFxzcmNcXG1hY3Jvcy50cyIsICIuLlxcLi5cXHNyY1xcbWV0YV93b3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiZXhwb3J0IHR5cGUgTm9kZSA9XG4gIHwgSWRlbnRpZmllck5vZGVcbiAgfCBTdHJpbmdOb2RlXG4gIHwgTnVtYmVyTm9kZVxuICB8IE9wZXJhdG9yTm9kZVxuICB8IEJpbk9wTm9kZVxuICB8IFJvdW5kQnJhY2tldHNOb2RlXG4gIHwgU3F1YXJlQnJhY2tldHNOb2RlXG4gIHwgQ3VybHlCcmFja2V0c05vZGVcbiAgfCBTZXF1ZW5jZU5vZGU7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmFzZU5vZGUge1xuICBraW5kOiBzdHJpbmc7XG4gIGxvYz86IFNvdXJjZVNwYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU291cmNlUG9zIHtcbiAgaW5kZXg6IG51bWJlcjtcbiAgbGluZTogbnVtYmVyO1xuICBjb2x1bW46IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTb3VyY2VTcGFuIHtcbiAgc3RhcnQ6IFNvdXJjZVBvcztcbiAgZW5kOiBTb3VyY2VQb3M7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSWRlbnRpZmllck5vZGUgZXh0ZW5kcyBCYXNlTm9kZSB7XG4gIGtpbmQ6IFwiaWRlbnRpZmllclwiO1xuICB2YWx1ZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0cmluZ05vZGUgZXh0ZW5kcyBCYXNlTm9kZSB7XG4gIGtpbmQ6IFwic3RyaW5nXCI7XG4gIHZhbHVlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTnVtYmVyTm9kZSBleHRlbmRzIEJhc2VOb2RlIHtcbiAga2luZDogXCJudW1iZXJcIjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPcGVyYXRvck5vZGUgZXh0ZW5kcyBCYXNlTm9kZSB7XG4gIGtpbmQ6IFwib3BlcmF0b3JcIjtcbiAgdmFsdWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBCaW5PcE5vZGUgZXh0ZW5kcyBCYXNlTm9kZSB7XG4gIGtpbmQ6IFwiYmlub3BcIjtcbiAgbGVmdDogTm9kZTtcbiAgb3A6IHN0cmluZztcbiAgcmlnaHQ6IE5vZGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUm91bmRCcmFja2V0c05vZGUgZXh0ZW5kcyBCYXNlTm9kZSB7XG4gIGtpbmQ6IFwicm91bmRcIjtcbiAgbm9kZXM6IE5vZGVbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTcXVhcmVCcmFja2V0c05vZGUgZXh0ZW5kcyBCYXNlTm9kZSB7XG4gIGtpbmQ6IFwic3F1YXJlXCI7XG4gIG5vZGVzOiBOb2RlW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3VybHlCcmFja2V0c05vZGUgZXh0ZW5kcyBCYXNlTm9kZSB7XG4gIGtpbmQ6IFwiY3VybHlcIjtcbiAgbm9kZXM6IE5vZGVbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZXF1ZW5jZU5vZGUgZXh0ZW5kcyBCYXNlTm9kZSB7XG4gIGtpbmQ6IFwic2VxdWVuY2VcIjtcbiAgbm9kZXM6IE5vZGVbXTtcbn1cblxuZXhwb3J0IGNvbnN0IGlkZW50ID0gKHZhbHVlOiBzdHJpbmcsIGxvYz86IFNvdXJjZVNwYW4pOiBJZGVudGlmaWVyTm9kZSA9PiAoeyBraW5kOiBcImlkZW50aWZpZXJcIiwgdmFsdWUsIGxvYyB9KTtcbmV4cG9ydCBjb25zdCBudW0gPSAodmFsdWU6IHN0cmluZywgbG9jPzogU291cmNlU3Bhbik6IE51bWJlck5vZGUgPT4gKHsga2luZDogXCJudW1iZXJcIiwgdmFsdWUsIGxvYyB9KTtcbmV4cG9ydCBjb25zdCBzdHIgPSAodmFsdWU6IHN0cmluZywgbG9jPzogU291cmNlU3Bhbik6IFN0cmluZ05vZGUgPT4gKHsga2luZDogXCJzdHJpbmdcIiwgdmFsdWUsIGxvYyB9KTtcbmV4cG9ydCBjb25zdCBvcCA9ICh2YWx1ZTogc3RyaW5nLCBsb2M/OiBTb3VyY2VTcGFuKTogT3BlcmF0b3JOb2RlID0+ICh7IGtpbmQ6IFwib3BlcmF0b3JcIiwgdmFsdWUsIGxvYyB9KTtcbmV4cG9ydCBjb25zdCBiaW4gPSAobGVmdDogTm9kZSwgb3BlcmF0b3I6IHN0cmluZywgcmlnaHQ6IE5vZGUsIGxvYz86IFNvdXJjZVNwYW4pOiBCaW5PcE5vZGUgPT4gKHtcbiAga2luZDogXCJiaW5vcFwiLFxuICBsZWZ0LFxuICBvcDogb3BlcmF0b3IsXG4gIHJpZ2h0LFxuICBsb2MsXG59KTtcbmV4cG9ydCBjb25zdCBjdXJseSA9IChub2RlczogTm9kZVtdLCBsb2M/OiBTb3VyY2VTcGFuKTogQ3VybHlCcmFja2V0c05vZGUgPT4gKHsga2luZDogXCJjdXJseVwiLCBub2RlcywgbG9jIH0pO1xuZXhwb3J0IGNvbnN0IHNxdWFyZSA9IChub2RlczogTm9kZVtdLCBsb2M/OiBTb3VyY2VTcGFuKTogU3F1YXJlQnJhY2tldHNOb2RlID0+ICh7IGtpbmQ6IFwic3F1YXJlXCIsIG5vZGVzLCBsb2MgfSk7XG5leHBvcnQgY29uc3Qgcm91bmQgPSAobm9kZXM6IE5vZGVbXSwgbG9jPzogU291cmNlU3Bhbik6IFJvdW5kQnJhY2tldHNOb2RlID0+ICh7IGtpbmQ6IFwicm91bmRcIiwgbm9kZXMsIGxvYyB9KTtcblxuZXhwb3J0IGNvbnN0IGlzSWRlbnQgPSAobjogTm9kZSwgd2FudGVkPzogc3RyaW5nKTogbiBpcyBJZGVudGlmaWVyTm9kZSA9PiB7XG4gIHJldHVybiBuLmtpbmQgPT09IFwiaWRlbnRpZmllclwiICYmICh3YW50ZWQgPT09IHVuZGVmaW5lZCB8fCBuLnZhbHVlID09PSB3YW50ZWQpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzTm9kZSh2OiB1bmtub3duKTogdiBpcyBOb2RlIHtcbiAgaWYgKCF2IHx8IHR5cGVvZiB2ICE9PSBcIm9iamVjdFwiKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGsgPSAodiBhcyB7IGtpbmQ/OiB1bmtub3duIH0pLmtpbmQ7XG4gIHJldHVybiB0eXBlb2YgayA9PT0gXCJzdHJpbmdcIjtcbn1cbiIsCiAgImltcG9ydCB7IE5vZGUsIFNvdXJjZVBvcywgU291cmNlU3BhbiwgaWRlbnQsIG51bSwgb3AsIHN0ciB9IGZyb20gXCIuL2FzdFwiO1xuXG5jb25zdCBtdWx0aU9wcyA9IFtcIj09XCIsIFwiIT1cIiwgXCI8PVwiLCBcIj49XCIsIFwiJiZcIiwgXCJ8fFwiLCBcIi0+XCIsIFwiKipcIiwgXCIuLlwiXTtcbmNvbnN0IHNpbmdsZU9wcyA9IG5ldyBTZXQoXCIrLSovJT08PnwmLjpAJ1xcXFxcIi5zcGxpdChcIlwiKSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnJhY2tldFRva2VuIHtcbiAga2luZDogXCJscGFyXCIgfCBcInJwYXJcIjtcbiAgdmFsdWU6IHN0cmluZztcbiAgbG9jOiBTb3VyY2VTcGFuO1xufVxuXG50eXBlIFRvayA9IE5vZGUgfCBCcmFja2V0VG9rZW47XG5cbmZ1bmN0aW9uIGlzU3BhY2UoY2g6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gY2ggPT09IFwiIFwiIHx8IGNoID09PSBcIlxcblwiIHx8IGNoID09PSBcIlxcdFwiIHx8IGNoID09PSBcIlxcclwiO1xufVxuXG5mdW5jdGlvbiBpc0lkZW50U3RhcnQoY2g6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL1tBLVphLXpfJF0vLnRlc3QoY2gpO1xufVxuXG5mdW5jdGlvbiBpc0lkZW50Qm9keShjaDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvW0EtWmEtejAtOV8kXS8udGVzdChjaCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbml6ZShzcmM6IHN0cmluZyk6IFRva1tdIHtcbiAgY29uc3Qgb3V0OiBUb2tbXSA9IFtdO1xuICBsZXQgaSA9IDA7XG4gIGxldCBsaW5lID0gMTtcbiAgbGV0IGNvbHVtbiA9IDE7XG5cbiAgY29uc3QgcG9zID0gKCk6IFNvdXJjZVBvcyA9PiAoeyBpbmRleDogaSwgbGluZSwgY29sdW1uIH0pO1xuICBjb25zdCBzcGFuID0gKHN0YXJ0OiBTb3VyY2VQb3MsIGVuZDogU291cmNlUG9zKTogU291cmNlU3BhbiA9PiAoeyBzdGFydCwgZW5kIH0pO1xuICBjb25zdCBhZHZhbmNlID0gKGNvdW50ID0gMSk6IHZvaWQgPT4ge1xuICAgIGZvciAobGV0IGsgPSAwOyBrIDwgY291bnQ7IGsgKz0gMSkge1xuICAgICAgY29uc3QgY2ggPSBzcmNbaV07XG4gICAgICBpICs9IDE7XG4gICAgICBpZiAoY2ggPT09IFwiXFxuXCIpIHtcbiAgICAgICAgbGluZSArPSAxO1xuICAgICAgICBjb2x1bW4gPSAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29sdW1uICs9IDE7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHdoaWxlIChpIDwgc3JjLmxlbmd0aCkge1xuICAgIGNvbnN0IGNoID0gc3JjW2ldO1xuXG4gICAgaWYgKGlzU3BhY2UoY2gpKSB7XG4gICAgICBhZHZhbmNlKDEpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGNoID09PSBcIiNcIikge1xuICAgICAgd2hpbGUgKGkgPCBzcmMubGVuZ3RoICYmIHNyY1tpXSAhPT0gXCJcXG5cIikgYWR2YW5jZSgxKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaCA9PT0gJ1wiJykge1xuICAgICAgY29uc3Qgc3RhcnQgPSBwb3MoKTtcbiAgICAgIGxldCBqID0gaSArIDE7XG4gICAgICBsZXQgZXNjYXBlZCA9IGZhbHNlO1xuICAgICAgd2hpbGUgKGogPCBzcmMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IGMgPSBzcmNbal07XG4gICAgICAgIGlmICghZXNjYXBlZCAmJiBjID09PSAnXCInKSBicmVhaztcbiAgICAgICAgZXNjYXBlZCA9ICFlc2NhcGVkICYmIGMgPT09IFwiXFxcXFwiO1xuICAgICAgICBpZiAoYyAhPT0gXCJcXFxcXCIpIGVzY2FwZWQgPSBmYWxzZTtcbiAgICAgICAgaiArPSAxO1xuICAgICAgfVxuICAgICAgaWYgKGogPj0gc3JjLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZyBsaXRlcmFsXCIpO1xuICAgICAgY29uc3QgdmFsdWUgPSBzcmMuc2xpY2UoaSArIDEsIGopO1xuICAgICAgYWR2YW5jZShqICsgMSAtIGkpO1xuICAgICAgb3V0LnB1c2goc3RyKHZhbHVlLCBzcGFuKHN0YXJ0LCBwb3MoKSkpKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjaCA9PT0gXCIoXCIgfHwgY2ggPT09IFwiW1wiIHx8IGNoID09PSBcIntcIikge1xuICAgICAgY29uc3Qgc3RhcnQgPSBwb3MoKTtcbiAgICAgIGFkdmFuY2UoMSk7XG4gICAgICBvdXQucHVzaCh7IGtpbmQ6IFwibHBhclwiLCB2YWx1ZTogY2gsIGxvYzogc3BhbihzdGFydCwgcG9zKCkpIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGNoID09PSBcIilcIiB8fCBjaCA9PT0gXCJdXCIgfHwgY2ggPT09IFwifVwiKSB7XG4gICAgICBjb25zdCBzdGFydCA9IHBvcygpO1xuICAgICAgYWR2YW5jZSgxKTtcbiAgICAgIG91dC5wdXNoKHsga2luZDogXCJycGFyXCIsIHZhbHVlOiBjaCwgbG9jOiBzcGFuKHN0YXJ0LCBwb3MoKSkgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXliZU9wMiA9IHNyYy5zbGljZShpLCBpICsgMik7XG4gICAgaWYgKG11bHRpT3BzLmluY2x1ZGVzKG1heWJlT3AyKSkge1xuICAgICAgY29uc3Qgc3RhcnQgPSBwb3MoKTtcbiAgICAgIGFkdmFuY2UoMik7XG4gICAgICBvdXQucHVzaChvcChtYXliZU9wMiwgc3BhbihzdGFydCwgcG9zKCkpKSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoc2luZ2xlT3BzLmhhcyhjaCkpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gcG9zKCk7XG4gICAgICBhZHZhbmNlKDEpO1xuICAgICAgb3V0LnB1c2gob3AoY2gsIHNwYW4oc3RhcnQsIHBvcygpKSkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKC9bMC05XS8udGVzdChjaCkgfHwgKGNoID09PSBcIi1cIiAmJiAvWzAtOV0vLnRlc3Qoc3JjW2kgKyAxXSA/PyBcIlwiKSkpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gcG9zKCk7XG4gICAgICBsZXQgaiA9IGk7XG4gICAgICBpZiAoc3JjW2pdID09PSBcIi1cIikgaiArPSAxO1xuICAgICAgd2hpbGUgKGogPCBzcmMubGVuZ3RoICYmIC9bMC05XS8udGVzdChzcmNbal0pKSBqICs9IDE7XG4gICAgICBpZiAoc3JjW2pdID09PSBcIi5cIiAmJiAvWzAtOV0vLnRlc3Qoc3JjW2ogKyAxXSA/PyBcIlwiKSkge1xuICAgICAgICBqICs9IDE7XG4gICAgICAgIHdoaWxlIChqIDwgc3JjLmxlbmd0aCAmJiAvWzAtOV0vLnRlc3Qoc3JjW2pdKSkgaiArPSAxO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWUgPSBzcmMuc2xpY2UoaSwgaik7XG4gICAgICBhZHZhbmNlKGogLSBpKTtcbiAgICAgIG91dC5wdXNoKG51bSh2YWx1ZSwgc3BhbihzdGFydCwgcG9zKCkpKSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoaXNJZGVudFN0YXJ0KGNoKSkge1xuICAgICAgY29uc3Qgc3RhcnQgPSBwb3MoKTtcbiAgICAgIGxldCBqID0gaSArIDE7XG4gICAgICB3aGlsZSAoaiA8IHNyYy5sZW5ndGggJiYgaXNJZGVudEJvZHkoc3JjW2pdKSkgaiArPSAxO1xuICAgICAgY29uc3QgdmFsdWUgPSBzcmMuc2xpY2UoaSwgaik7XG4gICAgICBhZHZhbmNlKGogLSBpKTtcbiAgICAgIG91dC5wdXNoKGlkZW50KHZhbHVlLCBzcGFuKHN0YXJ0LCBwb3MoKSkpKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCB0b2tlbiBuZWFyOiAke3NyYy5zbGljZShpLCBpICsgMTYpfWApO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cbiIsCiAgImltcG9ydCB7XG4gIEJpbk9wTm9kZSxcbiAgQ3VybHlCcmFja2V0c05vZGUsXG4gIE5vZGUsXG4gIE9wZXJhdG9yTm9kZSxcbiAgUm91bmRCcmFja2V0c05vZGUsXG4gIFNlcXVlbmNlTm9kZSxcbiAgU291cmNlUG9zLFxuICBTb3VyY2VTcGFuLFxuICBTcXVhcmVCcmFja2V0c05vZGUsXG59IGZyb20gXCIuL2FzdFwiO1xuaW1wb3J0IHsgQnJhY2tldFRva2VuLCB0b2tlbml6ZSB9IGZyb20gXCIuL3Rva2VuaXplclwiO1xuXG5jb25zdCBwcmVjZWRlbmNlOiBSZWNvcmQ8c3RyaW5nLCBbbnVtYmVyLCBcImxlZnRcIiB8IFwicmlnaHRcIl0+ID0ge1xuICBcIj1cIjogWzUsIFwicmlnaHRcIl0sXG4gIFwiLT5cIjogWzEwLCBcInJpZ2h0XCJdLFxuICBcInxcIjogWzIwLCBcImxlZnRcIl0sXG4gIFwifHxcIjogWzMwLCBcImxlZnRcIl0sXG4gIFwiJiZcIjogWzQwLCBcImxlZnRcIl0sXG4gIFwiPT1cIjogWzUwLCBcImxlZnRcIl0sXG4gIFwiIT1cIjogWzUwLCBcImxlZnRcIl0sXG4gIFwiPFwiOiBbNTUsIFwibGVmdFwiXSxcbiAgXCI8PVwiOiBbNTUsIFwibGVmdFwiXSxcbiAgXCI+XCI6IFs1NSwgXCJsZWZ0XCJdLFxuICBcIj49XCI6IFs1NSwgXCJsZWZ0XCJdLFxuICBcIjpcIjogWzU4LCBcImxlZnRcIl0sXG4gIFwiLi5cIjogWzYwLCBcImxlZnRcIl0sXG4gIFwiK1wiOiBbNzAsIFwibGVmdFwiXSxcbiAgXCItXCI6IFs3MCwgXCJsZWZ0XCJdLFxuICBcIipcIjogWzgwLCBcImxlZnRcIl0sXG4gIFwiL1wiOiBbODAsIFwibGVmdFwiXSxcbiAgXCIlXCI6IFs4MCwgXCJsZWZ0XCJdLFxuICBcIioqXCI6IFs5MCwgXCJyaWdodFwiXSxcbiAgXCJAXCI6IFs5NSwgXCJsZWZ0XCJdLFxuICBcIidcIjogWzEwMCwgXCJsZWZ0XCJdLFxuICBcIi5cIjogWzExMCwgXCJsZWZ0XCJdLFxufTtcblxuZnVuY3Rpb24gb3BJbmZvKG9wZXJhdG9yOiBzdHJpbmcpOiBbbnVtYmVyLCBcImxlZnRcIiB8IFwicmlnaHRcIl0ge1xuICByZXR1cm4gcHJlY2VkZW5jZVtvcGVyYXRvcl0gPz8gWzAsIFwibGVmdFwiXTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VMb2MoYT86IFNvdXJjZVNwYW4sIGI/OiBTb3VyY2VTcGFuKTogU291cmNlU3BhbiB8IHVuZGVmaW5lZCB7XG4gIGlmICghYSkgcmV0dXJuIGI7XG4gIGlmICghYikgcmV0dXJuIGE7XG4gIHJldHVybiB7IHN0YXJ0OiBhLnN0YXJ0LCBlbmQ6IGIuZW5kIH07XG59XG5cbmZ1bmN0aW9uIHJvb3RMb2MoKTogU291cmNlU3BhbiB7XG4gIGNvbnN0IHA6IFNvdXJjZVBvcyA9IHsgaW5kZXg6IDAsIGxpbmU6IDEsIGNvbHVtbjogMSB9O1xuICByZXR1cm4geyBzdGFydDogcCwgZW5kOiBwIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlQnJhY2tldHMoc3JjOiBzdHJpbmcpOiBTZXF1ZW5jZU5vZGUge1xuICBjb25zdCB0b2tzID0gdG9rZW5pemUoc3JjKTtcbiAgY29uc3Qgc3RhY2s6IEFycmF5PHtcbiAgICBub2RlOiBTZXF1ZW5jZU5vZGUgfCBSb3VuZEJyYWNrZXRzTm9kZSB8IFNxdWFyZUJyYWNrZXRzTm9kZSB8IEN1cmx5QnJhY2tldHNOb2RlO1xuICAgIG9wZW4/OiBCcmFja2V0VG9rZW47XG4gIH0+ID0gW3sgbm9kZTogeyBraW5kOiBcInNlcXVlbmNlXCIsIG5vZGVzOiBbXSwgbG9jOiByb290TG9jKCkgfSB9XTtcblxuICBjb25zdCBjbG9zZUZvcjogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCIoXCI6IFwiKVwiLCBcIltcIjogXCJdXCIsIFwie1wiOiBcIn1cIiB9O1xuXG4gIGZvciAoY29uc3QgdCBvZiB0b2tzKSB7XG4gICAgaWYgKHQua2luZCA9PT0gXCJscGFyXCIpIHtcbiAgICAgIGxldCBiOiBSb3VuZEJyYWNrZXRzTm9kZSB8IFNxdWFyZUJyYWNrZXRzTm9kZSB8IEN1cmx5QnJhY2tldHNOb2RlO1xuICAgICAgaWYgKHQudmFsdWUgPT09IFwiKFwiKSBiID0geyBraW5kOiBcInJvdW5kXCIsIG5vZGVzOiBbXSB9O1xuICAgICAgZWxzZSBpZiAodC52YWx1ZSA9PT0gXCJbXCIpIGIgPSB7IGtpbmQ6IFwic3F1YXJlXCIsIG5vZGVzOiBbXSB9O1xuICAgICAgZWxzZSBiID0geyBraW5kOiBcImN1cmx5XCIsIG5vZGVzOiBbXSB9O1xuICAgICAgc3RhY2sucHVzaCh7IG5vZGU6IGIsIG9wZW46IHQgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAodC5raW5kID09PSBcInJwYXJcIikge1xuICAgICAgaWYgKHN0YWNrLmxlbmd0aCA8PSAxKSB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgY2xvc2luZyBicmFja2V0ICR7dC52YWx1ZX1gKTtcbiAgICAgIGNvbnN0IGRvbmVGcmFtZSA9IHN0YWNrLnBvcCgpIGFzIHsgbm9kZTogTm9kZTsgb3BlbjogQnJhY2tldFRva2VuIH07XG4gICAgICBjb25zdCBleHBlY3RlZCA9IGNsb3NlRm9yW2RvbmVGcmFtZS5vcGVuLnZhbHVlXTtcbiAgICAgIGlmIChleHBlY3RlZCAhPT0gdC52YWx1ZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc21hdGNoZWQgY2xvc2luZyBicmFja2V0ICR7dC52YWx1ZX0sIGV4cGVjdGVkICR7ZXhwZWN0ZWR9YCk7XG4gICAgICB9XG4gICAgICBkb25lRnJhbWUubm9kZS5sb2MgPSB7XG4gICAgICAgIHN0YXJ0OiBkb25lRnJhbWUub3Blbi5sb2Muc3RhcnQsXG4gICAgICAgIGVuZDogdC5sb2MuZW5kLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHBhcmVudCA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdLm5vZGU7XG4gICAgICBwYXJlbnQubm9kZXMucHVzaChkb25lRnJhbWUubm9kZSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBzdGFja1tzdGFjay5sZW5ndGggLSAxXS5ub2RlLm5vZGVzLnB1c2godCk7XG4gIH1cblxuICBpZiAoc3RhY2subGVuZ3RoICE9PSAxKSB7XG4gICAgY29uc3QgbGFzdCA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgIGNvbnN0IHdoZXJlID0gbGFzdC5vcGVuPy5sb2NcbiAgICAgID8gYCBhdCBsaW5lICR7bGFzdC5vcGVuLmxvYy5zdGFydC5saW5lfSwgY29sICR7bGFzdC5vcGVuLmxvYy5zdGFydC5jb2x1bW59YFxuICAgICAgOiBcIlwiO1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5tYXRjaGVkIG9wZW5pbmcgYnJhY2tldCR7d2hlcmV9YCk7XG4gIH1cbiAgcmV0dXJuIHN0YWNrWzBdLm5vZGUgYXMgU2VxdWVuY2VOb2RlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb3BlcmF0b3JQYXJzZU5vZGVzKG5vZGVzOiBOb2RlW10pOiBOb2RlW10ge1xuICBjb25zdCBvdXRwdXQ6IE5vZGVbXSA9IFtdO1xuICBjb25zdCBvcHM6IE9wZXJhdG9yTm9kZVtdID0gW107XG4gIGxldCBsYXN0V2FzTm90T3AgPSB0cnVlO1xuXG4gIGNvbnN0IGhhc09wcyA9ICgpOiBib29sZWFuID0+IG9wcy5sZW5ndGggPiAwO1xuXG4gIGNvbnN0IGFwcGx5T25lID0gKCk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IHJpZ2h0ID0gb3V0cHV0LnBvcCgpO1xuICAgIGNvbnN0IGxlZnQgPSBvdXRwdXQucG9wKCk7XG4gICAgY29uc3Qgb3BlciA9IG9wcy5wb3AoKTtcbiAgICBpZiAoIWxlZnQgfHwgIXJpZ2h0IHx8ICFvcGVyKSB7XG4gICAgICBjb25zdCB3aGVyZSA9IG9wZXI/LmxvYyA/IGAgYXQgbGluZSAke29wZXIubG9jLnN0YXJ0LmxpbmV9LCBjb2wgJHtvcGVyLmxvYy5zdGFydC5jb2x1bW59YCA6IFwiXCI7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1hbGZvcm1lZCBleHByZXNzaW9uJHt3aGVyZX1gKTtcbiAgICB9XG4gICAgb3V0cHV0LnB1c2goe1xuICAgICAga2luZDogXCJiaW5vcFwiLFxuICAgICAgbGVmdCxcbiAgICAgIG9wOiBvcGVyLnZhbHVlLFxuICAgICAgcmlnaHQsXG4gICAgICBsb2M6IG1lcmdlTG9jKG1lcmdlTG9jKGxlZnQubG9jLCBvcGVyLmxvYyksIHJpZ2h0LmxvYyksXG4gICAgfSBhcyBCaW5PcE5vZGUpO1xuICB9O1xuXG4gIGNvbnN0IGFwcGx5QWxsID0gKCk6IHZvaWQgPT4ge1xuICAgIHdoaWxlIChoYXNPcHMoKSkgYXBwbHlPbmUoKTtcbiAgfTtcblxuICBmb3IgKGNvbnN0IG4gb2Ygbm9kZXMpIHtcbiAgICBpZiAobi5raW5kID09PSBcIm9wZXJhdG9yXCIpIHtcbiAgICAgIGNvbnN0IFtjdXJyZW50UHJpb10gPSBvcEluZm8obi52YWx1ZSk7XG4gICAgICBpZiAoIWhhc09wcygpKSB7XG4gICAgICAgIG9wcy5wdXNoKG4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2hpbGUgKGhhc09wcygpKSB7XG4gICAgICAgICAgY29uc3QgdG9wID0gb3BzW29wcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICBjb25zdCBbc3RhY2tQcmlvLCBzdGFja0Fzc29jXSA9IG9wSW5mbyh0b3AudmFsdWUpO1xuICAgICAgICAgIGlmIChzdGFja1ByaW8gPiBjdXJyZW50UHJpbyB8fCAoc3RhY2tQcmlvID09PSBjdXJyZW50UHJpbyAmJiBzdGFja0Fzc29jID09PSBcImxlZnRcIikpIHtcbiAgICAgICAgICAgIGFwcGx5T25lKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvcHMucHVzaChuKTtcbiAgICAgIH1cbiAgICAgIGxhc3RXYXNOb3RPcCA9IGZhbHNlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGxhc3RXYXNOb3RPcCkgYXBwbHlBbGwoKTtcbiAgICBvdXRwdXQucHVzaCh0cmFuc2Zvcm0obikpO1xuICAgIGxhc3RXYXNOb3RPcCA9IHRydWU7XG4gIH1cblxuICBhcHBseUFsbCgpO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm0objogTm9kZSk6IE5vZGUge1xuICBpZiAobi5raW5kID09PSBcImN1cmx5XCIgfHwgbi5raW5kID09PSBcInJvdW5kXCIgfHwgbi5raW5kID09PSBcInNxdWFyZVwiIHx8IG4ua2luZCA9PT0gXCJzZXF1ZW5jZVwiKSB7XG4gICAgY29uc3Qga2lkcyA9IG9wZXJhdG9yUGFyc2VOb2RlcyhuLm5vZGVzKTtcbiAgICByZXR1cm4geyAuLi5uLCBub2Rlczoga2lkcywgbG9jOiBuLmxvYyB9IGFzIE5vZGU7XG4gIH1cbiAgcmV0dXJuIG47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShzcmM6IHN0cmluZyk6IE5vZGVbXSB7XG4gIGNvbnN0IHJvb3QgPSBwYXJzZUJyYWNrZXRzKHNyYyk7XG4gIHJldHVybiBvcGVyYXRvclBhcnNlTm9kZXMocm9vdC5ub2Rlcyk7XG59XG4iLAogICJpbXBvcnQge1xuICBOb2RlLFxuICBiaW4sXG4gIGN1cmx5LFxuICBpZGVudCxcbiAgaXNJZGVudCxcbiAgaXNOb2RlLFxuICBudW0sXG4gIG9wLFxuICByb3VuZCxcbiAgc3F1YXJlLFxuICBzdHIsXG59IGZyb20gXCIuL2FzdFwiO1xuaW1wb3J0IHsgb3BlcmF0b3JQYXJzZU5vZGVzLCBwYXJzZSB9IGZyb20gXCIuL3BhcnNlclwiO1xuXG5leHBvcnQgdHlwZSBNYWNyb0ZuID0gKGFyZ3M6IE5vZGVbXSwgY3R4OiBNYWNyb0NvbnRleHQpID0+IE5vZGUgfCBOb2RlW107XG5leHBvcnQgaW50ZXJmYWNlIE1ha3JlbGxNYWNyb0VudHJ5IHtcbiAga2luZDogXCJtYWtyZWxsXCI7XG4gIHBhcmFtczogc3RyaW5nW107XG4gIGJvZHk6IE5vZGVbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOYXRpdmVNYWNyb0VudHJ5IHtcbiAga2luZDogXCJuYXRpdmVcIjtcbiAgZm46IE1hY3JvRm47XG59XG5cbmV4cG9ydCB0eXBlIE1hY3JvRW50cnkgPSBNYWtyZWxsTWFjcm9FbnRyeSB8IE5hdGl2ZU1hY3JvRW50cnk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VyaWFsaXplZE1ha3JlbGxNYWNybyB7XG4gIG5hbWU6IHN0cmluZztcbiAgcGFyYW1zOiBzdHJpbmdbXTtcbiAgYm9keTogTm9kZVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1hY3JvQ29udGV4dCB7XG4gIHJlZ3VsYXIobm9kZXM6IE5vZGVbXSk6IE5vZGVbXTtcbiAgcGFyc2Uoc3JjOiBzdHJpbmcpOiBOb2RlW107XG4gIG9wZXJhdG9yUGFyc2Uobm9kZXM6IE5vZGVbXSk6IE5vZGVbXTtcbn1cblxudHlwZSBNYWNyb1ZhbHVlID1cbiAgfCBOb2RlXG4gIHwgTm9kZVtdXG4gIHwgc3RyaW5nXG4gIHwgbnVtYmVyXG4gIHwgYm9vbGVhblxuICB8IG51bGxcbiAgfCBNYWNyb1ZhbHVlW11cbiAgfCAoKC4uLmFyZ3M6IE1hY3JvVmFsdWVbXSkgPT4gTWFjcm9WYWx1ZSlcbiAgfCBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuY2xhc3MgUmV0dXJuU2lnbmFsIHtcbiAgdmFsdWU6IE1hY3JvVmFsdWU7XG5cbiAgY29uc3RydWN0b3IodmFsdWU6IE1hY3JvVmFsdWUpIHtcbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gIH1cbn1cblxuY2xhc3MgRW52IHtcbiAgcHJpdmF0ZSByZWFkb25seSBvd24gPSBuZXcgTWFwPHN0cmluZywgTWFjcm9WYWx1ZT4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBwYXJlbnQ/OiBFbnY7XG5cbiAgY29uc3RydWN0b3IocGFyZW50PzogRW52KSB7XG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gIH1cblxuICBoYXMobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMub3duLmhhcyhuYW1lKSkgcmV0dXJuIHRydWU7XG4gICAgaWYgKHRoaXMucGFyZW50KSByZXR1cm4gdGhpcy5wYXJlbnQuaGFzKG5hbWUpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHNldChuYW1lOiBzdHJpbmcsIHZhbHVlOiBNYWNyb1ZhbHVlKTogdm9pZCB7XG4gICAgaWYgKHRoaXMub3duLmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5vd24uc2V0KG5hbWUsIHZhbHVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMucGFyZW50ICYmIHRoaXMucGFyZW50LmhhcyhuYW1lKSkge1xuICAgICAgdGhpcy5wYXJlbnQuc2V0KG5hbWUsIHZhbHVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5vd24uc2V0KG5hbWUsIHZhbHVlKTtcbiAgfVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiBNYWNyb1ZhbHVlIHtcbiAgICBpZiAodGhpcy5vd24uaGFzKG5hbWUpKSByZXR1cm4gdGhpcy5vd24uZ2V0KG5hbWUpIGFzIE1hY3JvVmFsdWU7XG4gICAgaWYgKHRoaXMucGFyZW50KSByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0KG5hbWUpO1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBtYWNybyBzeW1ib2w6ICR7bmFtZX1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWd1bGFyKG5vZGVzOiBOb2RlW10pOiBOb2RlW10ge1xuICByZXR1cm4gbm9kZXM7XG59XG5cbmZ1bmN0aW9uIGlzTm9kZUxpc3QodjogdW5rbm93bik6IHYgaXMgTm9kZVtdIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodikgJiYgdi5ldmVyeSgoeCkgPT4gaXNOb2RlKHgpKTtcbn1cblxuZnVuY3Rpb24gdG9Ob2RlKHY6IE1hY3JvVmFsdWUpOiBOb2RlIHtcbiAgaWYgKGlzTm9kZSh2KSkgcmV0dXJuIHY7XG4gIGlmICh0eXBlb2YgdiA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHN0cih2KTtcbiAgaWYgKHR5cGVvZiB2ID09PSBcIm51bWJlclwiKSByZXR1cm4gbnVtKFN0cmluZyh2KSk7XG4gIGlmICh0eXBlb2YgdiA9PT0gXCJib29sZWFuXCIpIHJldHVybiBpZGVudCh2ID8gXCJ0cnVlXCIgOiBcImZhbHNlXCIpO1xuICBpZiAodiA9PT0gbnVsbCkgcmV0dXJuIGlkZW50KFwibnVsbFwiKTtcbiAgaWYgKGlzTm9kZUxpc3QodikpIHJldHVybiBzcXVhcmUodik7XG4gIHRocm93IG5ldyBFcnJvcihgTWFjcm8gcmV0dXJuZWQgdmFsdWUgdGhhdCBjYW5ub3QgYmUgY29udmVydGVkIHRvIEFTVCBub2RlOiAke1N0cmluZyh2KX1gKTtcbn1cblxuZnVuY3Rpb24gY3RvcihuYW1lOiBzdHJpbmcpOiB7IF9fbm9kZUN0b3I6IHN0cmluZyB9IHtcbiAgcmV0dXJuIHsgX19ub2RlQ3RvcjogbmFtZSB9O1xufVxuXG5mdW5jdGlvbiBub2RlQ3Rvck5hbWUodjogdW5rbm93bik6IHN0cmluZyB8IG51bGwge1xuICBpZiAoIXYgfHwgdHlwZW9mIHYgIT09IFwib2JqZWN0XCIpIHJldHVybiBudWxsO1xuICBjb25zdCBuID0gKHYgYXMgeyBfX25vZGVDdG9yPzogdW5rbm93biB9KS5fX25vZGVDdG9yO1xuICByZXR1cm4gdHlwZW9mIG4gPT09IFwic3RyaW5nXCIgPyBuIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNUcnV0aHkodjogTWFjcm9WYWx1ZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gQm9vbGVhbih2KTtcbn1cblxuZnVuY3Rpb24gZXZhbEJpbk9wKG46IEV4dHJhY3Q8Tm9kZSwgeyBraW5kOiBcImJpbm9wXCIgfT4sIGVudjogRW52LCBjdHg6IE1hY3JvQ29udGV4dCk6IE1hY3JvVmFsdWUge1xuICBpZiAobi5vcCA9PT0gXCI9XCIpIHtcbiAgICBpZiAobi5sZWZ0LmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSB0aHJvdyBuZXcgRXJyb3IoXCJNYWNybyBhc3NpZ25tZW50IGxlZnQgc2lkZSBtdXN0IGJlIGlkZW50aWZpZXJcIik7XG4gICAgY29uc3QgdmFsdWUgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICBlbnYuc2V0KG4ubGVmdC52YWx1ZSwgdmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIGlmIChuLm9wID09PSBcIi0+XCIpIHtcbiAgICBjb25zdCBwYXJhbXM6IHN0cmluZ1tdID0gW107XG4gICAgaWYgKG4ubGVmdC5raW5kID09PSBcImlkZW50aWZpZXJcIikge1xuICAgICAgcGFyYW1zLnB1c2gobi5sZWZ0LnZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKG4ubGVmdC5raW5kID09PSBcInNxdWFyZVwiKSB7XG4gICAgICBmb3IgKGNvbnN0IHAgb2Ygbi5sZWZ0Lm5vZGVzKSB7XG4gICAgICAgIGlmIChwLmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSB0aHJvdyBuZXcgRXJyb3IoXCJMYW1iZGEgcGFyYW1zIG11c3QgYmUgaWRlbnRpZmllcnNcIik7XG4gICAgICAgIHBhcmFtcy5wdXNoKHAudmFsdWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGxhbWJkYSBwYXJhbXNcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuICguLi5hcmdzOiBNYWNyb1ZhbHVlW10pOiBNYWNyb1ZhbHVlID0+IHtcbiAgICAgIGNvbnN0IGZuRW52ID0gbmV3IEVudihlbnYpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJhbXMubGVuZ3RoOyBpICs9IDEpIGZuRW52LnNldChwYXJhbXNbaV0sIGFyZ3NbaV0gPz8gbnVsbCk7XG4gICAgICByZXR1cm4gZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBmbkVudiwgY3R4KTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKG4ub3AgPT09IFwifFwiKSB7XG4gICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgaWYgKG4ucmlnaHQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHtcbiAgICAgIGNvbnN0IGYgPSBlbnYuZ2V0KG4ucmlnaHQudmFsdWUpO1xuICAgICAgaWYgKHR5cGVvZiBmICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcihgUGlwZSB0YXJnZXQgJyR7bi5yaWdodC52YWx1ZX0nIGlzIG5vdCBjYWxsYWJsZWApO1xuICAgICAgcmV0dXJuIGYobGVmdCk7XG4gICAgfVxuICAgIGNvbnN0IGNhbGxlZSA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgIGlmICh0eXBlb2YgY2FsbGVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcihcIlBpcGUgdGFyZ2V0IGlzIG5vdCBjYWxsYWJsZVwiKTtcbiAgICByZXR1cm4gY2FsbGVlKGxlZnQpO1xuICB9XG5cbiAgc3dpdGNoIChuLm9wKSB7XG4gICAgY2FzZSBcIitcIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgKyAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICB9XG4gICAgY2FzZSBcIi1cIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgLSAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICB9XG4gICAgY2FzZSBcIipcIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgKiAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICB9XG4gICAgY2FzZSBcIi9cIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgLyAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICB9XG4gICAgY2FzZSBcIiVcIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgJSAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICB9XG4gICAgY2FzZSBcIj09XCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiBsZWZ0ID09PSByaWdodDtcbiAgICB9XG4gICAgY2FzZSBcIiE9XCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiBsZWZ0ICE9PSByaWdodDtcbiAgICB9XG4gICAgY2FzZSBcIjxcIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgPCAocmlnaHQgYXMgbnVtYmVyKTtcbiAgICB9XG4gICAgY2FzZSBcIjw9XCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiAobGVmdCBhcyBudW1iZXIpIDw9IChyaWdodCBhcyBudW1iZXIpO1xuICAgIH1cbiAgICBjYXNlIFwiPlwiOiB7XG4gICAgICBjb25zdCBsZWZ0ID0gZXZhbE1hY3JvTm9kZShuLmxlZnQsIGVudiwgY3R4KTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBlbnYsIGN0eCk7XG4gICAgICByZXR1cm4gKGxlZnQgYXMgbnVtYmVyKSA+IChyaWdodCBhcyBudW1iZXIpO1xuICAgIH1cbiAgICBjYXNlIFwiPj1cIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCByaWdodCA9IGV2YWxNYWNyb05vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIChsZWZ0IGFzIG51bWJlcikgPj0gKHJpZ2h0IGFzIG51bWJlcik7XG4gICAgfVxuICAgIGNhc2UgXCImJlwiOiB7XG4gICAgICBjb25zdCBsZWZ0ID0gZXZhbE1hY3JvTm9kZShuLmxlZnQsIGVudiwgY3R4KTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBlbnYsIGN0eCk7XG4gICAgICByZXR1cm4gQm9vbGVhbihsZWZ0KSAmJiBCb29sZWFuKHJpZ2h0KTtcbiAgICB9XG4gICAgY2FzZSBcInx8XCI6IHtcbiAgICAgIGNvbnN0IGxlZnQgPSBldmFsTWFjcm9Ob2RlKG4ubGVmdCwgZW52LCBjdHgpO1xuICAgICAgY29uc3QgcmlnaHQgPSBldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KTtcbiAgICAgIHJldHVybiBCb29sZWFuKGxlZnQpIHx8IEJvb2xlYW4ocmlnaHQpO1xuICAgIH1cbiAgICBjYXNlIFwiQFwiOiB7XG4gICAgICBjb25zdCBsZWZ0ID0gZXZhbE1hY3JvTm9kZShuLmxlZnQsIGVudiwgY3R4KTtcbiAgICAgIGNvbnN0IHJpZ2h0ID0gZXZhbE1hY3JvTm9kZShuLnJpZ2h0LCBlbnYsIGN0eCk7XG4gICAgICByZXR1cm4gKGxlZnQgYXMgTWFjcm9WYWx1ZVtdKVtOdW1iZXIocmlnaHQpXTtcbiAgICB9XG4gICAgY2FzZSBcIi5cIjoge1xuICAgICAgY29uc3QgbGVmdCA9IGV2YWxNYWNyb05vZGUobi5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICBjb25zdCBrZXkgPSBuLnJpZ2h0LmtpbmQgPT09IFwiaWRlbnRpZmllclwiID8gbi5yaWdodC52YWx1ZSA6IFN0cmluZyhldmFsTWFjcm9Ob2RlKG4ucmlnaHQsIGVudiwgY3R4KSk7XG4gICAgICByZXR1cm4gKGxlZnQgYXMgUmVjb3JkPHN0cmluZywgTWFjcm9WYWx1ZT4pW2tleV0gPz8gbnVsbDtcbiAgICB9XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgbWFjcm8gYmlub3A6ICR7bi5vcH1gKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmFsUXVvdGVOb2RlKG46IE5vZGUsIGVudjogRW52LCBjdHg6IE1hY3JvQ29udGV4dCk6IE5vZGUgfCBOb2RlW10ge1xuICBpZiAobi5raW5kID09PSBcImN1cmx5XCIgJiYgbi5ub2Rlcy5sZW5ndGggPiAwICYmIG4ubm9kZXNbMF0ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIgJiYgKG4ubm9kZXNbMF0udmFsdWUgPT09IFwidW5xdW90ZVwiIHx8IG4ubm9kZXNbMF0udmFsdWUgPT09IFwiJFwiKSkge1xuICAgIGNvbnN0IHJhdyA9IGV2YWxNYWNyb05vZGUobi5ub2Rlc1sxXSA/PyBpZGVudChcIm51bGxcIiksIGVudiwgY3R4KTtcbiAgICBpZiAoaXNOb2RlKHJhdykpIHJldHVybiByYXc7XG4gICAgaWYgKGlzTm9kZUxpc3QocmF3KSkgcmV0dXJuIHJhdztcbiAgICByZXR1cm4gdG9Ob2RlKHJhdyk7XG4gIH1cblxuICBpZiAobi5raW5kID09PSBcImJpbm9wXCIpIHtcbiAgICBjb25zdCBsZWZ0ID0gZXZhbFF1b3RlTm9kZShuLmxlZnQsIGVudiwgY3R4KTtcbiAgICBjb25zdCByaWdodCA9IGV2YWxRdW90ZU5vZGUobi5yaWdodCwgZW52LCBjdHgpO1xuICAgIGlmICghaXNOb2RlKGxlZnQpIHx8ICFpc05vZGUocmlnaHQpKSB0aHJvdyBuZXcgRXJyb3IoXCJVbnF1b3RlIHByb2R1Y2VkIGludmFsaWQgYmlub3Agc2lkZVwiKTtcbiAgICByZXR1cm4gYmluKGxlZnQsIG4ub3AsIHJpZ2h0KTtcbiAgfVxuXG4gIGlmIChuLmtpbmQgPT09IFwiY3VybHlcIiB8fCBuLmtpbmQgPT09IFwic3F1YXJlXCIgfHwgbi5raW5kID09PSBcInJvdW5kXCIgfHwgbi5raW5kID09PSBcInNlcXVlbmNlXCIpIHtcbiAgICBjb25zdCBraWRzOiBOb2RlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG4ubm9kZXMpIHtcbiAgICAgIGNvbnN0IHEgPSBldmFsUXVvdGVOb2RlKGNoaWxkLCBlbnYsIGN0eCk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShxKSkga2lkcy5wdXNoKC4uLnEpO1xuICAgICAgZWxzZSBraWRzLnB1c2gocSk7XG4gICAgfVxuICAgIGlmIChuLmtpbmQgPT09IFwiY3VybHlcIikgcmV0dXJuIGN1cmx5KGtpZHMpO1xuICAgIGlmIChuLmtpbmQgPT09IFwic3F1YXJlXCIpIHJldHVybiBzcXVhcmUoa2lkcyk7XG4gICAgaWYgKG4ua2luZCA9PT0gXCJyb3VuZFwiKSByZXR1cm4gcm91bmQoa2lkcyk7XG4gICAgcmV0dXJuIHsga2luZDogXCJzZXF1ZW5jZVwiLCBub2Rlczoga2lkcyB9O1xuICB9XG5cbiAgaWYgKG4ua2luZCA9PT0gXCJpZGVudGlmaWVyXCIpIHJldHVybiBpZGVudChuLnZhbHVlKTtcbiAgaWYgKG4ua2luZCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIG51bShuLnZhbHVlKTtcbiAgaWYgKG4ua2luZCA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHN0cihuLnZhbHVlKTtcbiAgaWYgKG4ua2luZCA9PT0gXCJvcGVyYXRvclwiKSByZXR1cm4gb3Aobi52YWx1ZSk7XG5cbiAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBxdW90ZSBub2RlXCIpO1xufVxuXG5mdW5jdGlvbiBldmFsTWFjcm9Ob2RlKG46IE5vZGUsIGVudjogRW52LCBjdHg6IE1hY3JvQ29udGV4dCk6IE1hY3JvVmFsdWUge1xuICBzd2l0Y2ggKG4ua2luZCkge1xuICAgIGNhc2UgXCJpZGVudGlmaWVyXCI6XG4gICAgICBpZiAobi52YWx1ZSA9PT0gXCJ0cnVlXCIpIHJldHVybiB0cnVlO1xuICAgICAgaWYgKG4udmFsdWUgPT09IFwiZmFsc2VcIikgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKG4udmFsdWUgPT09IFwibnVsbFwiKSByZXR1cm4gbnVsbDtcbiAgICAgIHJldHVybiBlbnYuZ2V0KG4udmFsdWUpO1xuICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgIHJldHVybiBuLnZhbHVlO1xuICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgIHJldHVybiBOdW1iZXIobi52YWx1ZSk7XG4gICAgY2FzZSBcInNxdWFyZVwiOlxuICAgICAgcmV0dXJuIG4ubm9kZXMubWFwKCh4KSA9PiBldmFsTWFjcm9Ob2RlKHgsIGVudiwgY3R4KSk7XG4gICAgY2FzZSBcInJvdW5kXCI6XG4gICAgICBpZiAobi5ub2Rlcy5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuICAgICAgaWYgKG4ubm9kZXMubGVuZ3RoID09PSAxKSByZXR1cm4gZXZhbE1hY3JvTm9kZShuLm5vZGVzWzBdLCBlbnYsIGN0eCk7XG4gICAgICByZXR1cm4gbi5ub2Rlcy5tYXAoKHgpID0+IGV2YWxNYWNyb05vZGUoeCwgZW52LCBjdHgpKTtcbiAgICBjYXNlIFwiYmlub3BcIjpcbiAgICAgIHJldHVybiBldmFsQmluT3AobiwgZW52LCBjdHgpO1xuICAgIGNhc2UgXCJjdXJseVwiOiB7XG4gICAgICBjb25zdCBoZWFkID0gbi5ub2Rlc1swXTtcbiAgICAgIGlmIChoZWFkICYmIGlzSWRlbnQoaGVhZCwgXCJpZlwiKSkge1xuICAgICAgICBjb25zdCBwYXJ0cyA9IG4ubm9kZXMuc2xpY2UoMSk7XG4gICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgd2hpbGUgKGkgKyAxIDwgcGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKGlzVHJ1dGh5KGV2YWxNYWNyb05vZGUocGFydHNbaV0sIGVudiwgY3R4KSkpIHJldHVybiBldmFsTWFjcm9Ob2RlKHBhcnRzW2kgKyAxXSwgZW52LCBjdHgpO1xuICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaSA8IHBhcnRzLmxlbmd0aCkgcmV0dXJuIGV2YWxNYWNyb05vZGUocGFydHNbaV0sIGVudiwgY3R4KTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChoZWFkICYmIGlzSWRlbnQoaGVhZCwgXCJkb1wiKSkge1xuICAgICAgICBsZXQgcmVzOiBNYWNyb1ZhbHVlID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBzdG10IG9mIG4ubm9kZXMuc2xpY2UoMSkpIHJlcyA9IGV2YWxNYWNyb05vZGUoc3RtdCwgZW52LCBjdHgpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGVhZCAmJiBpc0lkZW50KGhlYWQsIFwid2hlblwiKSkge1xuICAgICAgICBpZiAoaXNUcnV0aHkoZXZhbE1hY3JvTm9kZShuLm5vZGVzWzFdID8/IGlkZW50KFwiZmFsc2VcIiksIGVudiwgY3R4KSkpIHtcbiAgICAgICAgICBsZXQgcmVzOiBNYWNyb1ZhbHVlID0gbnVsbDtcbiAgICAgICAgICBmb3IgKGNvbnN0IHN0bXQgb2Ygbi5ub2Rlcy5zbGljZSgyKSkgcmVzID0gZXZhbE1hY3JvTm9kZShzdG10LCBlbnYsIGN0eCk7XG4gICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGhlYWQgJiYgaXNJZGVudChoZWFkLCBcIndoaWxlXCIpKSB7XG4gICAgICAgIGxldCByZXM6IE1hY3JvVmFsdWUgPSBudWxsO1xuICAgICAgICB3aGlsZSAoaXNUcnV0aHkoZXZhbE1hY3JvTm9kZShuLm5vZGVzWzFdID8/IGlkZW50KFwiZmFsc2VcIiksIGVudiwgY3R4KSkpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHN0bXQgb2Ygbi5ub2Rlcy5zbGljZSgyKSkgcmVzID0gZXZhbE1hY3JvTm9kZShzdG10LCBlbnYsIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgIH1cblxuICAgICAgaWYgKGhlYWQgJiYgaXNJZGVudChoZWFkLCBcImZvclwiKSkge1xuICAgICAgICBjb25zdCB2YXJOb2RlID0gbi5ub2Rlc1sxXTtcbiAgICAgICAgaWYgKCF2YXJOb2RlIHx8IHZhck5vZGUua2luZCAhPT0gXCJpZGVudGlmaWVyXCIpIHRocm93IG5ldyBFcnJvcihcImZvciByZXF1aXJlcyBpZGVudGlmaWVyIHZhcmlhYmxlXCIpO1xuICAgICAgICBjb25zdCBpdGVyYWJsZSA9IGV2YWxNYWNyb05vZGUobi5ub2Rlc1syXSA/PyBzcXVhcmUoW10pLCBlbnYsIGN0eCk7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShpdGVyYWJsZSkpIHRocm93IG5ldyBFcnJvcihcImZvciBpdGVyYWJsZSBtdXN0IGV2YWx1YXRlIHRvIGFycmF5XCIpO1xuICAgICAgICBsZXQgcmVzOiBNYWNyb1ZhbHVlID0gbnVsbDtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZXJhYmxlKSB7XG4gICAgICAgICAgZW52LnNldCh2YXJOb2RlLnZhbHVlLCBpdGVtIGFzIE1hY3JvVmFsdWUpO1xuICAgICAgICAgIGZvciAoY29uc3Qgc3RtdCBvZiBuLm5vZGVzLnNsaWNlKDMpKSByZXMgPSBldmFsTWFjcm9Ob2RlKHN0bXQsIGVudiwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGVhZCAmJiBpc0lkZW50KGhlYWQsIFwiZnVuXCIpKSB7XG4gICAgICAgIGNvbnN0IG1heWJlTmFtZSA9IG4ubm9kZXNbMV07XG4gICAgICAgIGNvbnN0IGFyZ3NOb2RlID0gbi5ub2Rlc1syXTtcbiAgICAgICAgaWYgKCFtYXliZU5hbWUgfHwgbWF5YmVOYW1lLmtpbmQgIT09IFwiaWRlbnRpZmllclwiIHx8ICFhcmdzTm9kZSB8fCBhcmdzTm9kZS5raW5kICE9PSBcInNxdWFyZVwiKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWFjcm8ge2Z1biAuLi59IG11c3QgYmUge2Z1biBuYW1lIFthcmdzXSAuLi59XCIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGFyZ05hbWVzID0gYXJnc05vZGUubm9kZXMubWFwKChhcmcpID0+IHtcbiAgICAgICAgICBpZiAoYXJnLmtpbmQgIT09IFwiaWRlbnRpZmllclwiKSB0aHJvdyBuZXcgRXJyb3IoXCJmdW4gYXJncyBtdXN0IGJlIGlkZW50aWZpZXJzXCIpO1xuICAgICAgICAgIHJldHVybiBhcmcudmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBmbiA9ICguLi5hcmdzOiBNYWNyb1ZhbHVlW10pOiBNYWNyb1ZhbHVlID0+IHtcbiAgICAgICAgICBjb25zdCBmbkVudiA9IG5ldyBFbnYoZW52KTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ05hbWVzLmxlbmd0aDsgaSArPSAxKSBmbkVudi5zZXQoYXJnTmFtZXNbaV0sIGFyZ3NbaV0gPz8gbnVsbCk7XG4gICAgICAgICAgbGV0IG91dDogTWFjcm9WYWx1ZSA9IG51bGw7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc3RtdCBvZiBuLm5vZGVzLnNsaWNlKDMpKSBvdXQgPSBldmFsTWFjcm9Ob2RlKHN0bXQsIGZuRW52LCBjdHgpO1xuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgICB9IGNhdGNoIChyZXQpIHtcbiAgICAgICAgICAgIGlmIChyZXQgaW5zdGFuY2VvZiBSZXR1cm5TaWduYWwpIHJldHVybiByZXQudmFsdWU7XG4gICAgICAgICAgICB0aHJvdyByZXQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBlbnYuc2V0KG1heWJlTmFtZS52YWx1ZSwgZm4pO1xuICAgICAgICByZXR1cm4gZm47XG4gICAgICB9XG5cbiAgICAgIGlmIChoZWFkICYmIGlzSWRlbnQoaGVhZCwgXCJyZXR1cm5cIikpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBuLm5vZGVzWzFdID8gZXZhbE1hY3JvTm9kZShuLm5vZGVzWzFdLCBlbnYsIGN0eCkgOiBudWxsO1xuICAgICAgICB0aHJvdyBuZXcgUmV0dXJuU2lnbmFsKHZhbHVlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGhlYWQgJiYgaXNJZGVudChoZWFkLCBcInF1b3RlXCIpKSB7XG4gICAgICAgIGNvbnN0IHFzID0gbi5ub2Rlcy5zbGljZSgxKS5tYXAoKHgpID0+IGV2YWxRdW90ZU5vZGUoeCwgZW52LCBjdHgpKTtcbiAgICAgICAgaWYgKHFzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHNxdWFyZShbXSk7XG4gICAgICAgIGlmIChxcy5sZW5ndGggPT09IDEpIHJldHVybiBxc1swXSBhcyBNYWNyb1ZhbHVlO1xuICAgICAgICBjb25zdCBtZXJnZWQ6IE5vZGVbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHEgb2YgcXMpIHtcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShxKSkgbWVyZ2VkLnB1c2goLi4ucSk7XG4gICAgICAgICAgZWxzZSBtZXJnZWQucHVzaChxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWVyZ2VkO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGVhZCAmJiBoZWFkLmtpbmQgPT09IFwiYmlub3BcIiAmJiBoZWFkLm9wID09PSBcIi5cIikge1xuICAgICAgICBjb25zdCByZWNlaXZlciA9IGV2YWxNYWNyb05vZGUoaGVhZC5sZWZ0LCBlbnYsIGN0eCk7XG4gICAgICAgIGNvbnN0IG1lbWJlciA9IGhlYWQucmlnaHQua2luZCA9PT0gXCJpZGVudGlmaWVyXCIgPyBoZWFkLnJpZ2h0LnZhbHVlIDogU3RyaW5nKGV2YWxNYWNyb05vZGUoaGVhZC5yaWdodCwgZW52LCBjdHgpKTtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gKHJlY2VpdmVyIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCk/LlttZW1iZXJdO1xuICAgICAgICBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgRXJyb3IoYE1hY3JvIG1lbWJlciAnJHttZW1iZXJ9JyBpcyBub3QgY2FsbGFibGVgKTtcbiAgICAgICAgY29uc3QgYXJncyA9IG4ubm9kZXMuc2xpY2UoMSkubWFwKChhcmcpID0+IGV2YWxNYWNyb05vZGUoYXJnLCBlbnYsIGN0eCkpO1xuICAgICAgICByZXR1cm4gdGFyZ2V0LmFwcGx5KHJlY2VpdmVyLCBhcmdzKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY2FsbGVlID0gaGVhZCA/IGV2YWxNYWNyb05vZGUoaGVhZCwgZW52LCBjdHgpIDogbnVsbDtcbiAgICAgIGlmICh0eXBlb2YgY2FsbGVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBFcnJvcihcIk1hY3JvIGNhbGwgdGFyZ2V0IGlzIG5vdCBjYWxsYWJsZVwiKTtcbiAgICAgIGNvbnN0IGFyZ3MgPSBuLm5vZGVzLnNsaWNlKDEpLm1hcCgoYXJnKSA9PiBldmFsTWFjcm9Ob2RlKGFyZywgZW52LCBjdHgpKTtcbiAgICAgIHJldHVybiBjYWxsZWUoLi4uYXJncyk7XG4gICAgfVxuICAgIGNhc2UgXCJvcGVyYXRvclwiOlxuICAgICAgcmV0dXJuIG4udmFsdWU7XG4gICAgY2FzZSBcInNlcXVlbmNlXCI6IHtcbiAgICAgIGxldCBvdXQ6IE1hY3JvVmFsdWUgPSBudWxsO1xuICAgICAgZm9yIChjb25zdCB4IG9mIG4ubm9kZXMpIG91dCA9IGV2YWxNYWNyb05vZGUoeCwgZW52LCBjdHgpO1xuICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2VNYWNyb0VudihjdHg6IE1hY3JvQ29udGV4dCk6IEVudiB7XG4gIGNvbnN0IGVudiA9IG5ldyBFbnYoKTtcblxuICBlbnYuc2V0KFwicmVndWxhclwiLCAobm9kZXM6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkobm9kZXMpKSByZXR1cm4gW107XG4gICAgcmV0dXJuIG5vZGVzLmZpbHRlcigobikgPT4gaXNOb2RlKG4pKTtcbiAgfSk7XG5cbiAgZW52LnNldChcIm9wZXJhdG9yX3BhcnNlXCIsIChub2RlczogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4ge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShub2RlcykpIHJldHVybiBbXTtcbiAgICBjb25zdCBucyA9IG5vZGVzLmZpbHRlcigobik6IG4gaXMgTm9kZSA9PiBpc05vZGUobikpO1xuICAgIHJldHVybiBjdHgub3BlcmF0b3JQYXJzZShucyk7XG4gIH0pO1xuXG4gIGVudi5zZXQoXCJwYXJzZVwiLCAoc3JjOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiB7XG4gICAgaWYgKHR5cGVvZiBzcmMgIT09IFwic3RyaW5nXCIpIHRocm93IG5ldyBFcnJvcihcInBhcnNlIGV4cGVjdHMgc3RyaW5nXCIpO1xuICAgIHJldHVybiBjdHgucGFyc2Uoc3JjKTtcbiAgfSk7XG5cbiAgZW52LnNldChcImxlblwiLCAoeDogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4gKEFycmF5LmlzQXJyYXkoeCkgfHwgdHlwZW9mIHggPT09IFwic3RyaW5nXCIgPyB4Lmxlbmd0aCA6IDApKTtcbiAgZW52LnNldChcInN0clwiLCAoeDogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4gU3RyaW5nKHgpKTtcbiAgZW52LnNldChcImludFwiLCAoeDogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4gTnVtYmVyLnBhcnNlSW50KFN0cmluZyh4KSwgMTApKTtcbiAgZW52LnNldChcImZsb2F0XCIsICh4OiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiBOdW1iZXIucGFyc2VGbG9hdChTdHJpbmcoeCkpKTtcbiAgZW52LnNldChcImxpc3RcIiwgKHg6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IChBcnJheS5pc0FycmF5KHgpID8gWy4uLnhdIDogW10pKTtcbiAgZW52LnNldChcImZpcnN0XCIsICh4OiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiAoQXJyYXkuaXNBcnJheSh4KSAmJiB4Lmxlbmd0aCA+IDAgPyB4WzBdIDogbnVsbCkpO1xuICBlbnYuc2V0KFwicmVzdFwiLCAoeDogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4gKEFycmF5LmlzQXJyYXkoeCkgPyB4LnNsaWNlKDEpIDogW10pKTtcbiAgZW52LnNldChcInJldmVyc2VkXCIsICh4OiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiAoQXJyYXkuaXNBcnJheSh4KSA/IFsuLi54XS5yZXZlcnNlKCkgOiBbXSkpO1xuICBlbnYuc2V0KFwicHVzaFwiLCAoYXJyOiBNYWNyb1ZhbHVlLCBpdGVtOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFycikpIHJldHVybiAwO1xuICAgIGFyci5wdXNoKGl0ZW0pO1xuICAgIHJldHVybiBhcnIubGVuZ3RoO1xuICB9KTtcbiAgZW52LnNldChcInBvcFwiLCAoYXJyOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFycikpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBhcnIucG9wKCkgPz8gbnVsbDtcbiAgfSk7XG4gIGVudi5zZXQoXCJyYW5nZVwiLCAoYTogTWFjcm9WYWx1ZSwgYj86IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IHtcbiAgICBjb25zdCBmcm9tID0gTnVtYmVyKGEpO1xuICAgIGNvbnN0IHRvID0gYiA9PT0gdW5kZWZpbmVkID8gZnJvbSA6IE51bWJlcihiKTtcbiAgICBjb25zdCBzdGFydCA9IGIgPT09IHVuZGVmaW5lZCA/IDAgOiBmcm9tO1xuICAgIGNvbnN0IGVuZCA9IGIgPT09IHVuZGVmaW5lZCA/IGZyb20gOiB0bztcbiAgICBjb25zdCBvdXQ6IG51bWJlcltdID0gW107XG4gICAgZm9yIChsZXQgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDEpIG91dC5wdXNoKGkpO1xuICAgIHJldHVybiBvdXQ7XG4gIH0pO1xuICBlbnYuc2V0KFwibWFwXCIsIChmOiBNYWNyb1ZhbHVlLCBhcnI6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IHtcbiAgICBpZiAodHlwZW9mIGYgIT09IFwiZnVuY3Rpb25cIiB8fCAhQXJyYXkuaXNBcnJheShhcnIpKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5tYXAoKHgpID0+IGYoeCBhcyBNYWNyb1ZhbHVlKSk7XG4gIH0pO1xuICBlbnYuc2V0KFwicHJpbnRcIiwgKC4uLmFyZ3M6IE1hY3JvVmFsdWVbXSk6IE1hY3JvVmFsdWUgPT4ge1xuICAgIGNvbnNvbGUubG9nKC4uLmFyZ3MpO1xuICAgIHJldHVybiBudWxsO1xuICB9KTtcbiAgZW52LnNldChcImFzc2VydFwiLCAoY29uZDogTWFjcm9WYWx1ZSwgbXNnPzogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4ge1xuICAgIGlmICghY29uZCkgdGhyb3cgbmV3IEVycm9yKG1zZyA/IFN0cmluZyhtc2cpIDogXCJNYWNybyBhc3NlcnRpb24gZmFpbGVkXCIpO1xuICAgIHJldHVybiBudWxsO1xuICB9KTtcblxuICBlbnYuc2V0KFwiaXNpbnN0YW5jZVwiLCAodmFsOiBNYWNyb1ZhbHVlLCB0eXA6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IHtcbiAgICBpZiAoIWlzTm9kZSh2YWwpKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgdG5hbWUgPSBub2RlQ3Rvck5hbWUodHlwKSA/PyAodHlwZW9mIHR5cCA9PT0gXCJzdHJpbmdcIiA/IHR5cCA6IG51bGwpO1xuICAgIGlmICghdG5hbWUpIHJldHVybiBmYWxzZTtcbiAgICBpZiAodG5hbWUgPT09IFwiTm9kZVwiKSByZXR1cm4gdHJ1ZTtcblxuICAgIGNvbnN0IG1hcDogUmVjb3JkPHN0cmluZywgTm9kZVtcImtpbmRcIl0+ID0ge1xuICAgICAgSWRlbnRpZmllcjogXCJpZGVudGlmaWVyXCIsXG4gICAgICBOdW1iZXI6IFwibnVtYmVyXCIsXG4gICAgICBTdHJpbmc6IFwic3RyaW5nXCIsXG4gICAgICBPcGVyYXRvcjogXCJvcGVyYXRvclwiLFxuICAgICAgQmluT3A6IFwiYmlub3BcIixcbiAgICAgIFJvdW5kQnJhY2tldHM6IFwicm91bmRcIixcbiAgICAgIFNxdWFyZUJyYWNrZXRzOiBcInNxdWFyZVwiLFxuICAgICAgQ3VybHlCcmFja2V0czogXCJjdXJseVwiLFxuICAgICAgU2VxdWVuY2U6IFwic2VxdWVuY2VcIixcbiAgICB9O1xuICAgIGNvbnN0IHdhbnRlZCA9IG1hcFt0bmFtZV07XG4gICAgcmV0dXJuIHdhbnRlZCA/IHZhbC5raW5kID09PSB3YW50ZWQgOiBmYWxzZTtcbiAgfSk7XG5cbiAgY29uc3QgaWRlbnRpZmllckN0b3IgPSAoKHZhbHVlOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PiBpZGVudChTdHJpbmcodmFsdWUpKSkgYXMgKCh2YWx1ZTogTWFjcm9WYWx1ZSkgPT4gTWFjcm9WYWx1ZSkgJiB7IF9fbm9kZUN0b3I6IHN0cmluZyB9O1xuICBpZGVudGlmaWVyQ3Rvci5fX25vZGVDdG9yID0gXCJJZGVudGlmaWVyXCI7XG4gIGVudi5zZXQoXCJJZGVudGlmaWVyXCIsIGlkZW50aWZpZXJDdG9yKTtcblxuICBjb25zdCBudW1iZXJDdG9yID0gKCh2YWx1ZTogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT4gbnVtKFN0cmluZyh2YWx1ZSkpKSBhcyAoKHZhbHVlOiBNYWNyb1ZhbHVlKSA9PiBNYWNyb1ZhbHVlKSAmIHsgX19ub2RlQ3Rvcjogc3RyaW5nIH07XG4gIG51bWJlckN0b3IuX19ub2RlQ3RvciA9IFwiTnVtYmVyXCI7XG4gIGVudi5zZXQoXCJOdW1iZXJcIiwgbnVtYmVyQ3Rvcik7XG5cbiAgY29uc3Qgc3RyaW5nQ3RvciA9ICgodmFsdWU6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IHN0cihTdHJpbmcodmFsdWUpKSkgYXMgKCh2YWx1ZTogTWFjcm9WYWx1ZSkgPT4gTWFjcm9WYWx1ZSkgJiB7IF9fbm9kZUN0b3I6IHN0cmluZyB9O1xuICBzdHJpbmdDdG9yLl9fbm9kZUN0b3IgPSBcIlN0cmluZ1wiO1xuICBlbnYuc2V0KFwiU3RyaW5nXCIsIHN0cmluZ0N0b3IpO1xuXG4gIGNvbnN0IG9wZXJhdG9yQ3RvciA9ICgodmFsdWU6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+IG9wKFN0cmluZyh2YWx1ZSkpKSBhcyAoKHZhbHVlOiBNYWNyb1ZhbHVlKSA9PiBNYWNyb1ZhbHVlKSAmIHsgX19ub2RlQ3Rvcjogc3RyaW5nIH07XG4gIG9wZXJhdG9yQ3Rvci5fX25vZGVDdG9yID0gXCJPcGVyYXRvclwiO1xuICBlbnYuc2V0KFwiT3BlcmF0b3JcIiwgb3BlcmF0b3JDdG9yKTtcblxuICBjb25zdCBiaW5PcEN0b3IgPSAoKGxlZnQ6IE1hY3JvVmFsdWUsIG9wZXJhdG9yOiBNYWNyb1ZhbHVlLCByaWdodDogTWFjcm9WYWx1ZSk6IE1hY3JvVmFsdWUgPT5cbiAgICBiaW4odG9Ob2RlKGxlZnQpLCBTdHJpbmcob3BlcmF0b3IpLCB0b05vZGUocmlnaHQpKSkgYXMgKChsZWZ0OiBNYWNyb1ZhbHVlLCBvcGVyYXRvcjogTWFjcm9WYWx1ZSwgcmlnaHQ6IE1hY3JvVmFsdWUpID0+IE1hY3JvVmFsdWUpICYgeyBfX25vZGVDdG9yOiBzdHJpbmcgfTtcbiAgYmluT3BDdG9yLl9fbm9kZUN0b3IgPSBcIkJpbk9wXCI7XG4gIGVudi5zZXQoXCJCaW5PcFwiLCBiaW5PcEN0b3IpO1xuXG4gIGNvbnN0IHNxdWFyZUN0b3IgPSAoKG5vZGVzOiBNYWNyb1ZhbHVlKTogTWFjcm9WYWx1ZSA9PlxuICAgIHNxdWFyZShBcnJheS5pc0FycmF5KG5vZGVzKSA/IG5vZGVzLmZpbHRlcihpc05vZGUpIDogW10pKSBhcyAoKG5vZGVzOiBNYWNyb1ZhbHVlKSA9PiBNYWNyb1ZhbHVlKSAmIHsgX19ub2RlQ3Rvcjogc3RyaW5nIH07XG4gIHNxdWFyZUN0b3IuX19ub2RlQ3RvciA9IFwiU3F1YXJlQnJhY2tldHNcIjtcbiAgZW52LnNldChcIlNxdWFyZUJyYWNrZXRzXCIsIHNxdWFyZUN0b3IpO1xuXG4gIGNvbnN0IGN1cmx5Q3RvciA9ICgobm9kZXM6IE1hY3JvVmFsdWUpOiBNYWNyb1ZhbHVlID0+XG4gICAgY3VybHkoQXJyYXkuaXNBcnJheShub2RlcykgPyBub2Rlcy5maWx0ZXIoaXNOb2RlKSA6IFtdKSkgYXMgKChub2RlczogTWFjcm9WYWx1ZSkgPT4gTWFjcm9WYWx1ZSkgJiB7IF9fbm9kZUN0b3I6IHN0cmluZyB9O1xuICBjdXJseUN0b3IuX19ub2RlQ3RvciA9IFwiQ3VybHlCcmFja2V0c1wiO1xuICBlbnYuc2V0KFwiQ3VybHlCcmFja2V0c1wiLCBjdXJseUN0b3IpO1xuXG4gIGVudi5zZXQoXCJSb3VuZEJyYWNrZXRzXCIsIGN0b3IoXCJSb3VuZEJyYWNrZXRzXCIpKTtcbiAgZW52LnNldChcIlNlcXVlbmNlXCIsIGN0b3IoXCJTZXF1ZW5jZVwiKSk7XG5cbiAgcmV0dXJuIGVudjtcbn1cblxuZXhwb3J0IGNsYXNzIE1hY3JvUmVnaXN0cnkge1xuICBwcml2YXRlIHJlYWRvbmx5IG1hY3JvcyA9IG5ldyBNYXA8c3RyaW5nLCBNYWNyb0VudHJ5PigpO1xuXG4gIHJlZ2lzdGVyKG5hbWU6IHN0cmluZywgZm46IE1hY3JvRm4pOiB2b2lkIHtcbiAgICB0aGlzLm1hY3Jvcy5zZXQobmFtZSwgeyBraW5kOiBcIm5hdGl2ZVwiLCBmbiB9KTtcbiAgfVxuXG4gIHJlZ2lzdGVyTWFrcmVsbChuYW1lOiBzdHJpbmcsIHBhcmFtczogc3RyaW5nW10sIGJvZHk6IE5vZGVbXSk6IHZvaWQge1xuICAgIHRoaXMubWFjcm9zLnNldChuYW1lLCB7IGtpbmQ6IFwibWFrcmVsbFwiLCBwYXJhbXMsIGJvZHkgfSk7XG4gIH1cblxuICBnZXQobmFtZTogc3RyaW5nKTogTWFjcm9GbiB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZSA9IHRoaXMubWFjcm9zLmdldChuYW1lKTtcbiAgICBpZiAoIWUgfHwgZS5raW5kICE9PSBcIm5hdGl2ZVwiKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiBlLmZuO1xuICB9XG5cbiAgZ2V0RW50cnkobmFtZTogc3RyaW5nKTogTWFjcm9FbnRyeSB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMubWFjcm9zLmdldChuYW1lKTtcbiAgfVxuXG4gIGVudHJpZXMoKTogQXJyYXk8W3N0cmluZywgTWFjcm9FbnRyeV0+IHtcbiAgICByZXR1cm4gWy4uLnRoaXMubWFjcm9zLmVudHJpZXMoKV07XG4gIH1cblxuICBzZXJpYWxpemVNYWtyZWxsRW50cmllcygpOiBTZXJpYWxpemVkTWFrcmVsbE1hY3JvW10ge1xuICAgIGNvbnN0IG91dDogU2VyaWFsaXplZE1ha3JlbGxNYWNyb1tdID0gW107XG4gICAgZm9yIChjb25zdCBbbmFtZSwgZW50cnldIG9mIHRoaXMubWFjcm9zLmVudHJpZXMoKSkge1xuICAgICAgaWYgKGVudHJ5LmtpbmQgPT09IFwibWFrcmVsbFwiKSB7XG4gICAgICAgIG91dC5wdXNoKHsgbmFtZSwgcGFyYW1zOiBlbnRyeS5wYXJhbXMsIGJvZHk6IGVudHJ5LmJvZHkgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRNYWNyb0NvbnRleHQoKTogTWFjcm9Db250ZXh0IHtcbiAgcmV0dXJuIHtcbiAgICByZWd1bGFyLFxuICAgIHBhcnNlLFxuICAgIG9wZXJhdG9yUGFyc2U6IG9wZXJhdG9yUGFyc2VOb2RlcyxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1bk1ha3JlbGxNYWNyb0RlZihcbiAgcGFyYW1zOiBzdHJpbmdbXSxcbiAgYm9keTogTm9kZVtdLFxuICBhcmdzOiBOb2RlW10sXG4gIHJlZ2lzdHJ5OiBNYWNyb1JlZ2lzdHJ5LFxuICBtYWNyb0N0eDogTWFjcm9Db250ZXh0LFxuKTogTm9kZSB8IE5vZGVbXSB7XG4gIGNvbnN0IGVudiA9IGJhc2VNYWNyb0VudihtYWNyb0N0eCk7XG5cbiAgaWYgKHBhcmFtcy5sZW5ndGggPT09IDEpIHtcbiAgICBlbnYuc2V0KHBhcmFtc1swXSwgYXJncyk7XG4gIH0gZWxzZSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJhbXMubGVuZ3RoOyBpICs9IDEpIGVudi5zZXQocGFyYW1zW2ldLCBhcmdzW2ldID8/IGlkZW50KFwibnVsbFwiKSk7XG4gIH1cblxuICBmb3IgKGNvbnN0IFttYWNyb05hbWUsIG1hY3JvRW50cnldIG9mIHJlZ2lzdHJ5LmVudHJpZXMoKSkge1xuICAgIGVudi5zZXQobWFjcm9OYW1lLCAoLi4ubWFjcm9BcmdzOiBNYWNyb1ZhbHVlW10pID0+IHtcbiAgICAgIGNvbnN0IGFzTm9kZXMgPSBtYWNyb0FyZ3MubWFwKChhKSA9PiB0b05vZGUoYSkpO1xuICAgICAgaWYgKG1hY3JvRW50cnkua2luZCA9PT0gXCJuYXRpdmVcIikgcmV0dXJuIG1hY3JvRW50cnkuZm4oYXNOb2RlcywgbWFjcm9DdHgpO1xuICAgICAgcmV0dXJuIHJ1bk1ha3JlbGxNYWNyb0RlZihtYWNyb0VudHJ5LnBhcmFtcywgbWFjcm9FbnRyeS5ib2R5LCBhc05vZGVzLCByZWdpc3RyeSwgbWFjcm9DdHgpO1xuICAgIH0pO1xuICB9XG5cbiAgbGV0IG91dDogTWFjcm9WYWx1ZSA9IG51bGw7XG4gIHRyeSB7XG4gICAgZm9yIChjb25zdCBzdG10IG9mIGJvZHkpIG91dCA9IGV2YWxNYWNyb05vZGUoc3RtdCwgZW52LCBtYWNyb0N0eCk7XG4gIH0gY2F0Y2ggKHJldCkge1xuICAgIGlmIChyZXQgaW5zdGFuY2VvZiBSZXR1cm5TaWduYWwpIG91dCA9IHJldC52YWx1ZTtcbiAgICBlbHNlIHRocm93IHJldDtcbiAgfVxuXG4gIGlmIChpc05vZGUob3V0KSkgcmV0dXJuIG91dDtcbiAgaWYgKGlzTm9kZUxpc3Qob3V0KSkgcmV0dXJuIG91dDtcbiAgcmV0dXJuIHRvTm9kZShvdXQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lTWFrcmVsbE1hY3JvKG5hbWU6IHN0cmluZywgcGFyYW1zOiBzdHJpbmdbXSwgYm9keTogTm9kZVtdLCByZWdpc3RyeTogTWFjcm9SZWdpc3RyeSk6IE1hY3JvRm4ge1xuICByZWdpc3RyeS5yZWdpc3Rlck1ha3JlbGwobmFtZSwgcGFyYW1zLCBib2R5KTtcbiAgY29uc3QgZm46IE1hY3JvRm4gPSAoYXJnczogTm9kZVtdLCBtYWNyb0N0eDogTWFjcm9Db250ZXh0KTogTm9kZSB8IE5vZGVbXSA9PiB7XG4gICAgcmV0dXJuIHJ1bk1ha3JlbGxNYWNyb0RlZihwYXJhbXMsIGJvZHksIGFyZ3MsIHJlZ2lzdHJ5LCBtYWNyb0N0eCk7XG4gIH07XG4gIHJldHVybiBmbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlU2VyaWFsaXplZE1ha3JlbGxNYWNybyhwYXlsb2FkOiB7XG4gIHRhcmdldDogU2VyaWFsaXplZE1ha3JlbGxNYWNybztcbiAgYXJnczogTm9kZVtdO1xuICByZWdpc3RyeTogU2VyaWFsaXplZE1ha3JlbGxNYWNyb1tdO1xufSk6IE5vZGUgfCBOb2RlW10ge1xuICBjb25zdCByZWdpc3RyeSA9IG5ldyBNYWNyb1JlZ2lzdHJ5KCk7XG4gIGZvciAoY29uc3QgciBvZiBwYXlsb2FkLnJlZ2lzdHJ5KSB7XG4gICAgcmVnaXN0cnkucmVnaXN0ZXJNYWtyZWxsKHIubmFtZSwgci5wYXJhbXMsIHIuYm9keSk7XG4gIH1cbiAgcmV0dXJuIHJ1bk1ha3JlbGxNYWNyb0RlZihcbiAgICBwYXlsb2FkLnRhcmdldC5wYXJhbXMsXG4gICAgcGF5bG9hZC50YXJnZXQuYm9keSxcbiAgICBwYXlsb2FkLmFyZ3MsXG4gICAgcmVnaXN0cnksXG4gICAgZGVmYXVsdE1hY3JvQ29udGV4dCgpLFxuICApO1xufVxuIiwKICAiaW1wb3J0IHsgZXZhbHVhdGVTZXJpYWxpemVkTWFrcmVsbE1hY3JvIH0gZnJvbSBcIi4vbWFjcm9zXCI7XG5cbnR5cGUgUmVxdWVzdE1lc3NhZ2UgPSB7XG4gIGlkOiBzdHJpbmc7XG4gIHBheWxvYWQ6IFBhcmFtZXRlcnM8dHlwZW9mIGV2YWx1YXRlU2VyaWFsaXplZE1ha3JlbGxNYWNybz5bMF07XG59O1xuXG50eXBlIFJlc3BvbnNlTWVzc2FnZSA9XG4gIHwgeyBpZDogc3RyaW5nOyBvazogdHJ1ZTsgcmVzdWx0OiBSZXR1cm5UeXBlPHR5cGVvZiBldmFsdWF0ZVNlcmlhbGl6ZWRNYWtyZWxsTWFjcm8+IH1cbiAgfCB7IGlkOiBzdHJpbmc7IG9rOiBmYWxzZTsgZXJyb3I6IHN0cmluZyB9O1xuXG4vLyBCcm93c2VyIHdvcmtlciBlbnRyeXBvaW50IGZvciBtZXRhIG1hY3JvIGV2YWx1YXRpb24uXG5zZWxmLm9ubWVzc2FnZSA9IChldjogTWVzc2FnZUV2ZW50PFJlcXVlc3RNZXNzYWdlPikgPT4ge1xuICBjb25zdCBtc2cgPSBldi5kYXRhO1xuICBsZXQgb3V0OiBSZXNwb25zZU1lc3NhZ2U7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gZXZhbHVhdGVTZXJpYWxpemVkTWFrcmVsbE1hY3JvKG1zZy5wYXlsb2FkKTtcbiAgICBvdXQgPSB7IGlkOiBtc2cuaWQsIG9rOiB0cnVlLCByZXN1bHQgfTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgb3V0ID0geyBpZDogbXNnLmlkLCBvazogZmFsc2UsIGVycm9yOiBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogU3RyaW5nKGVycikgfTtcbiAgfVxuICAoc2VsZiBhcyB1bmtub3duIGFzIHsgcG9zdE1lc3NhZ2U6ICh4OiBSZXNwb25zZU1lc3NhZ2UpID0+IHZvaWQgfSkucG9zdE1lc3NhZ2Uob3V0KTtcbn07XG4iCiAgXSwKICAibWFwcGluZ3MiOiAiO0FBNkZPLFNBQVMsTUFBTSxDQUFDLEdBQXVCO0FBQzVDLE9BQUssWUFBWSxNQUFNO0FBQVUsV0FBTztBQUN4QyxRQUFNLElBQUssRUFBeUI7QUFDcEMsZ0JBQWMsTUFBTTtBQUFBO0FBdEJmLElBQU0sUUFBUSxDQUFDLE9BQWUsU0FBc0MsRUFBRSxNQUFNLGNBQWMsT0FBTyxJQUFJO0FBQ3JHLElBQU0sTUFBTSxDQUFDLE9BQWUsU0FBa0MsRUFBRSxNQUFNLFVBQVUsT0FBTyxJQUFJO0FBQzNGLElBQU0sTUFBTSxDQUFDLE9BQWUsU0FBa0MsRUFBRSxNQUFNLFVBQVUsT0FBTyxJQUFJO0FBQzNGLElBQU0sS0FBSyxDQUFDLE9BQWUsU0FBb0MsRUFBRSxNQUFNLFlBQVksT0FBTyxJQUFJO0FBQzlGLElBQU0sTUFBTSxDQUFDLE1BQVksVUFBa0IsT0FBYSxTQUFpQztBQUFBLEVBQzlGLE1BQU07QUFBQSxFQUNOO0FBQUEsRUFDQSxJQUFJO0FBQUEsRUFDSjtBQUFBLEVBQ0E7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LEdBQUc7QUFDakQsVUFBSSxNQUFNLFNBQVMsV0FBVztBQUM1QixZQUFJLEtBQUssRUFBRSxNQUFNLFFBQVEsTUFBTSxRQUFRLE1BQU0sTUFBTSxLQUFLLENBQUM7QUFBQSxNQUMzRDtBQUFBLElBQ0Y7QUFDQSxXQUFPO0FBQUE7QUFFWDs7O0FDN2lCQSxLQUFLLFlBQVksQ0FBQyxPQUFxQztBQUNyRCxRQUFNLE1BQU0sR0FBRztBQUNmLE1BQUk7QUFDSixNQUFJO0FBQ0YsVUFBTSxTQUFTLCtCQUErQixJQUFJLE9BQU87QUFDekQsVUFBTSxFQUFFLElBQUksSUFBSSxJQUFJLElBQUksTUFBTSxPQUFPO0FBQUEsV0FDOUIsS0FBUDtBQUNBLFVBQU0sRUFBRSxJQUFJLElBQUksSUFBSSxJQUFJLE9BQU8sT0FBTyxlQUFlLFFBQVEsSUFBSSxVQUFVLE9BQU8sR0FBRyxFQUFFO0FBQUE7QUFFekYsRUFBQyxLQUFrRSxZQUFZLEdBQUc7QUFBQTsiLAogICJkZWJ1Z0lkIjogIjdBOTA5RTIzOUJCOEE5Q0M2NDc1NmUyMTY0NzU2ZTIxIiwKICAibmFtZXMiOiBbXQp9
