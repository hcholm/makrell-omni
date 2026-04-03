import { createMakrellEditor, type EditorController, type EditorDiagnostic } from "./editor";
import { getDocNote } from "./docs";
import { compileForBrowser, runInBrowserAsync } from "../../impl/ts/src/browser";
import { type MakrellPlaygroundExample, makrellPlaygroundExamples } from "../../impl/ts/src/playground";
import { CompileFailure } from "../../impl/ts/src/compiler";

type DrawerMode = "closed" | "examples" | "docs";
type InspectorMode = "output" | "generated" | "diagnostics";
type ThemeMode = "dark" | "light";

interface AppState {
  exampleId: string;
  drawerMode: DrawerMode;
  inspectorMode: InspectorMode;
  theme: ThemeMode;
}

interface OutputLine {
  tone: "info" | "success" | "error" | "print";
  text: string;
}

const app = document.querySelector("#app");
if (!app) throw new Error("Missing playground root.");

const examples = makrellPlaygroundExamples;
const exampleIndex = new Map(examples.map((example) => [example.id, example]));

const STATE_KEY = "makrell.playground.app-state.v2";
const DRAFTS_KEY = "makrell.playground.drafts.v2";

const defaultState: AppState = {
  exampleId: examples[0]?.id ?? "hello",
  drawerMode: "examples",
  inspectorMode: "output",
  theme: "dark",
};

function readState(): AppState {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STATE_KEY) ?? "{}") };
  } catch {
    return defaultState;
  }
}

function writeState(next: AppState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(next));
}

function readDrafts(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeDrafts(drafts: Record<string, string>) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

let state = readState();
let drafts = readDrafts();
let diagnostics: EditorDiagnostic[] = [];
let currentOutput: OutputLine[] = [];
let currentGenerated = "";
let editor: EditorController;

function getExample(id: string): MakrellPlaygroundExample {
  return exampleIndex.get(id) ?? examples[0];
}

function currentExample(): MakrellPlaygroundExample {
  return getExample(state.exampleId);
}

function currentSource(): string {
  const example = currentExample();
  return drafts[example.id] ?? example.source;
}

function encodeText(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeText(value: string): string | null {
  try {
    const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalised);
    return new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)));
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setTheme(theme: ThemeMode) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  editor?.setTheme(theme);
  writeState(state);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-theme-mode]")) {
    button.classList.toggle("pg-theme-toggle__button--active", button.dataset.themeMode === theme);
  }
}

function mkDiagnostic(source: string, line: number, column: number, message: string): EditorDiagnostic {
  const lines = source.split("\n");
  const safeLine = Math.max(1, Math.min(line, lines.length));
  const targetLine = lines[safeLine - 1] ?? "";
  const fromBase = lines.slice(0, safeLine - 1).reduce((sum, value) => sum + value.length + 1, 0);
  const from = fromBase + Math.max(0, column - 1);
  const to = Math.min(fromBase + targetLine.length, Math.max(from + 1, from + 1));
  return { from, to, severity: "error", message };
}

function captureErrorRange(error: unknown, source: string): EditorDiagnostic[] {
  if (error instanceof CompileFailure && error.diagnostic.loc) {
    return [
      mkDiagnostic(
        source,
        error.diagnostic.loc.start.line,
        error.diagnostic.loc.start.column,
        error.diagnostic.message,
      ),
    ];
  }

  const message = error instanceof Error ? error.message : String(error);
  const match = /line\s+(\d+),\s*col\s+(\d+)/i.exec(message);
  if (match) {
    return [mkDiagnostic(source, Number.parseInt(match[1], 10), Number.parseInt(match[2], 10), message)];
  }

  return [{ from: 0, to: Math.min(source.length, 1), severity: "error", message }];
}

function validateSource(source: string): EditorDiagnostic[] {
  try {
    compileForBrowser(source);
    return [];
  } catch (error) {
    return captureErrorRange(error, source);
  }
}

