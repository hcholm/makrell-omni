import { applyBasicSuffixProfile } from "./basic_suffix_profile";

export type MrtdScalarType = "int" | "float" | "bool" | "string";
export interface MrtdColumn {
  name: string;
  type?: MrtdScalarType;
}

export interface MrtdRow {
  cells: unknown[];
}

export interface MrtdDocument {
  columns: MrtdColumn[];
  rows: MrtdRow[];
  records: Record<string, unknown>[];
}

export interface MrtdOptions {
  /**
   * Reserved for future optional MRTD extensions.
   * The shared basic suffix profile is part of current MRTD core parsing and
   * does not need to be enabled here.
   */
  profiles?: readonly string[];
}

const declaredTypes = new Set<MrtdScalarType>(["int", "float", "bool", "string"]);
const identifierRx = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const quotedStringRx = /^"((?:\\.|[^"\\])*)"([A-Za-z0-9_$]*)$/s;
const numberRx = /^(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)([A-Za-z0-9_$]*)$/;
export function parseMrtd(source: string, options: MrtdOptions = {}): MrtdDocument {
  const rows = splitRootRows(source);
  if (rows.length === 0) {
    return { columns: [], rows: [], records: [] };
  }

  const columns = parseHeaderRow(rows[0]);
  const dataRows = rows.slice(1).map((row, index) => parseDataRow(row, columns, index + 2, options));
  const records = dataRows.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      record[column.name] = row.cells[index];
    });
    return record;
  });

  return {
    columns,
    rows: dataRows,
    records,
  };
}

export function readMrtdRecords<T extends object>(source: string, ctorOrOptions?: (new () => T) | MrtdOptions, maybeOptions?: MrtdOptions): T[] {
  const ctor = typeof ctorOrOptions === "function" ? ctorOrOptions : undefined;
  const options = (typeof ctorOrOptions === "function" ? maybeOptions : ctorOrOptions) ?? {};
  const document = parseMrtd(source, options);
  if (!ctor) {
    return document.records as T[];
  }

  return document.records.map((record) => {
    const instance = new ctor();
    for (const [key, value] of Object.entries(record)) {
      (instance as Record<string, unknown>)[key] = value;
    }
    return instance;
  });
}

export function readMrtdTuples<T extends unknown[]>(source: string, options: MrtdOptions = {}): T[] {
  const document = parseMrtd(source, options);
  return document.rows.map((row) => [...row.cells] as T);
}

export function writeMrtdRecords<T extends object>(rows: readonly T[], options: MrtdOptions = {}): string {
  if (rows.length === 0) {
    throw new Error("Cannot write MRTD records from an empty row sequence.");
  }

  const firstRow = toRecordLike(rows[0]);
  const headers = Object.keys(firstRow);
  if (headers.length === 0) {
    throw new Error("Cannot write MRTD records from an object with no enumerable fields.");
  }

  const headerCells = headers.map((header) => formatHeaderCell(header, inferScalarType(rows, header)));
  const lines = [headerCells.join(" ")];
  for (const row of rows) {
    const record = toRecordLike(row);
    lines.push(headers.map((header) => formatScalar(record[header], options)).join(" "));
  }

  return lines.join("\n");
}

export function writeMrtdTuples(
  rows: readonly (readonly unknown[])[],
  headersOrOptions?: readonly string[] | MrtdOptions,
  maybeOptions?: MrtdOptions,
): string {
  if (rows.length === 0) {
    throw new Error("Cannot write MRTD tuples from an empty row sequence.");
  }

  const width = rows[0].length;
  if (width === 0) {
    throw new Error("Cannot write MRTD tuples with zero columns.");
  }

  for (const row of rows) {
    if (row.length !== width) {
      throw new Error(`MRTD tuple row width mismatch: expected ${width}, got ${row.length}.`);
    }
  }

  const headers = Array.isArray(headersOrOptions) ? headersOrOptions : undefined;
  const options = (Array.isArray(headersOrOptions) ? maybeOptions : headersOrOptions) ?? {};
  const actualHeaders = headers && headers.length > 0
    ? [...headers]
    : Array.from({ length: width }, (_, index) => `c${index + 1}`);
  if (actualHeaders.length !== width) {
    throw new Error(`Expected ${width} MRTD tuple headers, got ${actualHeaders.length}.`);
  }

  const headerCells = actualHeaders.map((header, index) => formatHeaderCell(header, inferTupleScalarType(rows, index)));
  const lines = [headerCells.join(" ")];
  for (const row of rows) {
    lines.push(row.map((value) => formatScalar(value, options)).join(" "));
  }

  return lines.join("\n");
}

