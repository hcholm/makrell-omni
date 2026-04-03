(function () {
  const root = document.querySelector("[data-playground-live]");
  if (!root) return;

  const select = root.querySelector("[data-playground-live-example]");
  const editor = root.querySelector("[data-playground-live-editor]");
  const runButton = root.querySelector("[data-playground-live-run]");
  const compileButton = root.querySelector("[data-playground-live-compile]");
  const resetButton = root.querySelector("[data-playground-live-reset]");
  const shareButton = root.querySelector("[data-playground-live-share]");
  const status = root.querySelector("[data-playground-live-status]");
  const output = root.querySelector("[data-playground-live-output]");
  const generated = root.querySelector("[data-playground-live-generated]");
  const title = root.querySelector("[data-playground-live-title]");
  const summary = root.querySelector("[data-playground-live-summary]");
  const tags = root.querySelector("[data-playground-live-tags]");
  const meta = root.querySelector("[data-playground-live-meta]");
  const promptList = root.querySelector("[data-playground-live-prompts]");
  const docsTitle = root.querySelector("[data-playground-live-docs-title]");
  const docsSummary = root.querySelector("[data-playground-live-docs-summary]");
  const docsLinks = root.querySelector("[data-playground-live-doc-links]");
  const rail = root.querySelector("[data-playground-live-rail]");
  const viewButtons = Array.from(root.querySelectorAll("[data-playground-live-view]"));
  const panels = Array.from(root.querySelectorAll("[data-playground-live-panel]"));

  const docsByExample = {
    hello: {
      title: "MakrellTS quick start",
      summary: "This example is the fastest way into ordinary MakrellTS code, macros, and pattern matching.",
      links: [
        { href: "../makrellts/quick-start.html", label: "MakrellTS quick start" },
        { href: "../tutorials/first-program-makrellts.html", label: "First MakrellTS program" },
        { href: "./onboarding.html", label: "Playground onboarding" },
      ],
      prompts: [
        "Change the debug labels and rerun the file.",
        "Edit the pattern-matching branch so the final verdict changes.",
        "Try replacing repeat_add with a direct pipeline of ordinary functions.",
      ],
    },
    "macros-showcase": {
      title: "Macro showcase docs",
      summary: "This example is the shared v0.10.0 macro trio for MakrellTS: pipe, rpn, and lisp.",
      links: [
        { href: "../makrellts/cookbook-macros.html", label: "MakrellTS macro cookbook" },
        { href: "../playground/examples.html", label: "Playground launch examples" },
        { href: "../playground/views.html", label: "Playground views" },
      ],
      prompts: [
        "Change the pipe chain and see how the generated JS reacts.",
        "Tweak the RPN input and rerun it with different operators.",
        "Edit the embedded Lisp-like string and compare source versus output.",
      ],
    },
    "nbody-browser": {
      title: "Browser example docs",
      summary: "This example shows the larger browser-facing MakrellTS story: state, rendering, and runtime interop.",
      links: [
        { href: "../makrellts/cookbook-browser.html", label: "MakrellTS browser cookbook" },
        { href: "../playground/architecture.html", label: "Playground architecture" },
        { href: "../playground/responsive.html", label: "Responsive behaviour" },
      ],
      prompts: [
        "Adjust a simulation constant and recompile to inspect the changed JS.",
        "Scroll through the source to see how state and drawing are structured.",
        "Use this example as the browser-heavy reference point for the launch set.",
      ],
    },
  };

  let runtime = null;
  let examples = [];
  let editorAssets = null;
  let currentExample = null;
  let activeView = "source";
  let railButtons = [];
  let saveTimer = null;

  const DRAFTS_KEY = "makrell.playground.drafts.v1";
  const STATE_KEY = "makrell.playground.state.v1";

  function loadDrafts() {
    try {
      return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function saveDrafts(drafts) {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  }

  function loadStoredState() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function saveStoredState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function encodeText(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodeText(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const remainder = padded.length % 4;
    const normalised = remainder === 0 ? padded : padded + "=".repeat(4 - remainder);
    const binary = atob(normalised);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  function getDrafts() {
    return loadDrafts();
  }

  function setDraft(exampleId, source) {
    const drafts = getDrafts();
    if (!source || (currentExample && source === currentExample.source)) {
      delete drafts[exampleId];
    } else {
      drafts[exampleId] = source;
    }
    saveDrafts(drafts);
  }

  function updateStoredState() {
    saveStoredState({
      example: currentExample?.id || null,
      view: activeView,
    });
  }

  function updateLocationState() {
    const params = new URLSearchParams();
    if (currentExample?.id) params.set("example", currentExample.id);
    if (activeView && activeView !== "source") params.set("view", activeView);
    if (editor && currentExample && editor.value !== currentExample.source) {
      params.set("code", encodeText(editor.value));
    }

    const nextHash = params.toString();
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ""}`;
    history.replaceState(null, "", nextUrl);
    updateStoredState();
  }

  function readInitialState() {
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const stored = loadStoredState();
    return {
      example: fromHash.get("example") || stored.example || null,
      view: fromHash.get("view") || stored.view || "source",
      code: fromHash.get("code") ? decodeText(fromHash.get("code")) : null,
    };
  }

  function setStatus(text, tone) {
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone || "normal";
  }

  function setTags(items) {
    if (!tags) return;
    tags.innerHTML = "";
    for (const item of items) {
      const chip = document.createElement("span");
      chip.className = "playground-live-tag";
      chip.textContent = item;
      tags.appendChild(chip);
    }
  }

  function setPromptList(items) {
    if (!promptList) return;
    promptList.innerHTML = "";
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = item;
      promptList.appendChild(li);
    }
  }

  function setDocs(example) {
    const docs = docsByExample[example.id] || {
      title: "Related docs",
      summary: "This example is part of the MakrellTS launch set for the browser playground.",
      links: [{ href: "../playground/examples.html", label: "Playground examples" }],
      prompts: ["Edit the source and compare the result with the generated JS."],
    };

    if (docsTitle) docsTitle.textContent = docs.title;
    if (docsSummary) docsSummary.textContent = docs.summary;
    if (docsLinks) {
      docsLinks.innerHTML = "";
      for (const link of docs.links) {
        const anchor = document.createElement("a");
        anchor.className = "playground-live-doc-link";
        anchor.href = link.href;
        anchor.textContent = link.label;
        docsLinks.appendChild(anchor);
      }
    }
    setPromptList(docs.prompts || []);
  }

  function activateView(viewName) {
    activeView = viewName;
    for (const button of viewButtons) {
      button.classList.toggle("playground-live-tab--active", button.dataset.playgroundLiveView === viewName);
    }
    for (const panel of panels) {
      panel.classList.toggle("playground-live-panel--active", panel.dataset.playgroundLivePanel === viewName);
    }
    updateLocationState();
  }

  function renderRail() {
    if (!rail) return;
    rail.innerHTML = "";
    railButtons = [];
    for (const example of examples) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "playground-live-example";
      button.dataset.exampleId = example.id;

      const titleNode = document.createElement("strong");
      titleNode.textContent = example.title;
      button.appendChild(titleNode);

      const summaryNode = document.createElement("span");
      summaryNode.textContent = example.summary;
      button.appendChild(summaryNode);

      button.addEventListener("click", () => setExample(example));
      rail.appendChild(button);
      railButtons.push(button);
    }
  }

  function setExample(example, options) {
    const config = options || {};
    const drafts = getDrafts();
    currentExample = example;
    if (editor) {
      editor.value = config.sourceOverride ?? drafts[example.id] ?? example.source;
    }
    if (select) select.value = example.id;
    if (title) title.textContent = example.title;
    if (summary) summary.textContent = example.summary;
    setTags(example.tags || []);
    setDocs(example);
    for (const button of railButtons) {
      button.classList.toggle("playground-live-example--active", button.dataset.exampleId === example.id);
    }
    if (generated) generated.textContent = "";
    if (output) output.textContent = "";
    activateView(config.view || "source");
    setStatus(`Loaded ${example.id}`, "normal");
  }

  function captureConsole(logs) {
    return {
      log: (...args) => logs.push(args.map((value) => String(value)).join(" ")),
      warn: (...args) => logs.push(args.map((value) => String(value)).join(" ")),
      error: (...args) => logs.push(args.map((value) => String(value)).join(" ")),
    };
  }

  function renderMetaInfo() {
    if (!meta) return;
    const languageCount = editorAssets?.makrellEditorLanguages?.length ?? 0;
    const snippetCount = editorAssets?.makrellEditorSnippets ? Object.keys(editorAssets.makrellEditorSnippets).length : 0;
    meta.textContent = `Examples: ${examples.length}. Languages: ${languageCount}. Snippets: ${snippetCount}.`;
  }

  function compileCurrent() {
    if (!runtime || !editor || !generated) return null;
    const js = runtime.compileForBrowser(editor.value);
    generated.textContent = js;
    return js;
  }

  async function runCurrent() {
    if (!runtime || !editor || !output) return;
    const logs = [];
    try {
      const js = compileCurrent();
      const result = await (runtime.runInBrowserAsync
        ? runtime.runInBrowserAsync(editor.value, {
          scope: {
            console: captureConsole(logs),
            Math,
            Date,
            Number,
            String,
            Boolean,
            Array,
            Object,
            Promise,
          },
        })
        : Promise.resolve(runtime.runInBrowser(editor.value, {
          scope: {
            console: captureConsole(logs),
            Math,
            Date,
            Number,
            String,
            Boolean,
            Array,
            Object,
            Promise,
          },
        })));
      const lines = [];
      if (logs.length > 0) lines.push(...logs);
      lines.push(`=> ${String(result)}`);
      output.textContent = lines.join("\n");
      activateView("output");
      setStatus(`Ran ${currentExample?.id || "scratch"} (${js ? js.length : 0} JS chars)`, "ok");
    } catch (error) {
      output.textContent = String(error);
      activateView("output");
      setStatus("Run failed", "error");
    }
  }

  function resetCurrent() {
    if (!currentExample || !editor) return;
    editor.value = currentExample.source;
    setDraft(currentExample.id, currentExample.source);
    if (generated) generated.textContent = "";
    if (output) output.textContent = "";
    activateView("source");
    setStatus(`Reset ${currentExample.id}`, "normal");
  }

  async function copyCurrentLink() {
    updateLocationState();
    if (!navigator.clipboard?.writeText) {
      setStatus("Copy link is not available in this browser", "error");
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    setStatus("Copied shareable link", "ok");
  }

  async function init() {
    setStatus("Loading runtime…", "normal");
    try {
      const [browserModule, playgroundModule, editorAssetsModule] = await Promise.all([
        import("./playground-runtime/browser.js"),
        import("./playground-runtime/playground.js"),
        import("./playground-runtime/editor_assets.js"),
      ]);

      runtime = browserModule;
      examples = playgroundModule.makrellPlaygroundExamples || [];
      editorAssets = editorAssetsModule;

      if (select) {
        for (const example of examples) {
          const option = document.createElement("option");
          option.value = example.id;
          option.textContent = `${example.title} (${example.runtime})`;
          select.appendChild(option);
        }
      }

      renderRail();

      const initialState = readInitialState();
      const initialExample = examples.find((example) => example.id === initialState.example) || examples[0];

      if (initialExample) {
        setExample(initialExample, {
          sourceOverride: initialState.code,
          view: initialState.view,
        });
      }

      renderMetaInfo();
      activateView(activeView);
      setStatus("Runtime ready", "ok");

      if (select) {
        select.addEventListener("change", () => {
          const next = examples.find((example) => example.id === select.value);
          if (next) setExample(next);
        });
      }

      if (runButton) runButton.addEventListener("click", runCurrent);
      for (const button of viewButtons) {
        button.addEventListener("click", () => activateView(button.dataset.playgroundLiveView || "source"));
      }
      if (compileButton) {
        compileButton.addEventListener("click", () => {
          try {
            const js = compileCurrent();
            if (output) output.textContent = "";
            activateView("generated");
            setStatus(`Compiled ${currentExample?.id || "scratch"} (${js ? js.length : 0} JS chars)`, "ok");
          } catch (error) {
            if (output) output.textContent = String(error);
            activateView("output");
            setStatus("Compile failed", "error");
          }
        });
      }
      if (resetButton) {
        resetButton.addEventListener("click", resetCurrent);
      }
      if (shareButton) {
        shareButton.addEventListener("click", () => {
          copyCurrentLink().catch((error) => {
            if (output) output.textContent = String(error);
            setStatus("Copy link failed", "error");
          });
        });
      }
      if (editor) {
        editor.addEventListener("input", () => {
          if (!currentExample) return;
          if (saveTimer) window.clearTimeout(saveTimer);
          saveTimer = window.setTimeout(() => {
            setDraft(currentExample.id, editor.value);
            updateLocationState();
          }, 120);
        });
      }
    } catch (error) {
      if (output) output.textContent = String(error);
      setStatus("Runtime failed to load", "error");
    }
  }

  init();
})();
