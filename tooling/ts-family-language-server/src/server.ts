#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  DocumentSymbol,
  Hover,
  InitializeParams,
  InitializeResult,
  InsertTextFormat,
  ProposedFeatures,
  Range,
  ReferenceParams,
  RenameParams,
  SymbolKind,
  TextDocumentSyncKind,
  TextEdit,
  createConnection,
} from "vscode-languageserver/lib/node/main.js";
import { TextDocument } from "vscode-languageserver-textdocument";

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const sharedSnippetPath = path.resolve(
  here,
  "..",
  "..",
  "..",
  "shared",
  "makrell-editor-assets",
  "snippets",
  "makrell.code-snippets.json",
);

type FamilyKind = "makrellpy" | "makrellts" | "makrellsharp" | "mron" | "mrml" | "mrtd";
type SnippetRecord = Record<string, { prefix?: string; body?: string | string[]; description?: string }>;

interface CliRangePosition {
  line: number;
  column: number;
}

interface CliDiagnostic {
  message?: string;
  severity?: string;
  range?: {
    start?: CliRangePosition;
    end?: CliRangePosition;
  };
}

interface CliResult {
  ok?: boolean;
  diagnostics?: CliDiagnostic[];
}

interface IndexedDefinition {
  name: string;
  kind: SymbolKind;
  line: number;
  startCharacter: number;
  endCharacter: number;
  detail: string;
}

const connection: Connection = createConnection(ProposedFeatures.all, process.stdin, process.stdout);
const documents = new Map<string, TextDocument>();

const fallbackCompletions: CompletionItem[] = [
  { label: "{fun ...}", kind: CompletionItemKind.Snippet, insertText: "{fun ${1:name} [${2:args}]\n  ${3:body}\n}" },
  { label: "{match ...}", kind: CompletionItemKind.Snippet, insertText: "{match ${1:value}\n  ${2:pattern}\n    ${3:result}\n  _\n    ${4:other}\n}" },
  { label: "{def macro ...}", kind: CompletionItemKind.Snippet, insertText: "{def macro ${1:name} [${2:ns}]\n  ${3:body}\n}" },
  { label: "{meta ...}", kind: CompletionItemKind.Snippet, insertText: "{meta\n  ${1:body}\n}" },
  { label: "{async fun ...}", kind: CompletionItemKind.Snippet, insertText: "{async fun ${1:name} [${2:args}]\n  ${3:body}\n}" },
  { label: "{await ...}", kind: CompletionItemKind.Snippet, insertText: "{await ${1:expr}}" },
];

function loadSharedSnippetCompletions(): CompletionItem[] {
  try {
    const raw = readFileSync(sharedSnippetPath, "utf8");
    const parsed = JSON.parse(raw) as SnippetRecord;
    return Object.entries(parsed).map(([label, snippet]) => ({
      label,
      kind: CompletionItemKind.Snippet,
      detail: snippet.description ?? "Makrell shared snippet",
      insertText: Array.isArray(snippet.body) ? snippet.body.join("\n") : snippet.body ?? snippet.prefix ?? label,
      insertTextFormat: InsertTextFormat.Snippet,
    }));
  } catch {
    return fallbackCompletions.map((item) => ({
      ...item,
      insertTextFormat: InsertTextFormat.Snippet,
    }));
  }
}

