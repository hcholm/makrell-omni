import { CurlyBracketsNode, Node, SourceSpan, SquareBracketsNode, isIdent } from "./ast";
import {
  MakrellMacroEntry,
  MacroRegistry,
  SerializedMakrellMacro,
  defaultMacroContext,
  defineMakrellMacro,
  runMakrellMacroDef,
} from "./macros";
import type { MetaRuntimeAdapter } from "./meta_runtime";
import { parse } from "./parser";

export interface CompileOptions {
  macros?: MacroRegistry;
  metaRuntime?: MetaRuntimeAdapter;
  moduleResolver?: (moduleName: string) => Record<string, unknown>;
  metaModuleResolver?: (moduleName: string) => { __mr_meta__?: SerializedMakrellMacro[] } | null;
}

type EmitTarget = "js" | "ts";

export interface CompileDiagnostic {
  message: string;
  loc?: SourceSpan;
}

export class CompileFailure extends Error {
  diagnostic: CompileDiagnostic;

  constructor(diagnostic: CompileDiagnostic) {
    const where = diagnostic.loc
      ? ` [line ${diagnostic.loc.start.line}, col ${diagnostic.loc.start.column}]`
      : "";
    super(`${diagnostic.message}${where}`);
    this.diagnostic = diagnostic;
  }
}

interface Ctx {
  macros: MacroRegistry;
  macroCtx: ReturnType<typeof defaultMacroContext>;
  metaRuntime: MetaRuntimeAdapter;
  moduleResolver?: (moduleName: string) => Record<string, unknown>;
  metaModuleResolver?: (moduleName: string) => { __mr_meta__?: SerializedMakrellMacro[] } | null;
  fnDepth: number;
  asyncDepth: number;
  tempId: number;
  thisAlias?: string;
  emitTarget: EmitTarget;
}

class InlineMetaRuntimeAdapter implements MetaRuntimeAdapter {
  kind = "inline";

  runMakrellMacro(_name: string, macro: MakrellMacroEntry, args: Node[], registry: MacroRegistry): Node | Node[] {
    return runMakrellMacroDef(macro.params, macro.body, args, registry, defaultMacroContext());
  }
}

function nextTmp(ctx: Ctx): string {
  ctx.tempId += 1;
  return `__mr_tmp_${ctx.tempId}`;
}

function fail(message: string, node?: Node): never {
  throw new CompileFailure({ message, loc: node?.loc });
}

function expandMacro(n: CurlyBracketsNode, ctx: Ctx): Node[] | null {
  if (n.nodes.length === 0) return null;
  const head = n.nodes[0];
  if (head.kind !== "identifier") return null;
  const entry = ctx.macros.getEntry(head.value);
  if (!entry) return null;
  const out = entry.kind === "native"
    ? entry.fn(n.nodes.slice(1), ctx.macroCtx)
    : ctx.metaRuntime.runMakrellMacro(head.value, entry, n.nodes.slice(1), ctx.macros);
  return Array.isArray(out) ? out : [out];
}

