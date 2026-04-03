import * as monaco from "monaco-editor";
import {
  makrellEditorSnippets,
  makrellLanguageConfiguration,
} from "../../impl/ts/src/editor_assets";

export interface EditorDiagnostic {
  from: number;
  to: number;
  severity: "error" | "warning";
  message: string;
}

export interface EditorController {
  getValue(): string;
  setValue(value: string): void;
  setTheme(theme: "dark" | "light"): void;
  setDiagnostics(diagnostics: EditorDiagnostic[]): void;
}

type ValidateSource = (source: string) => EditorDiagnostic[];
type ChangeHandler = (source: string) => void;

interface SharedSnippet {
  prefix?: string | string[];
  body?: string | string[];
  description?: string;
}

let languageRegistered = false;
let completionRegistered = false;
let currentTheme: "dark" | "light" = "dark";

function ensureMonacoEnvironment() {
  // Monaco can run without a custom worker hook in this bundled browser host.
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function asBracketPairs(value: unknown): [string, string][] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Array.isArray(item) && item.length === 2 && typeof item[0] === "string" && typeof item[1] === "string"
      ? [item[0], item[1]] as [string, string]
      : null)
    .filter((item): item is [string, string] => item !== null);
}

function asAutoClosingPairs(value: unknown): monaco.languages.IAutoClosingPairConditional[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const open = "open" in item && typeof item.open === "string" ? item.open : null;
      const close = "close" in item && typeof item.close === "string" ? item.close : null;
      if (!open || !close) return null;
      const notIn = "notIn" in item && Array.isArray(item.notIn)
        ? item.notIn.filter((entry): entry is string => typeof entry === "string")
        : undefined;
      return { open, close, notIn };
    })
    .filter((item): item is monaco.languages.IAutoClosingPairConditional => item !== null);
}

function offsetToPosition(text: string, offset: number): monaco.Position {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, safeOffset);
  const lines = before.split("\n");
  return new monaco.Position(lines.length, (lines.at(-1)?.length ?? 0) + 1);
}

function toMarker(
  model: monaco.editor.ITextModel,
  diagnostic: EditorDiagnostic,
): monaco.editor.IMarkerData {
  const text = model.getValue();
  const start = offsetToPosition(text, diagnostic.from);
  const end = offsetToPosition(text, Math.max(diagnostic.to, diagnostic.from + 1));
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
    message: diagnostic.message,
    severity: diagnostic.severity === "warning"
      ? monaco.MarkerSeverity.Warning
      : monaco.MarkerSeverity.Error,
  };
}

