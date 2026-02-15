import { CurlyBracketsNode, Node, SquareBracketsNode, isIdent } from "./ast";
import { MacroRegistry, defaultMacroContext, defineMakrellMacro } from "./macros";
import { parse } from "./parser";

export interface CompileOptions {
  macros?: MacroRegistry;
}

interface Ctx {
  macros: MacroRegistry;
  macroCtx: ReturnType<typeof defaultMacroContext>;
  fnDepth: number;
  tempId: number;
}

function nextTmp(ctx: Ctx): string {
  ctx.tempId += 1;
  return `__mr_tmp_${ctx.tempId}`;
}

function expandMacro(n: CurlyBracketsNode, ctx: Ctx): Node[] | null {
  if (n.nodes.length === 0) return null;
  const head = n.nodes[0];
  if (head.kind !== "identifier") return null;
  const macro = ctx.macros.get(head.value);
  if (!macro) return null;
  const out = macro(n.nodes.slice(1), ctx.macroCtx);
  return Array.isArray(out) ? out : [out];
}

function registerMacroDef(n: CurlyBracketsNode, ctx: Ctx): boolean {
  if (n.nodes.length < 5) return false;
  if (!isIdent(n.nodes[0], "def") || !isIdent(n.nodes[1], "macro")) return false;
  const nameNode = n.nodes[2];
  const paramsNode = n.nodes[3];
  if (nameNode.kind !== "identifier" || paramsNode.kind !== "square") {
    throw new Error("Macro definition must be {def macro name [params] ...}");
  }
  const params = paramsNode.nodes.map((p) => {
    if (p.kind !== "identifier") throw new Error("Macro params must be identifiers");
    return p.value;
  });
  const body = n.nodes.slice(4);
  defineMakrellMacro(nameNode.value, params, body, ctx.macros);
  return true;
}

function emitLiteralIdentifier(name: string): string {
  if (name === "true" || name === "false" || name === "null") return name;
  return name;
}

function compileAssignLeft(n: Node, ctx: Ctx): string {
  if (n.kind === "identifier") return n.value;
  if (n.kind === "binop" && n.op === ".") return `${compileExpr(n.left, ctx)}.${compileExpr(n.right, ctx)}`;
  throw new Error("Invalid assignment target");
}

function compileIfExpr(nodes: Node[], ctx: Ctx): string {
  if (nodes.length === 0) return "null";
  if (nodes.length === 1) return compileExpr(nodes[0], ctx);

  const walk = (start: number): string => {
    if (start >= nodes.length) return "null";
    if (start === nodes.length - 1) return compileExpr(nodes[start], ctx);
    const cond = compileExpr(nodes[start], ctx);
    const yes = compileExpr(nodes[start + 1], ctx);
    const no = walk(start + 2);
    return `(${cond} ? ${yes} : ${no})`;
  };

  return walk(0);
}

function compileDoExpr(nodes: Node[], ctx: Ctx): string {
  const body = compileBlock(nodes, ctx);
  return `(() => {${body}})()`;
}

function compileMatchExpr(nodes: Node[], ctx: Ctx): string {
  if (nodes.length === 0) return "null";
  const valueExpr = compileExpr(nodes[0], ctx);
  const tmp = nextTmp(ctx);

  const chunks: string[] = [];
  chunks.push(`const ${tmp} = ${valueExpr};`);

  for (let i = 1; i < nodes.length - 1; i += 2) {
    const patt = JSON.stringify(nodes[i]);
    const retval = compileExpr(nodes[i + 1], ctx);
    chunks.push(`if (__mr_matchPattern(${tmp}, ${patt})) return ${retval};`);
  }
  chunks.push("return null;");

  return `(() => {${chunks.join("\n")}})()`;
}

function compileFunExpr(nodes: Node[], ctx: Ctx): string {
  const rest = nodes.slice(1);
  let name = "";
  let argsNode: SquareBracketsNode | null = null;
  let bodyStart = 0;

  if (rest[0]?.kind === "identifier" && rest[1]?.kind === "square") {
    name = rest[0].value;
    argsNode = rest[1];
    bodyStart = 2;
  } else if (rest[0]?.kind === "square") {
    argsNode = rest[0];
    bodyStart = 1;
  } else {
    throw new Error("Invalid fun syntax. Expected {fun name [args] ...} or {fun [args] ...}");
  }

  const args = argsNode.nodes
    .map((n) => {
      if (n.kind !== "identifier") throw new Error("Function args must be identifiers");
      return n.value;
    })
    .join(", ");

  const innerCtx: Ctx = { ...ctx, fnDepth: ctx.fnDepth + 1 };
  const body = compileBlock(rest.slice(bodyStart), innerCtx);

  if (name) {
    return `(function ${name}(${args}) {${body}})`;
  }
  return `((${args}) => {${body}})`;
}