function registerMacroDef(n: CurlyBracketsNode, ctx: Ctx): boolean {
  if (n.nodes.length < 5) return false;
  if (!isIdent(n.nodes[0], "def") || !isIdent(n.nodes[1], "macro")) return false;
  const nameNode = n.nodes[2];
  const paramsNode = n.nodes[3];
  if (nameNode.kind !== "identifier" || paramsNode.kind !== "square") {
    fail("Macro definition must be {def macro name [params] ...}", n);
  }
  const params = paramsNode.nodes.map((p) => {
    if (p.kind !== "identifier") fail("Macro params must be identifiers", p);
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

function emitTypeNode(n: Node): string {
  if (n.kind === "identifier") {
    if (n.value === "str") return "string";
    if (n.value === "int" || n.value === "float") return "number";
    if (n.value === "bool") return "boolean";
    if (n.value === "list") return "unknown[]";
    if (n.value === "dict") return "Record<string, unknown>";
    if (n.value === "null") return "null";
    return n.value;
  }
  if (n.kind === "string") return JSON.stringify(n.value);
  if (n.kind === "number") return n.value;
  if (n.kind === "binop" && n.op === "|") return `${emitTypeNode(n.left)} | ${emitTypeNode(n.right)}`;
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

function compileAssignLeft(n: Node, ctx: Ctx): string {
  if (n.kind === "binop" && n.op === ":") return compileAssignLeft(n.left, ctx);
  if (n.kind === "identifier") return n.value;
  if (n.kind === "binop" && n.op === ".") return `${compileExpr(n.left, ctx)}.${compileExpr(n.right, ctx)}`;
  fail("Invalid assignment target", n);
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

function wrapIife(body: string, needsAsync: boolean): string {
  if (needsAsync) return `(async () => {${body}})()`;
  return `(() => {${body}})()`;
}

function nodeNeedsAsyncContext(n: Node): boolean {
  switch (n.kind) {
    case "curly":
      if (n.nodes.length === 0) return false;
      if (isIdent(n.nodes[0], "await")) return true;
      if (isIdent(n.nodes[0], "fun")) return false;
      if (isIdent(n.nodes[0], "async") && isIdent(n.nodes[1], "fun")) return false;
      if (isIdent(n.nodes[0], "class")) return false;
      return n.nodes.some((child) => nodeNeedsAsyncContext(child));
    case "round":
    case "square":
    case "sequence":
      return n.nodes.some((child) => nodeNeedsAsyncContext(child));
    case "binop":
      return nodeNeedsAsyncContext(n.left) || nodeNeedsAsyncContext(n.right);
    default:
      return false;
  }
}

function listNeedsAsyncContext(nodes: Node[]): boolean {
  return nodes.some((node) => nodeNeedsAsyncContext(node));
}

function compileDoExpr(nodes: Node[], ctx: Ctx): string {
  const body = compileBlock(nodes, ctx, true);
  return wrapIife(body, listNeedsAsyncContext(nodes));
}

function compileMatchExpr(nodes: Node[], ctx: Ctx): string {
  if (nodes.length === 0) return "null";
  const valueExpr = compileExpr(nodes[0], ctx);
  if (nodes.length === 2) {
    const patt = JSON.stringify(nodes[1]);
    return `__mr_matchPattern(${valueExpr}, ${patt})`;
  }
  const tmp = nextTmp(ctx);

  const chunks: string[] = [];
  chunks.push(`const ${tmp} = ${valueExpr};`);

  for (let i = 1; i < nodes.length - 1; i += 2) {
    const patt = JSON.stringify(nodes[i]);
    const retval = compileExpr(nodes[i + 1], ctx);
    chunks.push(`if (__mr_matchPattern(${tmp}, ${patt})) return ${retval};`);
  }
  chunks.push("return null;");

  return wrapIife(chunks.join("\n"), listNeedsAsyncContext(nodes));
}

interface ParsedFunExpr {
  isAsync: boolean;
  name: string;
  argsNode: SquareBracketsNode;
  bodyStart: number;
}

function parseFunExpr(nodes: Node[]): ParsedFunExpr {
  const asyncOffset = isIdent(nodes[0], "async") ? 1 : 0;
  const funNode = nodes[asyncOffset];
  if (!isIdent(funNode, "fun")) {
    fail("Invalid fun syntax. Expected {fun ...} or {async fun ...}", nodes[0]);
  }

  const rest = nodes.slice(asyncOffset + 1);
  let name = "";
  let argsNode: SquareBracketsNode | null = null;
  let bodyStart = asyncOffset + 1;

  if (rest[0]?.kind === "identifier" && rest[1]?.kind === "square") {
    name = rest[0].value;
    argsNode = rest[1];
    bodyStart = asyncOffset + 3;
  } else if (rest[0]?.kind === "square") {
    argsNode = rest[0];
    bodyStart = asyncOffset + 2;
  } else {
    fail("Invalid fun syntax. Expected {fun name [args] ...} or {fun [args] ...}", funNode);
  }

  return {
    isAsync: asyncOffset === 1,
    name,
    argsNode,
    bodyStart,
  };
}

function compileFunExpr(nodes: Node[], ctx: Ctx): string {
  const parsed = parseFunExpr(nodes);

  const args = parsed.argsNode.nodes
    .map((n) => {
      if (n.kind === "identifier") return n.value;
      if (n.kind === "binop" && n.op === ":" && n.left.kind === "identifier") {
        if (ctx.emitTarget === "ts") return `${n.left.value}: ${emitTypeNode(n.right)}`;
        return n.left.value;
      }
      fail("Function args must be identifiers or typed identifiers", n);
    })
    .join(", ");

  const innerCtx: Ctx = {
    ...ctx,
    fnDepth: ctx.fnDepth + 1,
    asyncDepth: ctx.asyncDepth + (parsed.isAsync ? 1 : 0),
  };
  const body = compileBlock(nodes.slice(parsed.bodyStart), innerCtx, true);
  const prefix = parsed.isAsync ? "async " : "";

  if (parsed.name) {
    return `(${prefix}function ${parsed.name}(${args}) {${body}})`;
  }
  return `(${prefix}(${args}) => {${body}})`;
}

function compileWhenExpr(nodes: Node[], ctx: Ctx): string {
  if (nodes.length === 0) return "null";
  const cond = compileExpr(nodes[0], ctx);
  const thenBody = compileBlock(nodes.slice(1), ctx, true);
  return wrapIife(`if (${cond}) { ${thenBody} }\nreturn null;`, listNeedsAsyncContext(nodes));
}

function compileWhileExpr(nodes: Node[], ctx: Ctx): string {
  if (nodes.length === 0) return "null";
  const cond = compileExpr(nodes[0], ctx);
  const body = compileBlock(nodes.slice(1), ctx, false);
  return wrapIife(`while (${cond}) { ${body} }\nreturn null;`, listNeedsAsyncContext(nodes));
}

function compileForExpr(nodes: Node[], ctx: Ctx): string {
  if (nodes.length < 2) return "null";
  const target = nodes[0];
  if (target.kind !== "identifier") fail("for target must be identifier", target);
  const iterable = compileExpr(nodes[1], ctx);
  const body = compileBlock(nodes.slice(2), ctx, false);
  return wrapIife(`for (const ${target.value} of ${iterable}) { ${body} }\nreturn null;`, listNeedsAsyncContext(nodes));
}

function compileAsyncExpr(nodes: Node[], ctx: Ctx): string {
  if (nodes.length < 2) fail("Invalid async syntax", nodes[0]);
  if (isIdent(nodes[1], "fun")) return compileFunExpr(nodes, ctx);
  fail("MakrellTS currently supports {async fun ...} as the shared async form", nodes[1]);
}

function compileAwaitExpr(nodes: Node[], ctx: Ctx): string {
  if (nodes.length !== 1) fail("await expects exactly one expression", nodes[0]);
  if (ctx.asyncDepth <= 0) {
    fail("await must be used inside {async fun ...} or async top-level code", nodes[0]);
  }
  return `(await ${compileExpr(nodes[0], ctx)})`;
}

function compileMethod(n: CurlyBracketsNode, ctx: Ctx): string {
  const parsed = parseFunExpr(n.nodes);
  if (!parsed.name) fail("Class methods must use {fun name [args] ...}", n);
  const rawName = parsed.name;
  const methodName = rawName === "__init__" ? "constructor" : rawName;
  if (parsed.isAsync && methodName === "constructor") {
    fail("Class constructors cannot be async in MakrellTS", n);
  }
  const argNodes = parsed.argsNode.nodes;
  const params: string[] = [];
  for (let i = 0; i < argNodes.length; i += 1) {
    const arg = argNodes[i];
    let name = "";
    if (arg.kind === "identifier") name = arg.value;
    else if (arg.kind === "binop" && arg.op === ":" && arg.left.kind === "identifier") {
      name = ctx.emitTarget === "ts" ? `${arg.left.value}: ${emitTypeNode(arg.right)}` : arg.left.value;
    }
    else fail("Method arguments must be identifiers or typed identifiers", arg);
    if (i === 0 && name === "self") continue;
    params.push(name);
  }
  const methodCtx: Ctx = {
    ...ctx,
    fnDepth: ctx.fnDepth + 1,
    asyncDepth: ctx.asyncDepth + (parsed.isAsync ? 1 : 0),
    thisAlias: "self",
  };
  const body = compileBlock(n.nodes.slice(parsed.bodyStart), methodCtx, methodName !== "constructor");
  const asyncPrefix = parsed.isAsync ? "async " : "";
  return `${asyncPrefix}${methodName}(${params.join(", ")}) {${body}}`;
}

function compileClassExpr(nodes: Node[], ctx: Ctx): string {
  if (nodes.length < 2 || nodes[1].kind !== "identifier") {
    fail("class requires name identifier", nodes[0]);
  }
  const className = nodes[1].value;
  let bodyStart = 2;
  if (nodes[2]?.kind === "square") bodyStart = 3;
  const parts: string[] = [];
  for (const n of nodes.slice(bodyStart)) {
    if (n.kind === "curly" && (isIdent(n.nodes[0], "fun") || (isIdent(n.nodes[0], "async") && isIdent(n.nodes[1], "fun")))) {
      parts.push(compileMethod(n, ctx));
    }
  }
  return `class ${className} {${parts.join("\n")}}`;
}

function nodeToModuleName(n: Node): string {
  if (n.kind === "identifier") return n.value;
  if (n.kind === "binop" && n.op === ".") return `${nodeToModuleName(n.left)}.${nodeToModuleName(n.right)}`;
  fail("Invalid module identifier", n);
}

function parseImportFromNames(n: Node): string[] {
  if (n.kind === "square" || n.kind === "round") {
    return n.nodes
      .map((x) => {
        if (x.kind !== "identifier") fail("import from names must be identifiers", x);
        return x.value;
      });
  }
  fail("Invalid import from list", n);
}

function compileImportExpr(nodes: Node[]): string {
  const steps: string[] = [];
  for (const n of nodes) {
    if (n.kind === "identifier" || (n.kind === "binop" && n.op === ".")) {
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
}

function applyImportm(nodes: Node[], ctx: Ctx): void {
  const resolver = ctx.metaModuleResolver ?? ((name: string) => ctx.moduleResolver?.(name) as { __mr_meta__?: SerializedMakrellMacro[] } | null);
  if (!resolver) fail("importm requires a meta module resolver");

  const applyModule = (moduleName: string, names?: string[]): void => {
    const mod = resolver(moduleName);
    if (!mod || !Array.isArray(mod.__mr_meta__)) {
      fail(`Module '${moduleName}' has no __mr_meta__ definitions`);
    }
    const wanted = names ? new Set(names) : null;
    for (const entry of mod.__mr_meta__) {
      if (wanted && !wanted.has(entry.name)) continue;
      defineMakrellMacro(entry.name, entry.params, entry.body, ctx.macros);
    }
  };

  for (const n of nodes) {
    if (n.kind === "identifier" || (n.kind === "binop" && n.op === ".")) {
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
  if (isIdent(head, "when")) return compileWhenExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "while")) return compileWhileExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "for")) return compileForExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "import")) return compileImportExpr(n.nodes.slice(1));
  if (isIdent(head, "importm")) {
    applyImportm(n.nodes.slice(1), ctx);
    return "null";
  }
  if (isIdent(head, "match")) return compileMatchExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "async")) return compileAsyncExpr(n.nodes, ctx);
  if (isIdent(head, "await")) return compileAwaitExpr(n.nodes.slice(1), ctx);
  if (isIdent(head, "fun")) return compileFunExpr(n.nodes, ctx);
  if (isIdent(head, "class")) return compileClassExpr(n.nodes, ctx);
  if (isIdent(head, "new")) {
    if (n.nodes.length < 2) fail("new requires constructor expression", n);
    const ctorExpr = compileExpr(n.nodes[1], ctx);
    const rawArgs = n.nodes.slice(2);
    if (rawArgs.length === 1 && rawArgs[0].kind === "square") {
      const args = rawArgs[0].nodes.map((arg) => compileExpr(arg, ctx)).join(", ");
      return `new ${ctorExpr}(${args})`;
    }
    const args = rawArgs.map((arg) => compileExpr(arg, ctx)).join(", ");
    return `new ${ctorExpr}(${args})`;
  }

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
      if (ctx.thisAlias && n.value === ctx.thisAlias) return "this";
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
          fail("Invalid lambda args", n.left);
        }
        return `((${args.join(", ")}) => (${compileExpr(n.right, ctx)}))`;
      }
      if (n.op === ".") return `${compileExpr(n.left, ctx)}.${compileExpr(n.right, ctx)}`;
      if (n.op === ":") return compileExpr(n.left, ctx);
      return `(${compileExpr(n.left, ctx)} ${n.op} ${compileExpr(n.right, ctx)})`;
    }
    case "operator":
      fail(`Unexpected standalone operator '${n.value}'`, n);
    case "sequence":
      return compileDoExpr(n.nodes, ctx);
    default:
      fail(`Unknown node kind: ${(n as Node).kind}`, n);
  }
}