app.innerHTML = `
  <div class="pg-app">
    <header class="pg-topbar">
      <div class="pg-topbar__brand">
        <div class="pg-wordmark">Makrell Playground</div>
        <nav class="pg-topbar__links">
          <button type="button" class="pg-topbar__link" data-open-drawer="examples">Examples</button>
          <button type="button" class="pg-topbar__link" data-open-drawer="docs">Documentation</button>
        </nav>
      </div>
      <div class="pg-topbar__actions">
        <a class="pg-topbar__backlink" href="/" target="_blank" rel="noopener">Back to makrell.dev</a>
        <a class="pg-topbar__backlink" href="/getting-started.html" target="_blank" rel="noopener">Open docs</a>
        <button type="button" class="pg-button pg-button--quiet" data-copy-link>Share</button>
        <div class="pg-theme-toggle">
          <button type="button" class="pg-theme-toggle__button" data-theme-mode="light">Light</button>
          <button type="button" class="pg-theme-toggle__button" data-theme-mode="dark">Dark</button>
        </div>
      </div>
    </header>
    <div class="pg-shell">
      <aside class="pg-sidebar">
        <div class="pg-sidebar__section">
          <div class="pg-sidebar__eyebrow">Explorer</div>
          <button type="button" class="pg-nav-item pg-nav-item--active">Editor</button>
          <button type="button" class="pg-nav-item" data-open-drawer="examples">Gallery</button>
          <button type="button" class="pg-nav-item" data-open-drawer="docs">Docs</button>
          <a class="pg-nav-item" href="/reference/vscode-makrell.html" target="_blank" rel="noopener">VS Code</a>
        </div>
        <div class="pg-sidebar__project">
          <div class="pg-sidebar__project-title">Project Alpha</div>
          <div class="pg-sidebar__project-subtitle">MakrellTS 0.10.0</div>
          <button type="button" class="pg-button pg-button--secondary" data-reset-example>Reset example</button>
        </div>
        <div class="pg-sidebar__footer">
          <a href="/reference/vscode-makrell.html" target="_blank" rel="noopener">Editor support</a>
          <a href="/makrellts/tooling.html" target="_blank" rel="noopener">Tooling</a>
        </div>
      </aside>
      <section class="pg-drawer" data-drawer hidden>
        <div class="pg-drawer__header">
          <div class="pg-drawer__title" data-drawer-title>Examples</div>
          <button type="button" class="pg-icon-button" data-close-drawer aria-label="Close panel">×</button>
        </div>
        <div class="pg-drawer__body" data-drawer-body></div>
      </section>
      <main class="pg-main">
        <div class="pg-main__toolbar">
          <div class="pg-file-tabs">
            <div class="pg-file-tab pg-file-tab--active">source.mrts</div>
            <div class="pg-file-tab" data-inspector-target="generated">generated.js</div>
          </div>
          <div class="pg-run-tools">
            <div class="pg-status-pill" data-compiler-status>Idle</div>
            <button type="button" class="pg-button" data-compile>Compile</button>
            <button type="button" class="pg-button pg-button--primary" data-run>Run code</button>
          </div>
        </div>
        <div class="pg-workbench">
          <section class="pg-editor-pane">
            <div class="pg-editor-head">
              <div>
                <div class="pg-eyebrow">MakrellTS editor</div>
                <div class="pg-editor-title" data-example-title></div>
              </div>
              <div class="pg-info-card">
                <div class="pg-info-card__row"><span>Entry</span><strong data-example-path></strong></div>
                <div class="pg-info-card__row"><span>Runtime</span><strong data-example-runtime></strong></div>
                <div class="pg-info-card__row"><span>Diagnostics</span><strong data-diagnostic-count>0</strong></div>
              </div>
            </div>
            <div class="pg-editor-surface" id="editor-root"></div>
            <div class="pg-statusbar">
              <div class="pg-statusbar__left">
                <span data-status-text>Ready</span>
                <span data-status-diagnostics>0 errors</span>
              </div>
              <div class="pg-statusbar__right">
                <span>.mrts</span>
                <span data-example-id></span>
              </div>
            </div>
          </section>
          <aside class="pg-inspector">
            <div class="pg-inspector__tabs">
              <button type="button" class="pg-inspector__tab pg-inspector__tab--active" data-inspector-tab="output">Output</button>
              <button type="button" class="pg-inspector__tab" data-inspector-tab="generated">JS</button>
              <button type="button" class="pg-inspector__tab" data-inspector-tab="diagnostics">Issues</button>
            </div>
            <section class="pg-inspector__panel pg-inspector__panel--active" data-inspector-panel="output">
              <div class="pg-terminal" data-terminal></div>
            </section>
            <section class="pg-inspector__panel" data-inspector-panel="generated">
              <pre class="pg-code-block" data-generated></pre>
            </section>
            <section class="pg-inspector__panel" data-inspector-panel="diagnostics">
              <div class="pg-diagnostics" data-diagnostics></div>
            </section>
          </aside>
        </div>
      </main>
    </div>
    <footer class="pg-footer">
      <a class="pg-footer__link" href="https://hch.no/" target="_blank" rel="noopener">hch.no</a>
    </footer>
  </div>
`;

