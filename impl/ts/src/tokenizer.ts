import { Node, ident, num, op, str } from "./ast";

const multiOps = ["==", "!=", "<=", ">=", "&&", "||", "->", "**", ".."];
const singleOps = new Set("+-*/%=<>|&.:@'\\".split(""));

function isSpace(ch: string): boolean {
  return ch === " " || ch === "\n" || ch === "\t" || ch === "\r";
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_$]/.test(ch);
}

function isIdentBody(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch);
}

export function tokenize(src: string): Array<Node | { kind: "lpar" | "rpar"; value: string }> {
  const out: Array<Node | { kind: "lpar" | "rpar"; value: string }> = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (isSpace(ch)) {
      i += 1;
      continue;
    }

    if (ch === "#") {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }

    if (ch === '"') {
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
      out.push(str(src.slice(i + 1, j)));
      i = j + 1;
      continue;
    }

    if (ch === "(" || ch === "[" || ch === "{") {
      out.push({ kind: "lpar", value: ch });
      i += 1;
      continue;
    }

    if (ch === ")" || ch === "]" || ch === "}") {
      out.push({ kind: "rpar", value: ch });
      i += 1;
      continue;
    }

    const maybeOp2 = src.slice(i, i + 2);
    if (multiOps.includes(maybeOp2)) {
      out.push(op(maybeOp2));
      i += 2;
      continue;
    }

    if (singleOps.has(ch)) {
      out.push(op(ch));
      i += 1;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === "-" && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      if (src[j] === "-") j += 1;
      while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      if (src[j] === "." && /[0-9]/.test(src[j + 1] ?? "")) {
        j += 1;
        while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      }
      out.push(num(src.slice(i, j)));
      i = j;
      continue;
    }

    if (isIdentStart(ch)) {
      let j = i + 1;
      while (j < src.length && isIdentBody(src[j])) j += 1;
      out.push(ident(src.slice(i, j)));
      i = j;
      continue;
    }

    throw new Error(`Unexpected token near: ${src.slice(i, i + 16)}`);
  }

  return out;
}