function isFunDecl(n: Node): n is CurlyBracketsNode {
  return n.kind === "curly" && (
    (n.nodes.length >= 3 && isIdent(n.nodes[0], "fun") && n.nodes[1].kind === "identifier") ||
    (n.nodes.length >= 4 && isIdent(n.nodes[0], "async") && isIdent(n.nodes[1], "fun") && n.nodes[2].kind === "identifier")
  );
}

function isMacroDecl(n: Node): n is CurlyBracketsNode {
  return n.kind === "curly" && n.nodes.length >= 5 && isIdent(n.nodes[0], "def") && isIdent(n.nodes[1], "macro");
}

function isClassDecl(n: Node): n is CurlyBracketsNode {
  return n.kind === "curly" && n.nodes.length >= 2 && isIdent(n.nodes[0], "class") && n.nodes[1].kind === "identifier";
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
    const fnName = parseFunExpr(n.nodes).name;
    const fnExpr = compileFunExpr(n.nodes, ctx);
    return `const ${fnName} = ${fnExpr};`;
  }

  if (isClassDecl(n)) {
    const classExpr = compileClassExpr(n.nodes, ctx);
    if (isLast) return `${classExpr};\nreturn ${(n.nodes[1] as { value: string }).value};`;
    return `${classExpr};`;
  }

  if (n.kind === "binop" && n.op === "=" && n.left.kind === "identifier") {
    const rhsExpr = compileExpr(n.right, ctx);
    const rhs = ctx.asyncDepth > 0 && nodeNeedsAsyncContext(n.right) ? `await ${rhsExpr}` : rhsExpr;
    const assign = `var ${n.left.value} = ${rhs};`;
    if (isLast) return `${assign}\nreturn ${n.left.value};`;
    return assign;
  }
  if (n.kind === "binop" && n.op === "=" && n.left.kind === "binop" && n.left.op === ":" && n.left.left.kind === "identifier") {
    const rhsExpr = compileExpr(n.right, ctx);
    const rhs = ctx.asyncDepth > 0 && nodeNeedsAsyncContext(n.right) ? `await ${rhsExpr}` : rhsExpr;
    const t = emitTypeNode(n.left.right);
    const decl = ctx.emitTarget === "ts"
      ? `var ${n.left.left.value}: ${t} = ${rhs};`
      : `var ${n.left.left.value} = ${rhs};`;
    if (isLast) return `${decl}\nreturn ${n.left.left.value};`;
    return decl;
  }

  if (n.kind === "curly" && n.nodes.length > 0 && isIdent(n.nodes[0], "return")) {
    const valExpr = n.nodes[1] ? compileExpr(n.nodes[1], ctx) : "null";
    const val = n.nodes[1] && ctx.asyncDepth > 0 && nodeNeedsAsyncContext(n.nodes[1])
      ? `await ${valExpr}`
      : valExpr;
    return `return ${val};`;
  }

  const exprBase = compileExpr(n, ctx);
  const expr = ctx.asyncDepth > 0 && nodeNeedsAsyncContext(n) ? `await ${exprBase}` : exprBase;
  if (isLast) return `return ${expr};`;
  return `${expr};`;
}