function registerLanguage() {
  if (languageRegistered) return;
  languageRegistered = true;

  const config = makrellLanguageConfiguration as Record<string, unknown>;
  const comments = (config.comments ?? {}) as Record<string, unknown>;
  const indentationRules = (config.indentationRules ?? {}) as Record<string, unknown>;

  monaco.languages.register({
    id: "makrell",
    aliases: ["Makrell", "MakrellTS"],
    extensions: [".mr", ".mrx", ".mrts", ".mrpy", ".mrsh", ".mron", ".mrml", ".mrtd"],
  });

  monaco.languages.setLanguageConfiguration("makrell", {
    comments: {
      lineComment: typeof comments.lineComment === "string" ? comments.lineComment : "#",
      blockComment: Array.isArray(comments.blockComment)
        && comments.blockComment.length === 2
        && typeof comments.blockComment[0] === "string"
        && typeof comments.blockComment[1] === "string"
        ? [comments.blockComment[0], comments.blockComment[1]]
        : ["/*", "*/"],
    },
    brackets: asBracketPairs(config.brackets),
    autoClosingPairs: asAutoClosingPairs(config.autoClosingPairs),
    surroundingPairs: asBracketPairs(config.surroundingPairs),
    autoCloseBefore: typeof config.autoCloseBefore === "string" ? config.autoCloseBefore : undefined,
    wordPattern: typeof config.wordPattern === "string" ? new RegExp(config.wordPattern, "u") : undefined,
    indentationRules: {
      increaseIndentPattern: typeof indentationRules.increaseIndentPattern === "string"
        ? new RegExp(indentationRules.increaseIndentPattern)
        : undefined,
      decreaseIndentPattern: typeof indentationRules.decreaseIndentPattern === "string"
        ? new RegExp(indentationRules.decreaseIndentPattern)
        : undefined,
    },
  });

  monaco.languages.setMonarchTokensProvider("makrell", {
    defaultToken: "",
    tokenPostfix: ".makrell",
    keywords: [
      "async",
      "await",
      "break",
      "catch",
      "continue",
      "def",
      "elif",
      "else",
      "false",
      "for",
      "fun",
      "if",
      "import",
      "importm",
      "in",
      "lisp",
      "macro",
      "match",
      "meta",
      "null",
      "pipe",
      "quote",
      "return",
      "rpn",
      "throw",
      "true",
      "try",
      "when",
      "while",
    ],
    operators: [
      "@",
      "~=",
      "!~=",
      "==",
      "!=",
      "<=",
      ">=",
      "=>",
      "->",
      "=",
      "+",
      "-",
      "*",
      "/",
      "%",
      "<",
      ">",
      "!",
      "?",
      ":",
      "|",
      "&",
      ".",
    ],
    symbols: /[=!<>+\-*/%&|@:?~.]+/,
    tokenizer: {
      root: [
        { include: "@whitespace" },
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],
        [/-?\d+(?:\.\d+)?(?:[A-Za-z][\w-]*)?/, "number"],
        [/"/, { token: "string.quote", next: "@string" }],
        [/'/, { token: "string.quote", next: "@singleQuotedString" }],
        [/[\p{L}_$][\p{L}\p{N}_$:-]*/u, {
          cases: {
            "@keywords": "keyword",
            "@default": "identifier",
          },
        }],
      ],
      whitespace: [
        [/#.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/\s+/, "white"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\/\*/, "comment", "@push"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, { token: "string.quote", next: "@pop" }],
      ],
      singleQuotedString: [
        [/[^\\']+/, "string"],
        [/\\./, "string.escape"],
        [/'/, { token: "string.quote", next: "@pop" }],
      ],
    },
  });
}

function registerSnippets() {
  if (completionRegistered) return;
  completionRegistered = true;

  const snippets = makrellEditorSnippets as Record<string, SharedSnippet>;
  monaco.languages.registerCompletionItemProvider("makrell", {
    triggerCharacters: ["{", "["],
    provideCompletionItems(model, position) {
      const range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column,
      );

      const suggestions = Object.entries(snippets).flatMap(([label, snippet]) => {
        const prefixes = Array.isArray(snippet.prefix) ? snippet.prefix : [snippet.prefix ?? label];
        const insertText = Array.isArray(snippet.body) ? snippet.body.join("\n") : snippet.body ?? "";
        return prefixes.filter(Boolean).map((prefix) => ({
          label: String(prefix),
          detail: label,
          documentation: snippet.description ?? label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        }));
      });

      return { suggestions };
    },
  });
}

function defineThemes() {
  monaco.editor.defineTheme("makrell-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "81ecff", fontStyle: "bold" },
      { token: "comment", foreground: "7383a8" },
      { token: "number", foreground: "ffcf70" },
      { token: "string", foreground: "c2f970" },
      { token: "operator", foreground: "ff86c3" },
      { token: "identifier", foreground: "dee5ff" },
    ],
    colors: {
      "editor.background": "#07111f",
      "editor.foreground": "#dee5ff",
      "editorLineNumber.foreground": "#6c7c9c",
      "editorLineNumber.activeForeground": "#c8d7f8",
      "editorCursor.foreground": "#81ecff",
      "editor.selectionBackground": "#173053",
      "editor.inactiveSelectionBackground": "#10233b",
    },
  });

  monaco.editor.defineTheme("makrell-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "007f98", fontStyle: "bold" },
      { token: "comment", foreground: "7f8796" },
      { token: "number", foreground: "b26b00" },
      { token: "string", foreground: "196c2e" },
      { token: "operator", foreground: "b14588" },
      { token: "identifier", foreground: "162235" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#0f172a",
      "editorLineNumber.foreground": "#8b98aa",
      "editorLineNumber.activeForeground": "#324154",
      "editorCursor.foreground": "#007f98",
      "editor.selectionBackground": "#d6eef6",
      "editor.inactiveSelectionBackground": "#eaf3f8",
    },
  });
}

function themeName(theme: "dark" | "light") {
  return theme === "light" ? "makrell-light" : "makrell-dark";
}

export async function createMakrellEditor(
  root: HTMLElement,
  initialValue: string,
  validateSource: ValidateSource,
  onChange: ChangeHandler,
): Promise<EditorController> {
  ensureMonacoEnvironment();
  registerLanguage();
  registerSnippets();
  defineThemes();

  const model = monaco.editor.createModel(initialValue, "makrell");
  const editor = monaco.editor.create(root, {
    automaticLayout: true,
    fontFamily: "JetBrains Mono, Fira Code, monospace",
    fontLigatures: false,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 24,
    minimap: { enabled: false },
    model,
    padding: { top: 18, bottom: 18 },
    roundedSelection: false,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    stickyScroll: { enabled: false },
    tabSize: 4,
    theme: themeName(currentTheme),
    wordWrap: "on",
  });

  const fontSet = (document as Document & {
    fonts?: { ready?: Promise<unknown> };
  }).fonts;
  fontSet?.ready?.then(() => {
    monaco.editor.remeasureFonts();
    editor.layout();
    editor.render(true);
  });

  const applyDiagnostics = (nextDiagnostics: EditorDiagnostic[]) => {
    monaco.editor.setModelMarkers(
      model,
      "makrell-playground",
      nextDiagnostics.map((diagnostic) => toMarker(model, diagnostic)),
    );
  };

  applyDiagnostics(validateSource(initialValue));

  editor.onDidChangeModelContent(() => {
    const nextValue = model.getValue();
    applyDiagnostics(validateSource(nextValue));
    onChange(nextValue);
  });

  return {
    getValue: () => model.getValue(),
    setValue(value: string) {
      if (model.getValue() === value) return;
      model.setValue(value);
      applyDiagnostics(validateSource(value));
    },
    setTheme(theme: "dark" | "light") {
      currentTheme = theme;
      monaco.editor.setTheme(themeName(theme));
    },
    setDiagnostics(nextDiagnostics: EditorDiagnostic[]) {
      applyDiagnostics(nextDiagnostics);
    },
  };
}