const familyCompletions = loadSharedSnippetCompletions();
const knownFormHovers = new Map<string, string>([
  ["fun", "**`fun`**\n\nDefine a function with Makrell syntax.\n\nExample: ` {fun add [x y] x + y} `"],
  ["async", "**`async`**\n\nUsed with `fun` for the shared family async surface: ` {async fun ...} `."],
  ["await", "**`await`**\n\nShared family async form.\n\nExample: ` {await expr} `"],
  ["match", "**`match`**\n\nPattern-match a value against ordered clauses.\n\nExample:\n\n```makrell\n{match value\n  pattern\n    result\n  _\n    fallback}\n```"],
  ["meta", "**`meta`**\n\nCompile-time block for helper logic and values used during macro expansion."],
  ["quote", "**`quote`**\n\nConstruct syntax as data at compile time."],
  ["unquote", "**`unquote`**\n\nSplice syntax into a quoted form."],
  ["regular", "**`regular`**\n\nNormalise incoming nodes before inspecting them in macros."],
  ["macro", "**`macro`**\n\nUsed with `def` to define compile-time syntax transformations."],
  ["def", "**`def`**\n\nDefinition form used for macros and other compile-time declarations."],
  ["if", "**`if`**\n\nConditional expression form.\n\nExample: ` {if predicate consequent alternative} `"],
  ["import", "**`import`**\n\nHost-runtime import form. Exact meaning depends on the implementation track."],
  ["importm", "**`importm`**\n\nCompile-time import/replay form for Makrell-defined metadata and macros."],
  ["mron", "**MRON**\n\nMakrell Object Notation: structured data in the Makrell family."],
  ["mrml", "**MRML**\n\nMakrell Markup Language: markup/document-like structures in the Makrell family."],
  ["mrtd", "**MRTD**\n\nMakrell Tabular Data: typed tabular format in the Makrell family."],
]);