function compileBlock(nodes: Node[], ctx: Ctx, autoReturn: boolean): string {
  const lines: string[] = [];
  const filtered = nodes.filter(Boolean);
  for (let i = 0; i < filtered.length; i += 1) {
    const line = compileStmt(filtered[i], ctx, autoReturn && i === filtered.length - 1);
    if (line) lines.push(line);
  }
  if (lines.length === 0 && autoReturn) lines.push("return null;");
  return lines.join("\n");
}

export function compileToJs(src: string, options: CompileOptions = {}): string {
  const nodes = parse(src);
  const topLevelAsync = listNeedsAsyncContext(nodes);
  const ctx: Ctx = {
    macros: options.macros ?? new MacroRegistry(),
    macroCtx: defaultMacroContext(),
    metaRuntime: options.metaRuntime ?? new InlineMetaRuntimeAdapter(),
    moduleResolver: options.moduleResolver,
    metaModuleResolver: options.metaModuleResolver,
    fnDepth: 0,
    asyncDepth: topLevelAsync ? 1 : 0,
    tempId: 0,
    emitTarget: "js",
  };

  const body = compileBlock(nodes, ctx, true);
  return topLevelAsync ? `(async () => {\n${body}\n})()` : `(() => {\n${body}\n})()`;
}

export function compileToTs(src: string, options: CompileOptions = {}): string {
  const nodes = parse(src);
  const topLevelAsync = listNeedsAsyncContext(nodes);
  const ctx: Ctx = {
    macros: options.macros ?? new MacroRegistry(),
    macroCtx: defaultMacroContext(),
    metaRuntime: options.metaRuntime ?? new InlineMetaRuntimeAdapter(),
    moduleResolver: options.moduleResolver,
    metaModuleResolver: options.metaModuleResolver,
    fnDepth: 0,
    asyncDepth: topLevelAsync ? 1 : 0,
    tempId: 0,
    emitTarget: "ts",
  };
  const body = compileBlock(nodes, ctx, true);
  return topLevelAsync ? `(async () => {\n${body}\n})()` : `(() => {\n${body}\n})()`;
}

