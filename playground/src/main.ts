import { createMakrellEditor, createPlainEditor, type EditorController, type EditorDiagnostic } from "./editor";
import { getDocNote } from "./docs";
import { compileForBrowser, runInBrowser, runInBrowserAsync } from "../../impl/ts/src/browser";
import { type MakrellPlaygroundExample, makrellPlaygroundExamples } from "../../impl/ts/src/playground";
import { CompileFailure } from "../../impl/ts/src/compiler";

type DrawerMode = "closed" | "examples" | "docs";
type InspectorMode = "output" | "browser" | "generated" | "diagnostics";
type ThemeMode = "dark" | "light";
type EditorPane = "code" | "html";

interface AppState {
  exampleId: string;
  drawerMode: DrawerMode;
  inspectorMode: InspectorMode;
  theme: ThemeMode;
  editorPane: EditorPane;
}

interface OutputLine {
  tone: "info" | "success" | "error" | "print";
  text: string;
}

interface BrowserPreviewSession {
  stop(): void;
  reset(): void;
}

const app = document.querySelector("#app");
if (!app) throw new Error("Missing playground root.");

const scratchExample: MakrellPlaygroundExample = {
  id: "scratch",
  title: "New script",
  summary: "A blank MakrellTS script you can start editing immediately.",
  entryPath: "scratch/new-script.mrts",
  runtime: "cli",
  tags: ["scratch", "new"],
  source: `{print "Hello from MakrellTS"}\n`,
};

const examples = [scratchExample, ...makrellPlaygroundExamples];
const exampleIndex = new Map(examples.map((example) => [example.id, example]));

const STATE_KEY = "makrell.playground.app-state.v2";
const DRAFTS_KEY = "makrell.playground.drafts.v2";
const HTML_DRAFTS_KEY = "makrell.playground.html-drafts.v1";