function detectFamily(document: TextDocument): FamilyKind | undefined {
  const extension = path.extname(document.uri.replace(/^file:\/\/\//, "")).toLowerCase();
  switch (extension) {
    case ".mrpy":
      return "makrellpy";
    case ".mrts":
      return "makrellts";
    case ".mrsh":
      return "makrellsharp";
    case ".mron":
      return "mron";
    case ".mrml":
      return "mrml";
    case ".mrtd":
      return "mrtd";
    default:
      return undefined;
  }
}

function commandForFamily(family: FamilyKind): { command: string; args: (filePath: string) => string[]; source: string; hover: string } {
  switch (family) {
    case "makrellpy":
      return {
        command: "makrell",
        args: (filePath) => ["check", filePath, "--json"],
        source: "makrell",
        hover: "MakrellPy file. Diagnostics come from `makrell check --json`.",
      };
    case "makrellts":
      return {
        command: "makrellts",
        args: (filePath) => ["check", filePath, "--json"],
        source: "makrellts",
        hover: "MakrellTS file. Diagnostics come from `makrellts check --json`.",
      };
    case "makrellsharp":
      return {
        command: "makrellsharp",
        args: (filePath) => ["check", filePath, "--json"],
        source: "makrellsharp",
        hover: "Makrell# file. Diagnostics come from `makrellsharp check --json`.",
      };
    case "mron":
      return {
        command: "makrellsharp",
        args: (filePath) => ["check-mron", filePath, "--json"],
        source: "makrellsharp",
        hover: "MRON file. Diagnostics come from `makrellsharp check-mron --json`.",
      };
    case "mrml":
      return {
        command: "makrellsharp",
        args: (filePath) => ["check-mrml", filePath, "--json"],
        source: "makrellsharp",
        hover: "MRML file. Diagnostics come from `makrellsharp check-mrml --json`.",
      };
    case "mrtd":
      return {
        command: "makrellsharp",
        args: (filePath) => ["check-mrtd", filePath, "--json"],
        source: "makrellsharp",
        hover: "MRTD file. Diagnostics come from `makrellsharp check-mrtd --json`.",
      };
  }
}

function uriToFilePath(uri: string): string | undefined {
  if (!uri.startsWith("file:///")) {
    return undefined;
  }

  let filePath = decodeURIComponent(uri.replace("file:///", ""));
  if (process.platform === "win32") {
    filePath = filePath.replace(/\//g, "\\");
  } else {
    filePath = `/${filePath}`;
  }
  return filePath;
}

function toRange(item?: CliDiagnostic["range"]): Range {
  const startLine = Math.max((item?.start?.line ?? 1) - 1, 0);
  const startCharacter = Math.max((item?.start?.column ?? 1) - 1, 0);
  const endLine = Math.max((item?.end?.line ?? item?.start?.line ?? 1) - 1, startLine);
  const endCharacter = Math.max((item?.end?.column ?? item?.start?.column ?? 1) - 1, startCharacter);

  return {
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
  };
}

function toSeverity(severity?: string): DiagnosticSeverity {
  switch (severity) {
    case "warning":
      return DiagnosticSeverity.Warning;
    case "information":
      return DiagnosticSeverity.Information;
    case "hint":
      return DiagnosticSeverity.Hint;
    default:
      return DiagnosticSeverity.Error;
  }
}

function createDocumentSymbol(
  name: string,
  kind: SymbolKind,
  lineIndex: number,
  lineText: string,
): DocumentSymbol {
  const startCharacter = Math.max(lineText.search(/\S|$/), 0);
  return {
    name,
    kind,
    range: {
      start: { line: lineIndex, character: startCharacter },
      end: { line: lineIndex, character: lineText.length },
    },
    selectionRange: {
      start: { line: lineIndex, character: startCharacter },
      end: { line: lineIndex, character: lineText.length },
    },
  };
}

function createIndexedDefinition(
  name: string,
  kind: SymbolKind,
  lineIndex: number,
  startCharacter: number,
  endCharacter: number,
  detail: string,
): IndexedDefinition {
  return {
    name,
    kind,
    line: lineIndex,
    startCharacter,
    endCharacter,
    detail,
  };
}

function parseCliResult(raw: string | undefined): CliResult | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as CliResult;
  } catch {
    return undefined;
  }
}

function wordRangeAtPosition(document: TextDocument, line: number, character: number) {
  const textLine = document.getText().split(/\r?\n/)[line] ?? "";
  if (!textLine) {
    return undefined;
  }

  let start = character;
  let end = character;
  const isWord = (ch: string) => /[A-Za-z0-9_-]/.test(ch);

  while (start > 0 && isWord(textLine[start - 1])) {
    start -= 1;
  }
  while (end < textLine.length && isWord(textLine[end])) {
    end += 1;
  }

  if (start === end) {
    return undefined;
  }

  return {
    word: textLine.slice(start, end),
    start,
    end,
  };
}

function collectWordOccurrences(document: TextDocument, target: string) {
  const lines = document.getText().split(/\r?\n/);
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`, "g");
  const results: Array<{ line: number; start: number; end: number }> = [];

  for (const [lineIndex, line] of lines.entries()) {
    for (const match of line.matchAll(pattern)) {
      const start = match.index ?? 0;
      results.push({
        line: lineIndex,
        start,
        end: start + target.length,
      });
    }
  }

  return results;
}

function indexDefinitions(document: TextDocument): IndexedDefinition[] {
  const family = detectFamily(document);
  const lines = document.getText().split(/\r?\n/);
  const definitions: IndexedDefinition[] = [];

  for (const [index, line] of lines.entries()) {
    const funMatch = /^\s*\{((?:async\s+)?)fun\s+([A-Za-z_][\w-]*)\s*(\[[^\]]*\])?/.exec(line);
    if (funMatch) {
      const name = funMatch[2];
      const start = line.indexOf(name);
      const asyncPrefix = funMatch[1]?.trim() ? "async " : "";
      definitions.push(
        createIndexedDefinition(
          name,
          SymbolKind.Function,
          index,
          start,
          start + name.length,
          `${asyncPrefix}fun ${name}${funMatch[3] ? ` ${funMatch[3]}` : ""}`.trim(),
        ),
      );
      continue;
    }

    const macroMatch = /^\s*\{def\s+macro\s+([A-Za-z_][\w-]*)\s*(\[[^\]]*\])?/.exec(line);
    if (macroMatch) {
      const name = macroMatch[1];
      const start = line.indexOf(name);
      definitions.push(
        createIndexedDefinition(
          name,
          SymbolKind.Function,
          index,
          start,
          start + name.length,
          `def macro ${name}${macroMatch[2] ? ` ${macroMatch[2]}` : ""}`.trim(),
        ),
      );
      continue;
    }

    const assignMatch = /^\s*([A-Za-z_][\w-]*)\s*=/.exec(line);
    if (assignMatch && family !== "mron") {
      const name = assignMatch[1];
      const start = line.indexOf(name);
      definitions.push(
        createIndexedDefinition(
          name,
          SymbolKind.Variable,
          index,
          start,
          start + name.length,
          line.trim(),
        ),
      );
      continue;
    }

    if (family === "mron") {
      const mronMatch = /^\s*([A-Za-z_][\w-]*)\s+/.exec(line);
      if (mronMatch) {
        const name = mronMatch[1];
        const start = line.indexOf(name);
        definitions.push(
          createIndexedDefinition(
            name,
            SymbolKind.Property,
            index,
            start,
            start + name.length,
            line.trim(),
          ),
        );
      }
    }
  }

  return definitions;
}

function collectDocumentSymbols(document: TextDocument): DocumentSymbol[] {
  const family = detectFamily(document);
  const lines = document.getText().split(/\r?\n/);
  const symbols = indexDefinitions(document).map((definition) =>
    createDocumentSymbol(definition.name, definition.kind, definition.line, lines[definition.line] ?? definition.detail),
  );

  if (family === "mrtd") {
    for (const [index, line] of lines.entries()) {
      if (line.includes(":")) {
        symbols.push(createDocumentSymbol("MRTD header", SymbolKind.Struct, index, line));
        break;
      }
    }
  }

  return symbols;
}

async function validateDocument(document: TextDocument): Promise<void> {
  const family = detectFamily(document);
  if (!family) {
    connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
    return;
  }

  const filePath = uriToFilePath(document.uri);
  if (!filePath) {
    connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
    return;
  }

  const cli = commandForFamily(family);
  try {
    const { stdout } = await execFileAsync(cli.command, cli.args(filePath), {
      cwd: path.dirname(filePath),
    });

    const parsed = parseCliResult(stdout);
    const diagnostics: Diagnostic[] = (parsed?.diagnostics ?? []).map((item) => ({
      range: toRange(item.range),
      severity: toSeverity(item.severity),
      message: item.message ?? "Makrell diagnostic",
      source: cli.source,
    }));

    connection.sendDiagnostics({ uri: document.uri, diagnostics });
  } catch (error: any) {
    const parsed = parseCliResult(error?.stdout);
    if (parsed) {
      const diagnostics: Diagnostic[] = (parsed.diagnostics ?? []).map((item) => ({
        range: toRange(item.range),
        severity: toSeverity(item.severity),
        message: item.message ?? "Makrell diagnostic",
        source: cli.source,
      }));
      connection.sendDiagnostics({ uri: document.uri, diagnostics });
      return;
    }

    const diagnostics: Diagnostic[] = [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        severity: DiagnosticSeverity.Warning,
        message: `Unable to run ${cli.command} for diagnostics: ${String(error?.message ?? error)}`,
        source: "makrell-family-lsp",
      },
    ];
    connection.sendDiagnostics({ uri: document.uri, diagnostics });
  }
}

connection.onInitialize((_params: InitializeParams): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full,
    hoverProvider: true,
    documentSymbolProvider: true,
    definitionProvider: true,
    referencesProvider: true,
    renameProvider: {
      prepareProvider: true,
    },
    completionProvider: {
      resolveProvider: false,
      triggerCharacters: ["{", "["],
    },
  },
}));

connection.onDidOpenTextDocument(async (params: any) => {
  const document = TextDocument.create(
    params.textDocument.uri,
    params.textDocument.languageId,
    params.textDocument.version,
    params.textDocument.text,
  );
  documents.set(document.uri, document);
  await validateDocument(document);
});

connection.onDidChangeTextDocument(async (params: any) => {
  const current = documents.get(params.textDocument.uri);
  if (!current) {
    return;
  }

  const nextText = params.contentChanges.at(-1)?.text ?? current.getText();
  const updated = TextDocument.update(current, [{ text: nextText }], params.textDocument.version);
  documents.set(updated.uri, updated);
  await validateDocument(updated);
});

connection.onDidSaveTextDocument(async (params: any) => {
  const document = documents.get(params.textDocument.uri);
  if (document) {
    await validateDocument(document);
  }
});

connection.onDidCloseTextDocument((params: any) => {
  documents.delete(params.textDocument.uri);
  connection.sendDiagnostics({ uri: params.textDocument.uri, diagnostics: [] });
});

connection.onHover((params: any): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const family = detectFamily(document);
  if (!family) {
    return null;
  }

  const word = wordRangeAtPosition(document, params.position.line, params.position.character);
  if (word) {
    const definition = indexDefinitions(document).find((item) => item.name === word.word);
    if (definition) {
      return {
        contents: {
          kind: "markdown",
          value: `**${definition.name}**\n\n\`${definition.detail}\`\n\nDefined on line ${definition.line + 1}.`,
        },
      };
    }

    const knownForm = knownFormHovers.get(word.word);
    if (knownForm) {
      return {
        contents: {
          kind: "markdown",
          value: knownForm,
        },
      };
    }
  }

  return {
    contents: {
      kind: "markdown",
      value: commandForFamily(family).hover,
    },
  };
});

