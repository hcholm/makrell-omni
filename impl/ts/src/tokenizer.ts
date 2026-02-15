import { Node, SourcePos, SourceSpan, ident, num, op, str } from "./ast";

const multiOps = ["==", "!=", "<=", ">=", "&&", "||", "->", "**", ".."];
const singleOps = new Set("+-*/%=<>|&.:@'\\".split(""));

export interface BracketToken {
  kind: "lpar" | "rpar";
  value: string;
  loc: SourceSpan;
}

type Tok = Node | BracketToken;

function isSpace(ch: string): boolean {
  return ch === " " || ch === "\n" || ch === "\t" || ch === "\r";
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_$]/.test(ch);
}

function isIdentBody(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch);
}

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  let line = 1;
  let column = 1;

  const pos = (): SourcePos => ({ index: i, line, column });
  const span = (start: SourcePos, end: SourcePos): SourceSpan => ({ start, end });
  const advance = (count = 1): void => {
    for (let k = 0; k < count; k += 1) {
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
      while (i < src.length && src[i] !== "\n") advance(1);
      continue;
    }

    if (ch === '"') {
      const start = pos();
      let j = i + 1;
      let escaped = false;
      while (j < src.length) {
        const c = src[j];
        if (!escaped && c === '"') break;
        escaped = !escaped && c === "\\";
        if (c !== "\\") escaped = false;
        j += 1;
      }
      if (j >= src.length) throw new Error("Unterminated string literal");
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

    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(src[i + 1] ?? ""))) {
      const start = pos();
      let j = i;
      if (src[j] === "-") j += 1;
      while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      if (src[j] === "." && /[0-9]/.test(src[j + 1] ?? "")) {
        j += 1;
        while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      }
      const value = src.slice(i, j);
      advance(j - i);
      out.push(num(value, span(start, pos())));
      continue;
    }

    if (isIdentStart(ch)) {
      const start = pos();
      let j = i + 1;
      while (j < src.length && isIdentBody(src[j])) j += 1;
      const value = src.slice(i, j);
      advance(j - i);
      out.push(ident(value, span(start, pos())));
      continue;
    }

    throw new Error(`Unexpected token near: ${src.slice(i, i + 16)}`);
  }

  return out;
}