const defaultState: AppState = {
  exampleId: examples[0]?.id ?? "hello",
  drawerMode: "examples",
  inspectorMode: "output",
  theme: "dark",
  editorPane: "code",
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

function readHtmlDrafts(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(HTML_DRAFTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeHtmlDrafts(nextDrafts: Record<string, string>) {
  localStorage.setItem(HTML_DRAFTS_KEY, JSON.stringify(nextDrafts));
}

let state = readState();
let drafts = readDrafts();
let htmlDrafts = readHtmlDrafts();
let diagnostics: EditorDiagnostic[] = [];
let currentOutput: OutputLine[] = [];
let currentGenerated = "";
let editor: EditorController;
let htmlEditor: EditorController;
let browserPreview: BrowserPreviewSession | null = null;
let browserFrameVersion = 0;
let runToken = 0;
let runActive = false;

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

function currentHostHtml(): string {
  const example = currentExample();
  return htmlDrafts[example.id] ?? example.hostHtml ?? `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${example.title}</title>
  </head>
  <body>
    <main>
      <canvas id="sim" width="1100" height="760"></canvas>
      <div id="stats"></div>
    </main>
  </body>
</html>`;
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
        <button type="button" class="pg-button pg-button--secondary" data-new-script>New script</button>
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
          <button type="button" class="pg-button" data-new-script>New script</button>
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
            <div class="pg-file-tab pg-file-tab--active">MakrellTS playground</div>
          </div>
            <div class="pg-run-tools">
              <div class="pg-status-pill" data-compiler-status>Idle</div>
              <button type="button" class="pg-button" data-compile>Compile</button>
              <button type="button" class="pg-button pg-button--secondary" data-halt disabled>Halt</button>
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
            <div class="pg-editor-tabs">
              <button type="button" class="pg-editor-tab pg-editor-tab--active" data-editor-tab="code">Code</button>
              <button type="button" class="pg-editor-tab" data-editor-tab="html" data-html-tab>HTML</button>
            </div>
            <div class="pg-editor-stack">
              <div class="pg-editor-surface pg-editor-surface--active" id="editor-root"></div>
              <div class="pg-editor-surface" id="host-editor-root"></div>
            </div>
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
              <button type="button" class="pg-inspector__tab" data-inspector-tab="browser">Browser</button>
              <button type="button" class="pg-inspector__tab" data-inspector-tab="generated">JS</button>
              <button type="button" class="pg-inspector__tab" data-inspector-tab="diagnostics">Issues</button>
            </div>
            <section class="pg-inspector__panel pg-inspector__panel--active" data-inspector-panel="output">
              <div class="pg-terminal" data-terminal></div>
            </section>
            <section class="pg-inspector__panel" data-inspector-panel="browser">
              <section class="pg-browser-stage" data-browser-stage>
                <div class="pg-browser-stage__head">
                  <div>
                    <div class="pg-eyebrow">Browser stage</div>
                    <div class="pg-browser-stage__title">Editable host HTML + live MakrellTS runtime</div>
                  </div>
                  <div class="pg-browser-stage__actions">
                    <button type="button" class="pg-button pg-button--secondary" data-preview-reset>Reset sim</button>
                  </div>
                </div>
                <iframe class="pg-browser-stage__frame" data-browser-frame title="MakrellTS browser stage"></iframe>
                <div class="pg-browser-stage__stats" data-preview-stats>Host HTML ready. Edit Code or HTML, then run the MakrellTS example.</div>
              </section>
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
const shell = app.querySelector<HTMLElement>(".pg-shell")!;
const drawerTitle = app.querySelector<HTMLElement>("[data-drawer-title]")!;
const drawerBody = app.querySelector<HTMLElement>("[data-drawer-body]")!;
const exampleTitle = app.querySelector<HTMLElement>("[data-example-title]")!;
const examplePath = app.querySelector<HTMLElement>("[data-example-path]")!;
const exampleRuntime = app.querySelector<HTMLElement>("[data-example-runtime]")!;
const exampleIdNode = app.querySelector<HTMLElement>("[data-example-id]")!;
const compilerStatus = app.querySelector<HTMLElement>("[data-compiler-status]")!;
const haltButton = app.querySelector<HTMLButtonElement>("[data-halt]")!;
const statusText = app.querySelector<HTMLElement>("[data-status-text]")!;
const statusDiagnostics = app.querySelector<HTMLElement>("[data-status-diagnostics]")!;
const diagnosticCount = app.querySelector<HTMLElement>("[data-diagnostic-count]")!;
const terminal = app.querySelector<HTMLElement>("[data-terminal]")!;
const generatedBlock = app.querySelector<HTMLElement>("[data-generated]")!;
const diagnosticsHost = app.querySelector<HTMLElement>("[data-diagnostics]")!;
const editorRoot = app.querySelector<HTMLElement>("#editor-root")!;
const hostEditorRoot = app.querySelector<HTMLElement>("#host-editor-root")!;
const browserStage = app.querySelector<HTMLElement>("[data-browser-stage]")!;
const browserFrame = app.querySelector<HTMLIFrameElement>("[data-browser-frame]")!;
const previewStats = app.querySelector<HTMLElement>("[data-preview-stats]")!;

function stopBrowserPreview() {
  browserPreview?.stop();
  browserPreview = null;
}

function setRunActive(active: boolean) {
  runActive = active;
  haltButton.disabled = !active;
  compilerStatus.textContent = active ? "Running" : diagnostics.length === 0 ? "Compiler ready" : "Check diagnostics";
  statusText.textContent = active ? "Running. Halt will stop previews and ignore async results." : statusText.textContent;
}

function haltRunningScript() {
  runToken += 1;
  stopBrowserPreview();
  setRunActive(false);
  currentOutput = [
    {
      tone: "info",
      text: "Halt requested. Browser preview stopped, and any pending async result will be ignored. Synchronous JS already executing cannot be forcibly interrupted.",
    },
  ];
  renderTerminal();
}

function syncPreviewVisibility() {
  if (!browserPreview) {
    void mountIdleBrowserStage(currentHostHtml());
  }
}

function prepareHostHtml(hostHtml: string): string {
  return hostHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/head>/i, `<base href="/playground/" />\n</head>`);
}

function waitForFrameLoad(frame: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleLoad = () => {
      frame.removeEventListener("load", handleLoad);
      resolve();
    };
    const handleError = () => {
      frame.removeEventListener("error", handleError);
      reject(new Error("Failed to load playground browser stage."));
    };
    frame.addEventListener("load", handleLoad, { once: true });
    frame.addEventListener("error", handleError, { once: true });
  });
}

async function loadHostFrame(hostHtml: string) {
  const nextVersion = ++browserFrameVersion;
  browserFrame.srcdoc = prepareHostHtml(hostHtml);
  await waitForFrameLoad(browserFrame);
  if (nextVersion !== browserFrameVersion) {
    throw new Error("Superseded browser-stage load.");
  }
  const doc = browserFrame.contentDocument;
  const win = browserFrame.contentWindow;
  if (!doc || !win) {
    throw new Error("Browser stage did not initialise.");
  }
  return { doc, win };
}

async function mountIdleBrowserStage(hostHtml: string) {
  try {
    await loadHostFrame(hostHtml);
    previewStats.textContent = "Host HTML ready. Edit Code or HTML, then run the MakrellTS example.";
  } catch (error) {
    previewStats.textContent = error instanceof Error ? error.message : String(error);
  }
}

function setEditorPane(mode: EditorPane) {
  state.editorPane = mode;
  for (const tab of app.querySelectorAll<HTMLElement>("[data-editor-tab]")) {
    tab.classList.toggle("pg-editor-tab--active", tab.dataset.editorTab === mode);
  }
  editorRoot.classList.toggle("pg-editor-surface--active", mode === "code");
  hostEditorRoot.classList.toggle("pg-editor-surface--active", mode === "html");
  writeState(state);
}

async function createNBodyPreview(source: string, hostHtml: string, outputLines: OutputLine[]): Promise<BrowserPreviewSession> {
  const { doc, win } = await loadHostFrame(hostHtml);
  const canvas = doc.querySelector<HTMLCanvasElement>("#sim, canvas");
  if (!canvas) {
    throw new Error("Host HTML must include a canvas for the browser stage.");
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D browser-stage context unavailable.");
  }
  const statsNode = doc.querySelector<HTMLElement>("#stats");
  const bodyCountInput = doc.querySelector<HTMLInputElement>("#bodyCount");
  const gravityInput = doc.querySelector<HTMLInputElement>("#gravity");
  const dtInput = doc.querySelector<HTMLInputElement>("#dt");
  const softeningInput = doc.querySelector<HTMLInputElement>("#softening");
  const spawnRadiusInput = doc.querySelector<HTMLInputElement>("#spawnRadius");
  const velocityInput = doc.querySelector<HTMLInputElement>("#velocity");
  const trailInput = doc.querySelector<HTMLInputElement>("#trail");
  const zoomInput = doc.querySelector<HTMLInputElement>("#zoom");
  const autoCameraInput = doc.querySelector<HTMLInputElement>("#autoCamera");
  const toggleButton = doc.querySelector<HTMLButtonElement>("#toggle");
  const resetButton = doc.querySelector<HTMLButtonElement>("#reset");
  const resetViewButton = doc.querySelector<HTMLButtonElement>("#resetView");
  const viewSourceButton = doc.querySelector<HTMLButtonElement>("#viewSource");
  const sourceCode = doc.querySelector<HTMLElement>("#sourceCode");
  const sourceDialog = doc.querySelector<HTMLDialogElement>("#sourceDialog");
  const closeSourceButton = doc.querySelector<HTMLButtonElement>("#closeSource");

  const canvasWidth = canvas.width || 1100;
  const canvasHeight = canvas.height || 760;
  const centerX = canvasWidth * 0.5;
  const centerY = canvasHeight * 0.5;

  const numValue = (input: HTMLInputElement | null, fallback: number) =>
    input ? Number.parseFloat(input.value) || fallback : fallback;
  const boolValue = (input: HTMLInputElement | null, fallback: boolean) =>
    input ? input.checked : fallback;
  const setOutput = (id: string, value: string) => {
    const node = doc.querySelector<HTMLOutputElement>(`#${id}`);
    if (node) node.value = value;
  };
  const syncControlOutputs = () => {
    setOutput("bodyCountOut", String(Math.round(numValue(bodyCountInput, 120))));
    setOutput("gravityOut", String(numValue(gravityInput, 140)));
    setOutput("dtOut", numValue(dtInput, 0.032).toFixed(3));
    setOutput("softeningOut", String(numValue(softeningInput, 25)));
    setOutput("spawnRadiusOut", String(numValue(spawnRadiusInput, 260)));
    setOutput("velocityOut", String(numValue(velocityInput, 35)));
    setOutput("trailOut", numValue(trailInput, 0.14).toFixed(2));
    setOutput("zoomOut", `${numValue(zoomInput, 1).toFixed(2)}x`);
  };
  syncControlOutputs();
  for (const input of [bodyCountInput, gravityInput, dtInput, softeningInput, spawnRadiusInput, velocityInput, trailInput, zoomInput]) {
    input?.addEventListener("input", syncControlOutputs);
  }

  const params = {
    get bodyCount() { return Math.round(numValue(bodyCountInput, 120)); },
    get gravity() { return numValue(gravityInput, 140); },
    get dt() { return numValue(dtInput, 0.032); },
    get softening() { return numValue(softeningInput, 25); },
    get spawnRadius() { return numValue(spawnRadiusInput, 260); },
    get velocity() { return numValue(velocityInput, 35); },
    get trail() { return numValue(trailInput, 0.14); },
  };

  const state = {
    bodies: [] as Array<{ x: number; y: number; vx: number; vy: number; mass: number; hue: number }>,
    lastMerged: 0,
  };
  const camera = {
    x: centerX,
    y: centerY,
    zoom: 1,
    minZoom: 0.25,
    maxZoom: 6,
  };

  let frameCount = 0;
  let fps = 0;
  let fpsWindowStart = performance.now();
  let rafId = 0;
  let paused = false;

  const rand = (min: number, max: number): number => min + Math.random() * (max - min);
  const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
  const bodyRadius = (mass: number): number => Math.max(1.7, Math.sqrt(mass) * 0.9);
  const makeBody = (cx: number, cy: number, spawnRadius: number, velocityRange: number) => {
    const angle = rand(0, Math.PI * 2);
    const radius = Math.sqrt(Math.random()) * spawnRadius;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: rand(-velocityRange, velocityRange),
      vy: rand(-velocityRange, velocityRange),
      mass: rand(1.5, 8.5),
      hue: rand(180, 360),
    };
  };
  const toScreenX = (worldX: number): number => (worldX - camera.x) * camera.zoom + canvasWidth * 0.5;
  const toScreenY = (worldY: number): number => (worldY - camera.y) * camera.zoom + canvasHeight * 0.5;
  const circle = (x: number, y: number, r: number, color: string) => {
    const sx = toScreenX(x);
    const sy = toScreenY(y);
    const sr = Math.max(0.9, r * camera.zoom);
    if (sx + sr < 0 || sy + sr < 0 || sx - sr > canvasWidth || sy - sr > canvasHeight) {
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  };
  const setStats = (nextFps: number, bodies: number, totalMass: number, merged: number) => {
    const text = `fps ${nextFps.toFixed(1)}  |  bodies ${bodies}  |  total mass ${totalMass.toFixed(1)}  |  merged ${merged}`;
    previewStats.textContent = text;
    if (statsNode) statsNode.textContent = text;
  };
  const updateAutoCamera = () => {
    if (state.bodies.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const body of state.bodies) {
      const r = bodyRadius(body.mass) * 1.8;
      minX = Math.min(minX, body.x - r);
      maxX = Math.max(maxX, body.x + r);
      minY = Math.min(minY, body.y - r);
      maxY = Math.max(maxY, body.y + r);
    }

    const targetX = (minX + maxX) * 0.5;
    const targetY = (minY + maxY) * 0.5;
    const spanX = Math.max(10, maxX - minX);
    const spanY = Math.max(10, maxY - minY);
    const targetZoom = clamp(
      Math.min((canvasWidth * 0.88) / spanX, (canvasHeight * 0.88) / spanY),
      camera.minZoom,
      camera.maxZoom,
    );
    if (boolValue(autoCameraInput, true)) {
      const smooth = 0.08;
      camera.x += (targetX - camera.x) * smooth;
      camera.y += (targetY - camera.y) * smooth;
      camera.zoom += (targetZoom - camera.zoom) * smooth;
    } else {
      camera.zoom = clamp(numValue(zoomInput, camera.zoom), camera.minZoom, camera.maxZoom);
    }
  };

  const scope = {
    ...createRuntimeScope(outputLines),
    Math,
    params,
    centerX,
    centerY,
    canvasWidth,
    canvasHeight,
    ctx,
    makeBody,
    bodyRadius,
    circle,
    setStats,
    str: String,
    state,
  };

  const api = runInBrowser(source, { scope });
  if (!Array.isArray(api) || api.length < 3) {
    throw new Error("Browser example did not return the expected [stepSim resetSim getStats] API.");
  }

  const [stepSim, resetSim, getStats] = api as [
    (() => unknown),
    (() => unknown),
    (() => [number, number, number]),
  ];

  if (typeof stepSim !== "function" || typeof resetSim !== "function" || typeof getStats !== "function") {
    throw new Error("Browser example API is incomplete.");
  }

  ctx.fillStyle = "#070d17";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  resetSim();
  sourceCode && (sourceCode.textContent = source);
  viewSourceButton?.addEventListener("click", () => sourceDialog?.showModal());
  closeSourceButton?.addEventListener("click", () => sourceDialog?.close());

  const tick = (now: number) => {
    if (paused) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    updateAutoCamera();
    stepSim();
    frameCount += 1;
    if (now - fpsWindowStart >= 500) {
      fps = (frameCount * 1000) / (now - fpsWindowStart);
      frameCount = 0;
      fpsWindowStart = now;
    }
    const [count, totalMass, merged] = getStats();
    setStats(fps, count, totalMass, merged);
    rafId = requestAnimationFrame(tick);
  };

  toggleButton?.addEventListener("click", () => {
    paused = !paused;
    toggleButton.textContent = paused ? "Resume" : "Pause";
    previewStats.textContent = paused ? "Simulation paused." : previewStats.textContent;
  });
  resetButton?.addEventListener("click", () => {
    resetSim();
    previewStats.textContent = "Simulation reset.";
  });
  resetViewButton?.addEventListener("click", () => {
    camera.x = centerX;
    camera.y = centerY;
    camera.zoom = 1;
    if (zoomInput) {
      zoomInput.value = "1";
      syncControlOutputs();
    }
    previewStats.textContent = "Camera reset.";
  });

  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      cancelAnimationFrame(rafId);
      ctx.fillStyle = "#070d17";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      previewStats.textContent = "Preview stopped.";
      if (statsNode) statsNode.textContent = "Preview stopped.";
    },
    reset() {
      resetSim();
      camera.x = centerX;
      camera.y = centerY;
      camera.zoom = 1;
      paused = false;
      if (toggleButton) toggleButton.textContent = "Pause";
      frameCount = 0;
      fps = 0;
      fpsWindowStart = performance.now();
      previewStats.textContent = "Simulation reset.";
      if (statsNode) statsNode.textContent = "Simulation reset.";
    },
  };
}

