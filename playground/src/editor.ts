import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, snippetCompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { Compartment, EditorSelection, EditorState, Extension, type TransactionSpec } from "@codemirror/state";
import { StreamLanguage } from "@codemirror/stream-parser";
import { drawSelection, dropCursor, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, rectangularSelection } from "@codemirror/view";
import { HighlightStyle, tags as t } from "@lezer/highlight";
import type { Snippet } from "../../impl/ts/src/editor_assets";

interface LanguageState {
  inString: boolean;
  escaped: boolean;
}

const reservedWords = new Set([
  "fun",
  "async",
  "await",
  "if",
  "when",
  "while",
  "for",
  "match",
  "class",
  "def",
  "macro",
  "quote",
  "return",
  "break",
  "continue",
  "import",
  "importm",
  "do",
  "true",
  "false",
  "null",
]);

const makrellStream = StreamLanguage.define<LanguageState>({
  startState() {
    return { inString: false, escaped: false };
  },
  token(stream, state) {
    if (state.inString) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (state.escaped) {
          state.escaped = false;
        } else if (ch === "\\") {
          state.escaped = true;
        } else if (ch === "\"") {
          state.inString = false;
          break;
        }
      }
      return "string";
    }

    if (stream.eatSpace()) return null;

    const ch = stream.peek();
    if (!ch) return null;

    if (ch === "#") {
      stream.skipToEnd();
      return "comment";
    }

    if (ch === "\"") {
      state.inString = true;
      stream.next();
      return "string";
    }

    if (/\d/.test(ch)) {
      stream.eatWhile(/[\d._]/);
      stream.eatWhile(/[a-z]/i);
      return "number";
    }

    if ("{}[]()".includes(ch)) {
      stream.next();
      return "bracket";
    }

    if (/[+\-*/%=!<>|&@:.']/ .test(ch)) {
      stream.eatWhile(/[+\-*/%=!<>|&@:.']/);
      return "operator";
    }

    if (/[A-Za-z_$]/.test(ch)) {
      stream.eatWhile(/[A-Za-z0-9_$?-]/);
      const word = stream.current();
      if (reservedWords.has(word)) return "keyword";
      if (/^[A-Z]/.test(word)) return "typeName";
      return "variableName";
    }

    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: "#" }
  }
});

const makrellHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "var(--pg-accent-pink)", fontWeight: "600" },
  { tag: t.string, color: "var(--pg-accent)", fontWeight: "500" },
  { tag: t.number, color: "var(--pg-error-soft)" },
  { tag: t.comment, color: "var(--pg-muted)", fontStyle: "italic" },
  { tag: t.typeName, color: "var(--pg-accent-cold)" },
  { tag: t.variableName, color: "var(--pg-text)" },
  { tag: t.operator, color: "var(--pg-text-soft)" },
  { tag: t.bracket, color: "var(--pg-text-soft)" }
]);

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    background: "transparent",
    color: "var(--pg-text)",
    fontFamily: "var(--pg-font-mono)",
    fontSize: "13px"
  },
  ".cm-scroller": {
    overflow: "auto",
    lineHeight: "1.65"
  },
  ".cm-content": {
    padding: "22px 0 24px",
    caretColor: "var(--pg-accent)"
  },
  ".cm-line": {
    padding: "0 20px 0 14px"
  },
  ".cm-gutters": {
    background: "var(--pg-surface-panel)",
    color: "var(--pg-muted)",
    border: "0",
    minWidth: "56px"
  },
  ".cm-activeLineGutter": {
    background: "transparent",
    color: "var(--pg-accent)"
  },
  ".cm-activeLine": {
    background: "color-mix(in oklab, var(--pg-surface-elevated) 82%, transparent)"
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    background: "color-mix(in oklab, var(--pg-accent) 22%, transparent)"
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--pg-accent)"
  },
  ".cm-panels": {
    background: "var(--pg-surface-panel)"
  },
  ".cm-tooltip": {
    border: "0",
    borderRadius: "10px",
    background: "color-mix(in oklab, var(--pg-surface-bright) 92%, transparent)",
    backdropFilter: "blur(24px)",
    color: "var(--pg-text)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(109, 117, 140, 0.1)"
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "color-mix(in oklab, var(--pg-accent) 18%, transparent)",
    color: "var(--pg-text)"
  },
  ".cm-foldGutter .cm-gutterElement": {
    paddingLeft: "6px"
  },
  ".cm-lintRange-error": {
    backgroundImage: "linear-gradient(to right, transparent, transparent), repeating-linear-gradient(90deg, transparent, transparent 2px, color-mix(in oklab, var(--pg-error) 90%, white) 2px, color-mix(in oklab, var(--pg-error) 90%, white) 4px)"
  },
  ".cm-lintPoint-error": {
    color: "var(--pg-error)"
  }
});

function snippetCompletions(snippets: Snippet[]) {
  return snippets.map((snippet) => {
    const body = Array.isArray(snippet.body) ? snippet.body.join("\n") : snippet.body;
    return snippetCompletion(body, {
      label: snippet.prefix,
      detail: snippet.description ?? "Makrell snippet",
      type: "snippet"
    });
  });
}

export interface EditorController {
  view: EditorView;
  getValue(): string;
  setValue(value: string): void;
  setDiagnostics(nextDiagnostics: Diagnostic[]): void;
  focus(): void;
}

export function createMakrellEditor(target: HTMLElement, initialValue: string, snippets: Snippet[], validate: (source: string) => Diagnostic[]): EditorController {
  const diagnosticsCompartment = new Compartment();
  const snippetOptions = snippetCompletions(snippets);

  const lintSource = linter((view) => validate(view.state.doc.toString()), { delay: 180 });

  const state = EditorState.create({
    doc: initialValue,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      foldGutter(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      syntaxHighlighting(makrellHighlight),
      makrellStream,
      lintGutter(),
      lintSource,
      diagnosticsCompartment.of([]),
      autocompletion({
        override: [
          () => ({
            from: 0,
            options: snippetOptions,
          })
        ]
      }),
      keymap.of([
        indentWithTab,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...searchKeymap,
        ...completionKeymap
      ]),
      editorTheme
    ]
  });

  const view = new EditorView({
    state,
    parent: target
  });

  return {
    view,
    getValue() {
      return view.state.doc.toString();
    },
    setValue(value) {
      const spec: TransactionSpec = {
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value
        },
        selection: EditorSelection.cursor(0)
      };
      view.dispatch(spec);
    },
    setDiagnostics(nextDiagnostics) {
      view.dispatch({
        effects: diagnosticsCompartment.reconfigure([
          lintSource,
          ...nextDiagnostics.length === 0 ? [] : []
        ])
      });
      view.dispatch(setDiagnostics(view.state, nextDiagnostics));
    },
    focus() {
      view.focus();
    }
  };
}