function compileCurly(n: CurlyBracketsNode, ctx: Ctx): string {
  if (registerMacroDef(n, ctx)) return "null";

  const expanded = expandMacro(n, ctx);
  if (expanded) {
    if (expanded.length === 0) return "null";
    if (expanded.length === 1) return compileExpr(expanded[0], ctx);
    return compileDoExpr(expanded, ctx);
  }

  if (n.nodes.length === 0) return "null";
  const head = n.nodes[0];

  if (isIdent(head, "if")) return compileIfExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "do")) return compileDoExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "match")) return compileMatchExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "fun")) return compileFunExpr(n.nodes, ctx);

  const callee = compileExpr(head, ctx);
  const args = n.nodes.slice(1).map((arg) => compileExpr(arg, ctx)).join(", ");
  return `${callee}(${args})`;
}

function compilePipe(left: Node, right: Node, ctx: Ctx): string {
  const leftExpr = compileExpr(left, ctx);
  if (right.kind === "identifier") return `${right.value}(${leftExpr})`;
  if (right.kind === "curly" && right.nodes.length > 0) {
    const head = compileExpr(right.nodes[0], ctx);
    const rest = right.nodes.slice(1).map((a) => compileExpr(a, ctx));
    return `${head}(${[leftExpr, ...rest].join(", ")})`;
  }
  return `${compileExpr(right, ctx)}(${leftExpr})`;
}

function compileExpr(n: Node, ctx: Ctx): string {
  switch (n.kind) {
    case "identifier":
      return emitLiteralIdentifier(n.value);
    case "string":
      return JSON.stringify(n.value);
    case "number":
      return n.value;
    case "round":
      if (n.nodes.length === 0) return "null";
      if (n.nodes.length === 1) return `(${compileExpr(n.nodes[0], ctx)})`;
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
      if (n.op === "|") return compilePipe(n.left, n.right, ctx);
      if (n.op === "->") {
        let args: string[] = [];
        if (n.left.kind === "identifier") args = [n.left.value];
        else if (n.left.kind === "square") {
          args = n.left.nodes.map((x) => {
            if (x.kind !== "identifier") throw new Error("Lambda args must be identifiers");
            return x.value;
          });
        } else {
          throw new Error("Invalid lambda args");
        }
        return `((${args.join(", ")}) => (${compileExpr(n.right, ctx)}))`;
      }
      if (n.op === ".") return `${compileExpr(n.left, ctx)}.${compileExpr(n.right, ctx)}`;
      return `(${compileExpr(n.left, ctx)} ${n.op} ${compileExpr(n.right, ctx)})`;
    }
    case "operator":
      throw new Error(`Unexpected standalone operator '${n.value}'`);
    case "sequence":
      return compileDoExpr(n.nodes, ctx);
    default:
      throw new Error(`Unknown node kind: ${(n as Node).kind}`);
  }
}

function isFunDecl(n: Node): n is CurlyBracketsNode {
  return n.kind === "curly" && n.nodes.length >= 3 && isIdent(n.nodes[0], "fun") && n.nodes[1].kind === "identifier";
}

function isMacroDecl(n: Node): n is CurlyBracketsNode {
  return n.kind === "curly" && n.nodes.length >= 5 && isIdent(n.nodes[0], "def") && isIdent(n.nodes[1], "macro");
}

function compileStmt(n: Node, ctx: Ctx, isLast: boolean): string {
  if (isMacroDecl(n)) {
    registerMacroDef(n, ctx);
    return "";
  }

  if (n.kind === "curly") {
    const expanded = expandMacro(n, ctx);
    if (expanded) {
      if (expanded.length === 0) return isLast ? "return null;" : "";
      const parts: string[] = [];
      for (let i = 0; i < expanded.length; i += 1) {
        const part = compileStmt(expanded[i], ctx, isLast && i === expanded.length - 1);
        if (part) parts.push(part);
      }
      return parts.join("\n");
    }
  }

  if (isFunDecl(n)) {
    const fnName = (n.nodes[1] as { value: string }).value;
    const fnExpr = compileFunExpr(n.nodes, ctx);
    return `const ${fnName} = ${fnExpr};`;
  }

  if (n.kind === "binop" && n.op === "=" && n.left.kind === "identifier") {
    const rhs = compileExpr(n.right, ctx);
    const assign = `var ${n.left.value} = ${rhs};`;
    if (isLast) return `${assign}\nreturn ${n.left.value};`;
    return assign;
  }

  if (n.kind === "curly" && n.nodes.length > 0 && isIdent(n.nodes[0], "return")) {
    const val = n.nodes[1] ? compileExpr(n.nodes[1], ctx) : "null";
    return `return ${val};`;
  }

  const expr = compileExpr(n, ctx);
  if (isLast) return `return ${expr};`;
  return `${expr};`;
}

function compileBlock(nodes: Node[], ctx: Ctx): string {
  const lines: string[] = [];
  const filtered = nodes.filter(Boolean);
  for (let i = 0; i < filtered.length; i += 1) {
    const line = compileStmt(filtered[i], ctx, i === filtered.length - 1);
    if (line) lines.push(line);
  }
  if (lines.length === 0) lines.push("return null;");
  return lines.join("\n");
}

export function compileToJs(src: string, options: CompileOptions = {}): string {
  const ctx: Ctx = {
    macros: options.macros ?? new MacroRegistry(),
    macroCtx: defaultMacroContext(),
    fnDepth: 0,
    tempId: 0,
  };

  const nodes = parse(src);
  const body = compileBlock(nodes, ctx);
  return `(() => {\n${body}\n})()`;
}