function syncDraftForCurrentExample(source: string) {
  const example = currentExample();
  if (source === example.source) {
    delete drafts[example.id];
  } else {
    drafts[example.id] = source;
  }
  writeDrafts(drafts);
}

function syncHtmlDraftForCurrentExample(source: string) {
  const example = currentExample();
  const baseline = example.hostHtml ?? "";
  if (source === baseline) {
    delete htmlDrafts[example.id];
  } else {
    htmlDrafts[example.id] = source;
  }
  writeHtmlDrafts(htmlDrafts);
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
  if (!runActive) {
    compilerStatus.textContent = diagnostics.length === 0 ? "Compiler ready" : "Check diagnostics";
  }
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
    shell.classList.add("pg-shell--drawer-closed");
    return;
  }
  drawer.hidden = false;
  shell.classList.remove("pg-shell--drawer-closed");
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
  runToken += 1;
  stopBrowserPreview();
  setRunActive(false);
  state.exampleId = exampleId;
  editor.setValue(currentSource());
  htmlEditor.setValue(currentHostHtml());
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
  syncPreviewVisibility();
  writeState(state);
}

function createNewScript() {
  loadExample("scratch");
  state.drawerMode = "closed";
  renderDrawer();
  currentOutput = [{ tone: "success", text: "Started a new MakrellTS script. Edit the source and run it." }];
  renderTerminal();
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
  const hostHtml = htmlEditor.getValue();
  const myRunToken = ++runToken;
  let keepRunActive = false;
  persistCurrentDraft();
  syncHtmlDraftForCurrentExample(hostHtml);
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
      if (myRunToken !== runToken) return;
      currentOutput = [{ tone: "success", text: "Compile succeeded. Generated JavaScript updated." }];
      renderTerminal();
      setInspectorMode("generated");
      return;
    }
    setRunActive(true);
    const outputLines: OutputLine[] = [{ tone: "info", text: `$ run ${currentExample().entryPath}` }];
    stopBrowserPreview();
    if (currentExample().runtime === "browser") {
      browserPreview = await createNBodyPreview(source, hostHtml, outputLines);
      if (myRunToken !== runToken) {
        browserPreview?.stop();
        browserPreview = null;
        return;
      }
      outputLines.push({
        tone: "success",
        text: "Browser preview running in the Browser tab.",
      });
      currentOutput = outputLines;
      renderTerminal();
      setInspectorMode("browser");
      syncPreviewVisibility();
      keepRunActive = true;
      return;
    }
    const result = await runInBrowserAsync(source, { scope: createRuntimeScope(outputLines) });
    if (myRunToken !== runToken) return;
    outputLines.push({
      tone: "success",
      text: `Result: ${typeof result === "string" ? result : JSON.stringify(result)}`,
    });
    currentOutput = outputLines;
    renderTerminal();
    setInspectorMode("output");
  } catch (error) {
    if (myRunToken !== runToken) return;
    stopBrowserPreview();
    currentOutput = [{ tone: "error", text: error instanceof Error ? error.message : String(error) }];
    renderTerminal();
    setInspectorMode("output");
    syncPreviewVisibility();
  } finally {
    if (myRunToken === runToken && !keepRunActive) {
      setRunActive(false);
      renderStatus();
    }
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
  const hostHtml = htmlEditor.getValue();
  const params = new URLSearchParams();
  params.set("example", example.id);
  params.set("panel", state.drawerMode);
  params.set("tab", state.inspectorMode);
  params.set("editor", state.editorPane);
  if (source !== example.source) params.set("code", encodeText(source));
  if (hostHtml !== (example.hostHtml ?? "")) params.set("html", encodeText(hostHtml));
  return `${window.location.origin}/playground/?${params.toString()}`;
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const example = params.get("example");
  const panel = params.get("panel");
  const tab = params.get("tab");
  const editorPane = params.get("editor");
  const code = params.get("code");
  const html = params.get("html");
  if (example && exampleIndex.has(example)) state.exampleId = example;
  if (panel === "examples" || panel === "docs" || panel === "closed") state.drawerMode = panel;
  if (tab === "output" || tab === "browser" || tab === "generated" || tab === "diagnostics") state.inspectorMode = tab;
  if (editorPane === "code" || editorPane === "html") state.editorPane = editorPane;
  if (code) {
    const decoded = decodeText(code);
    if (decoded) drafts[state.exampleId] = decoded;
  }
  if (html) {
    const decoded = decodeText(html);
    if (decoded) htmlDrafts[state.exampleId] = decoded;
  }
}