const drawer = app.querySelector<HTMLElement>("[data-drawer]")!;
const drawerTitle = app.querySelector<HTMLElement>("[data-drawer-title]")!;
const drawerBody = app.querySelector<HTMLElement>("[data-drawer-body]")!;
const exampleTitle = app.querySelector<HTMLElement>("[data-example-title]")!;
const examplePath = app.querySelector<HTMLElement>("[data-example-path]")!;
const exampleRuntime = app.querySelector<HTMLElement>("[data-example-runtime]")!;
const exampleIdNode = app.querySelector<HTMLElement>("[data-example-id]")!;
const compilerStatus = app.querySelector<HTMLElement>("[data-compiler-status]")!;
const statusText = app.querySelector<HTMLElement>("[data-status-text]")!;
const statusDiagnostics = app.querySelector<HTMLElement>("[data-status-diagnostics]")!;
const diagnosticCount = app.querySelector<HTMLElement>("[data-diagnostic-count]")!;
const terminal = app.querySelector<HTMLElement>("[data-terminal]")!;
const generatedBlock = app.querySelector<HTMLElement>("[data-generated]")!;
const diagnosticsHost = app.querySelector<HTMLElement>("[data-diagnostics]")!;
const editorRoot = app.querySelector<HTMLElement>("#editor-root")!;

function syncDraftForCurrentExample(source: string) {
  const example = currentExample();
  if (source === example.source) {
    delete drafts[example.id];
  } else {
    drafts[example.id] = source;
  }
  writeDrafts(drafts);
}

function renderTerminal() {
  terminal.innerHTML = currentOutput.map((line) => `<div class="pg-terminal__line pg-terminal__line--${line.tone}">${escapeHtml(line.text)}</div>`).join("");
}

function renderDiagnostics() {
  diagnosticCount.textContent = String(diagnostics.length);
  diagnosticsHost.innerHTML = diagnostics.length === 0
    ? `<div class="pg-empty-state">No compiler problems. This source currently compiles through the real MakrellTS browser path.</div>`
    : diagnostics.map((diagnostic) => `<div class="pg-diagnostic"><div class="pg-diagnostic__title">${escapeHtml(diagnostic.message)}</div><div class="pg-diagnostic__meta">from ${diagnostic.from} to ${diagnostic.to}</div></div>`).join("");
}

function renderStatus() {
  statusDiagnostics.textContent = diagnostics.length === 0 ? "0 errors" : `${diagnostics.length} error${diagnostics.length === 1 ? "" : "s"}`;
  compilerStatus.textContent = diagnostics.length === 0 ? "Compiler ready" : "Check diagnostics";
}

function renderExampleHeader() {
  const example = currentExample();
  exampleTitle.textContent = example.title;
  examplePath.textContent = example.entryPath;
  exampleRuntime.textContent = example.runtime === "browser" ? "Browser-oriented" : "Runnable here";
  exampleIdNode.textContent = example.id;
}