function splitRootRows(source: string): string[] {
  const rows: string[] = [];
  let current = "";
  let depth = 0;
  let inString = false;
  let escaped = false;
  let inComment = false;
  let inBlockComment = false;

  const flush = (): void => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      rows.push(trimmed);
    }
    current = "";
  };

  for (let index = 0; index < source.length; index += 1) {
    const ch = source[index];

    if (inComment) {
      if (ch === "\n") {
        inComment = false;
        if (depth === 0) {
          flush();
        } else {
          current += ch;
        }
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && source[index + 1] === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      current += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "#") {
      inComment = true;
      continue;
    }

    if (ch === "/" && source[index + 1] === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (ch === "\"") {
      inString = true;
      current += ch;
      continue;
    }

    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      current += ch;
      continue;
    }

    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      current += ch;
      continue;
    }

    if (ch === "\n" && depth === 0) {
      flush();
      continue;
    }

    current += ch;
  }

  flush();
  return rows;
}

function splitRowCells(rowSource: string): string[] {
  const trimmed = unwrapTopLevelRoundRow(rowSource.trim());
  const cells: string[] = [];
  let current = "";
  let depth = 0;
  let inString = false;
  let escaped = false;

  const flush = (): void => {
    const cell = current.trim();
    if (cell.length > 0) {
      cells.push(cell);
    }
    current = "";
  };

  for (let index = 0; index < trimmed.length; index += 1) {
    const ch = trimmed[index];
    if (inString) {
      current += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      current += ch;
      continue;
    }

    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      current += ch;
      continue;
    }

    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      current += ch;
      continue;
    }

    if ((ch === " " || ch === "\t" || ch === "\r" || ch === "\n") && depth === 0) {
      flush();
      continue;
    }

    current += ch;
  }

  flush();
  return cells;
}

function unwrapTopLevelRoundRow(rowSource: string): string {
  if (!rowSource.startsWith("(") || !rowSource.endsWith(")")) {
    return rowSource;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < rowSource.length; index += 1) {
    const ch = rowSource[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "(") {
      depth += 1;
      continue;
    }

    if (ch === ")") {
      depth -= 1;
      if (depth === 0 && index !== rowSource.length - 1) {
        return rowSource;
      }
    }
  }

  return rowSource.slice(1, -1).trim();
}

function parseHeaderRow(rowSource: string): MrtdColumn[] {
  return splitRowCells(rowSource).map(parseHeaderCell);
}

function parseHeaderCell(cell: string): MrtdColumn {
  const parts = splitTopLevelColon(cell);
  if (!parts) {
    return { name: parseHeaderName(cell) };
  }

  const typeName = parts.right.trim();
  if (!declaredTypes.has(typeName as MrtdScalarType)) {
    throw new Error(`Unsupported MRTD declared type '${typeName}'.`);
  }

  return {
    name: parseHeaderName(parts.left.trim()),
    type: typeName as MrtdScalarType,
  };
}

function parseHeaderName(text: string): string {
  const value = parseStringLikeToken(text);
  if (typeof value !== "string") {
    throw new Error(`Illegal MRTD header cell '${text}'.`);
  }
  return value;
}