export function compileToDts(src: string): string {
  const nodes = parse(src);
  const out: string[] = [];

  const emitArgDecl = (n: Node): string => {
    if (n.kind === "identifier") return `${n.value}: unknown`;
    if (n.kind === "binop" && n.op === ":" && n.left.kind === "identifier") return `${n.left.value}: ${emitTypeNode(n.right)}`;
    return "arg: unknown";
  };

  for (const n of nodes) {
    if (isFunDecl(n)) {
      const parsed = parseFunExpr(n.nodes);
      const name = parsed.name;
      const argsNode = parsed.argsNode;
      const args = argsNode.kind === "square" ? argsNode.nodes.map(emitArgDecl).join(", ") : "";
      const retType = parsed.isAsync ? "Promise<unknown>" : "unknown";
      out.push(`export function ${name}(${args}): ${retType};`);
      continue;
    }
    if (n.kind === "curly" && n.nodes.length >= 2 && isIdent(n.nodes[0], "class") && n.nodes[1].kind === "identifier") {
      out.push(`export class ${n.nodes[1].value} {}`);
      continue;
    }
    if (n.kind === "binop" && n.op === "=" && n.left.kind === "binop" && n.left.op === ":" && n.left.left.kind === "identifier") {
      out.push(`export let ${n.left.left.value}: ${emitTypeNode(n.left.right)};`);
      continue;
    }
    if (n.kind === "binop" && n.op === "=" && n.left.kind === "identifier") {
      out.push(`export let ${n.left.value}: unknown;`);
    }
  }

  if (out.length === 0) out.push("export {};");
  return out.join("\n");
}