function renderDrawer() {
  if (state.drawerMode === "closed") {
    drawer.hidden = true;
    return;
  }
  drawer.hidden = false;
  const example = currentExample();
  if (state.drawerMode === "examples") {
    drawerTitle.textContent = "Examples";
    drawerBody.innerHTML = `<div class="pg-example-list">${examples.map((item) => `
      <button type="button" class="pg-example-card ${item.id === example.id ? "pg-example-card--active" : ""}" data-example-id="${item.id}">
        <div class="pg-example-card__title">${escapeHtml(item.title)}</div>
        <div class="pg-example-card__summary">${escapeHtml(item.summary)}</div>
        <div class="pg-example-card__meta">${escapeHtml(item.entryPath)} · ${escapeHtml(item.runtime)}</div>
      </button>
    `).join("")}</div>`;
    for (const button of drawerBody.querySelectorAll<HTMLElement>("[data-example-id]")) {
      button.addEventListener("click", () => loadExample(button.dataset.exampleId || example.id));
    }
    return;
  }

  const note = getDocNote(example);
  drawerTitle.textContent = "Documentation";
  drawerBody.innerHTML = `
    <div class="pg-doc-panel">
      <div class="pg-doc-panel__title">${escapeHtml(note.title)}</div>
      <p class="pg-doc-panel__summary">${escapeHtml(note.summary)}</p>
      <div class="pg-tag-row">${example.tags.map((tag) => `<span class="pg-tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="pg-doc-section">
        <div class="pg-doc-section__title">Try this next</div>
        <ul>${note.prompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join("")}</ul>
      </div>
      ${note.notes?.length ? `<div class="pg-doc-section"><div class="pg-doc-section__title">Notes</div><ul>${note.notes.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></div>` : ""}
      <div class="pg-doc-section">
        <div class="pg-doc-section__title">Related docs</div>
        <div class="pg-link-list">${note.links.map((link) => `<a href="${link.href}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join("")}</div>
      </div>
    </div>
  `;
}

function setInspectorMode(mode: InspectorMode) {
  state.inspectorMode = mode;
  for (const tab of app.querySelectorAll<HTMLElement>("[data-inspector-tab]")) {
    tab.classList.toggle("pg-inspector__tab--active", tab.dataset.inspectorTab === mode);
  }
  for (const panel of app.querySelectorAll<HTMLElement>("[data-inspector-panel]")) {
    panel.classList.toggle("pg-inspector__panel--active", panel.dataset.inspectorPanel === mode);
  }
  writeState(state);
}

function persistCurrentDraft() {
  syncDraftForCurrentExample(editor.getValue());
}

function loadExample(exampleId: string) {
  state.exampleId = exampleId;
  editor.setValue(currentSource());
  currentGenerated = "";
  currentOutput = [{ tone: "info", text: `Loaded ${currentExample().title}.` }];
  renderTerminal();
  generatedBlock.textContent = "";
  renderExampleHeader();
  diagnostics = validateSource(editor.getValue());
  editor.setDiagnostics(diagnostics);
  renderDiagnostics();
  renderDrawer();
  renderStatus();
  writeState(state);
}

function createRuntimeScope(lines: OutputLine[]) {
  const emit = (tone: OutputLine["tone"], values: unknown[]) => {
    lines.push({
      tone,
      text: values.map((value) => typeof value === "string" ? value : JSON.stringify(value)).join(" "),
    });
  };
  return {
    console: {
      log: (...values: unknown[]) => emit("print", values),
      warn: (...values: unknown[]) => emit("error", values),
      error: (...values: unknown[]) => emit("error", values),
    },
    print: (...values: unknown[]) => emit("print", values),
    Promise,
    Math,
    JSON,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    parseInt,
    parseFloat,
    setTimeout,
    clearTimeout,
  };
}

async function handleCompile(runAfterCompile: boolean) {
  const source = editor.getValue();
  persistCurrentDraft();
  diagnostics = validateSource(source);
  editor.setDiagnostics(diagnostics);
  renderDiagnostics();
  renderStatus();
  if (diagnostics.length > 0) {
    currentOutput = [{ tone: "error", text: "Compile failed. See diagnostics for marked source locations." }];
    renderTerminal();
    setInspectorMode("diagnostics");
    return;
  }

  try {
    currentGenerated = compileForBrowser(source);
    generatedBlock.textContent = currentGenerated;
    if (!runAfterCompile) {
      currentOutput = [{ tone: "success", text: "Compile succeeded. Generated JavaScript updated." }];
      renderTerminal();
      setInspectorMode("generated");
      return;
    }
    const outputLines: OutputLine[] = [{ tone: "info", text: `$ run ${currentExample().entryPath}` }];
    const result = await runInBrowserAsync(source, { scope: createRuntimeScope(outputLines) });
    outputLines.push({
      tone: "success",
      text: `Result: ${typeof result === "string" ? result : JSON.stringify(result)}`,
    });
    currentOutput = outputLines;
    renderTerminal();
    setInspectorMode("output");
  } catch (error) {
    currentOutput = [{ tone: "error", text: error instanceof Error ? error.message : String(error) }];
    renderTerminal();
    setInspectorMode("output");
  }
}

function openDrawer(mode: Exclude<DrawerMode, "closed">) {
  state.drawerMode = state.drawerMode === mode ? "closed" : mode;
  renderDrawer();
  writeState(state);
}

function buildShareUrl() {
  const example = currentExample();
  const source = editor.getValue();
  const params = new URLSearchParams();
  params.set("example", example.id);
  params.set("panel", state.drawerMode);
  params.set("tab", state.inspectorMode);
  if (source !== example.source) params.set("code", encodeText(source));
  return `${window.location.origin}/playground/?${params.toString()}`;
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const example = params.get("example");
  const panel = params.get("panel");
  const tab = params.get("tab");
  const code = params.get("code");
  if (example && exampleIndex.has(example)) state.exampleId = example;
  if (panel === "examples" || panel === "docs" || panel === "closed") state.drawerMode = panel;
  if (tab === "output" || tab === "generated" || tab === "diagnostics") state.inspectorMode = tab;
  if (code) {
    const decoded = decodeText(code);
    if (decoded) drafts[state.exampleId] = decoded;
  }
}

hydrateFromUrl();

for (const button of app.querySelectorAll<HTMLElement>("[data-open-drawer]")) {
  button.addEventListener("click", () => openDrawer(button.dataset.openDrawer as "examples" | "docs"));
}
for (const button of app.querySelectorAll<HTMLElement>("[data-inspector-tab]")) {
  button.addEventListener("click", () => setInspectorMode(button.dataset.inspectorTab as InspectorMode));
}
for (const button of app.querySelectorAll<HTMLElement>("[data-theme-mode]")) {
  button.addEventListener("click", () => setTheme(button.dataset.themeMode as ThemeMode));
}

app.querySelector<HTMLElement>("[data-close-drawer]")?.addEventListener("click", () => {
  state.drawerMode = "closed";
  renderDrawer();
  writeState(state);
});
app.querySelector<HTMLElement>("[data-run]")?.addEventListener("click", () => void handleCompile(true));
app.querySelector<HTMLElement>("[data-compile]")?.addEventListener("click", () => void handleCompile(false));
app.querySelector<HTMLElement>("[data-reset-example]")?.addEventListener("click", () => {
  const example = currentExample();
  delete drafts[example.id];
  writeDrafts(drafts);
  editor.setValue(example.source);
  diagnostics = validateSource(example.source);
  editor.setDiagnostics(diagnostics);
  currentGenerated = "";
  generatedBlock.textContent = "";
  currentOutput = [{ tone: "info", text: `Reset ${example.title} to the checked-in source.` }];
  renderTerminal();
  renderDiagnostics();
  renderStatus();
});
app.querySelector<HTMLElement>("[data-copy-link]")?.addEventListener("click", async () => {
  await navigator.clipboard.writeText(buildShareUrl());
  currentOutput = [{ tone: "success", text: "Share link copied to clipboard." }];
  renderTerminal();
});

async function initialise() {
  editor = await createMakrellEditor(
    editorRoot,
    currentSource(),
    (source) => validateSource(source),
    (source) => {
      diagnostics = validateSource(source);
      syncDraftForCurrentExample(source);
      renderDiagnostics();
      renderStatus();
    },
  );

  setTheme(state.theme);
  renderExampleHeader();
  renderDrawer();
  setInspectorMode(state.inspectorMode);
  diagnostics = validateSource(editor.getValue());
  editor.setDiagnostics(diagnostics);
  renderDiagnostics();
  currentOutput = [{ tone: "info", text: "Playground ready. This surface uses the real MakrellTS browser compiler/runtime path." }];
  renderTerminal();
  renderStatus();
}

void initialise();