function parseDataRow(rowSource: string, columns: readonly MrtdColumn[], lineNumber: number, options: MrtdOptions): MrtdRow {
  const cells = splitRowCells(rowSource);
  if (cells.length !== columns.length) {
    throw new Error(`MRTD row ${lineNumber} has ${cells.length} cells, expected ${columns.length}.`);
  }

  return {
    cells: cells.map((cell, index) => parseDataCell(cell, columns[index], options)),
  };
}

function parseDataCell(cell: string, column: MrtdColumn, options: MrtdOptions): unknown {
  const value = parseScalar(cell, options);
  if (!column.type) {
    return value;
  }
  return convertDeclaredType(value, column.type, column.name);
}

function parseScalar(cell: string, options: MrtdOptions): unknown {
  const quoted = quotedStringRx.exec(cell);
  if (quoted) {
    const [, body, suffix] = quoted;
    const text = unescapeString(body);
    return applyBasicSuffixProfile({ kind: "string", value: text, suffix });
  }

  const numeric = numberRx.exec(cell);
  if (numeric) {
    const [, digits, suffix] = numeric;
    return applyBasicSuffixProfile({ kind: "number", value: digits, suffix });
  }

  return parseStringLikeToken(cell);
}

function parseStringLikeToken(text: string): string | boolean | null {
  const quoted = quotedStringRx.exec(text);
  if (quoted) {
    return unescapeString(quoted[1]);
  }

  if (!identifierRx.test(text)) {
    throw new Error(`Illegal MRTD token '${text}'.`);
  }

  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null") return null;
  return text;
}

function splitTopLevelColon(text: string): { left: string; right: string } | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      continue;
    }

    if (ch === ":" && depth === 0) {
      return {
        left: text.slice(0, index),
        right: text.slice(index + 1),
      };
    }
  }

  return null;
}

function convertDeclaredType(value: unknown, declaredType: MrtdScalarType, fieldName: string): unknown {
  switch (declaredType) {
    case "string":
      if (typeof value === "string") return value;
      break;
    case "bool":
      if (typeof value === "boolean") return value;
      break;
    case "int":
      if (typeof value === "number" && Number.isInteger(value)) return value;
      break;
    case "float":
      if (typeof value === "number") return value;
      break;
  }

  throw new Error(`MRTD field '${fieldName}' expected ${declaredType}, got ${describeValue(value)}.`);
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (value instanceof Date) return "date";
  return typeof value;
}

function toRecordLike(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function inferScalarType(rows: readonly object[], fieldName: string): MrtdScalarType | undefined {
  for (const row of rows) {
    const value = toRecordLike(row)[fieldName];
    if (value !== undefined && value !== null) {
      return inferValueScalarType(value);
    }
  }
  return undefined;
}

function inferTupleScalarType(rows: readonly (readonly unknown[])[], index: number): MrtdScalarType | undefined {
  for (const row of rows) {
    const value = row[index];
    if (value !== undefined && value !== null) {
      return inferValueScalarType(value);
    }
  }
  return undefined;
}

function inferValueScalarType(value: unknown): MrtdScalarType | undefined {
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number") return Number.isInteger(value) ? "int" : "float";
  if (typeof value === "string") return "string";
  return undefined;
}

function formatScalar(value: unknown, options: MrtdOptions): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (value instanceof Date) {
    return `"${value.toISOString()}"dt`;
  }

  if (typeof value === "string") {
    return formatIdentifierOrString(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("MRTD writing does not support non-finite numbers.");
    }
    return String(value);
  }

  throw new Error(`MRTD writing currently supports only scalar values, not '${describeValue(value)}'.`);
}

function formatIdentifierOrString(value: string): string {
  if (identifierRx.test(value)) {
    return value;
  }

  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}

function unescapeString(value: string): string {
  return value.replace(/\\(["\\])/g, "$1");
}

function formatHeaderCell(name: string, type: MrtdScalarType | undefined): string {
  return type ? `${formatIdentifierOrString(name)}:${type}` : formatIdentifierOrString(name);
}