hydrateFromUrl();

for (const button of app.querySelectorAll<HTMLElement>("[data-open-drawer]")) {
  button.addEventListener("click", () => openDrawer(button.dataset.openDrawer as "examples" | "docs"));
}
for (const button of app.querySelectorAll<HTMLElement>("[data-inspector-tab]")) {
  button.addEventListener("click", () => setInspectorMode(button.dataset.inspectorTab as InspectorMode));
}
for (const button of app.querySelectorAll<HTMLElement>("[data-editor-tab]")) {
  button.addEventListener("click", () => setEditorPane(button.dataset.editorTab as EditorPane));
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
haltButton.addEventListener("click", () => haltRunningScript());
for (const button of app.querySelectorAll<HTMLElement>("[data-new-script]")) {
  button.addEventListener("click", () => createNewScript());
}
app.querySelector<HTMLElement>("[data-reset-example]")?.addEventListener("click", () => {
  const example = currentExample();
  runToken += 1;
  stopBrowserPreview();
  setRunActive(false);
  delete drafts[example.id];
  delete htmlDrafts[example.id];
  writeDrafts(drafts);
  writeHtmlDrafts(htmlDrafts);
  editor.setValue(example.source);
  htmlEditor.setValue(example.hostHtml ?? "");
  diagnostics = validateSource(example.source);
  editor.setDiagnostics(diagnostics);
  currentGenerated = "";
  generatedBlock.textContent = "";
  currentOutput = [{ tone: "info", text: `Reset ${example.title} to the checked-in source.` }];
  renderTerminal();
  renderDiagnostics();
  renderStatus();
  syncPreviewVisibility();
});
app.querySelector<HTMLElement>("[data-preview-reset]")?.addEventListener("click", () => {
  browserPreview?.reset();
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
  htmlEditor = await createPlainEditor(
    hostEditorRoot,
    currentHostHtml(),
    "html",
    (source) => {
      syncHtmlDraftForCurrentExample(source);
      if (!browserPreview) {
        void mountIdleBrowserStage(source);
      }
    },
  );

  setTheme(state.theme);
  renderExampleHeader();
  renderDrawer();
  syncPreviewVisibility();
  setEditorPane(state.editorPane);
  setInspectorMode(state.inspectorMode);
  diagnostics = validateSource(editor.getValue());
  editor.setDiagnostics(diagnostics);
  renderDiagnostics();
  currentOutput = [{ tone: "info", text: "Playground ready. This surface uses the real MakrellTS browser compiler/runtime path." }];
  renderTerminal();
  renderStatus();
  await mountIdleBrowserStage(currentHostHtml());
}

void initialise();