connection.onCompletion(() => familyCompletions);
connection.onDefinition((params: any) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const word = wordRangeAtPosition(document, params.position.line, params.position.character);
  if (!word) {
    return null;
  }

  const definition = indexDefinitions(document).find((item) => item.name === word.word);
  if (!definition) {
    return null;
  }

  return {
    uri: document.uri,
    range: {
      start: { line: definition.line, character: definition.startCharacter },
      end: { line: definition.line, character: definition.endCharacter },
    },
  };
});

connection.onReferences((params: ReferenceParams | any) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const word = wordRangeAtPosition(document, params.position.line, params.position.character);
  if (!word) {
    return [];
  }

  const definitions = indexDefinitions(document);
  const hasKnownDefinition = definitions.some((item) => item.name === word.word);
  if (!hasKnownDefinition) {
    return [];
  }

  return collectWordOccurrences(document, word.word).map((occurrence) => ({
    uri: document.uri,
    range: {
      start: { line: occurrence.line, character: occurrence.start },
      end: { line: occurrence.line, character: occurrence.end },
    },
  }));
});

connection.onPrepareRename((params: any) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const word = wordRangeAtPosition(document, params.position.line, params.position.character);
  if (!word) {
    return null;
  }

  const definition = indexDefinitions(document).find((item) => item.name === word.word);
  if (!definition) {
    return null;
  }

  return {
    range: {
      start: { line: params.position.line, character: word.start },
      end: { line: params.position.line, character: word.end },
    },
    placeholder: word.word,
  };
});

connection.onRenameRequest((params: RenameParams | any) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const word = wordRangeAtPosition(document, params.position.line, params.position.character);
  if (!word) {
    return null;
  }

  const definition = indexDefinitions(document).find((item) => item.name === word.word);
  if (!definition) {
    return null;
  }

  const edits: TextEdit[] = collectWordOccurrences(document, word.word).map((occurrence) => ({
    range: {
      start: { line: occurrence.line, character: occurrence.start },
      end: { line: occurrence.line, character: occurrence.end },
    },
    newText: params.newName,
  }));

  return {
    changes: {
      [document.uri]: edits,
    },
  };
});

connection.onDocumentSymbol((params: any) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  return collectDocumentSymbols(document);
});

connection.listen();
