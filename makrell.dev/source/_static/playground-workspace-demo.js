(() => {
  const DEMO_DATA = {
    hello: {
      title: "hello.mrts",
      source: `{fun square [x]
    x * x}

values = [2 3 5]

{print "Makrell Playground"}
{print {values | {map square} | sum}}`,
      output: `Makrell Playground
38`,
      generated: `const values = [2, 3, 5]
console.log(sum(values.map(square)))`,
      heading: "What this shows",
      summary: "A compact MakrellTS example with a visible result and a simple functional flow.",
      points: [
        "Change one value and run again.",
        "Compare the source with generated JS.",
        "Follow the quick-start docs next."
      ]
    },
    macros: {
      title: "examples/macros/showcase.mrts",
      source: `{def macro pipe [ns]
    ...
}

pipeResult = {pipe 5 bump square}
rpnResult = {rpn 2 3 * 5 7 * +}
lispResult = {lisp "(lispAdd 6 35 11)"}`,
      output: `== MakrellTS macro showcase ==
pipeResult = 64
rpnResult = 41
lispResult = 52`,
      generated: `// macro-expanded code shown after compilation
const pipeResult = square(bump(5))`,
      heading: "Macro trio",
      summary: "The shared pipe / rpn / lisp showcase and the strongest current family-wide macro story.",
      points: [
        "Change the postfix expression in rpn.",
        "Swap the Lisp-shaped input string.",
        "Compare this example with MakrellPy and Makrell#."
      ]
    },
    browser: {
      title: "examples/browser-compile/",
      source: `source.mrts -> compile in browser -> show output

The browser path should use real MakrellTS code,
not a separate demo compiler.`,
      output: `Compiled successfully
1 source file
1 generated output view`,
      generated: `// generated JS preview
console.log("browser compile path")`,
      heading: "Browser compile path",
      summary: "A bridge example that proves the playground is using the real browser-facing MakrellTS path.",
      points: [
        "Inspect the compile/run loop.",
        "Use this as the reference for browser-host behaviour.",
        "Compare it with the CLI-oriented track."
      ]
    },
    nbody: {
      title: "examples/nbody-browser/app.mrts",
      source: `{fun stepSim []
    {integrate}
    {mergeCollisions}
    {drawFrame}
}`,
      output: `canvas running
64 bodies
2 merges last step`,
      generated: `function stepSim() {
  integrate();
  mergeCollisions();
  drawFrame();
}`,
      heading: "Richer browser example",
      summary: "A larger browser-native example that makes the case for a real MakrellTS playground.",
      points: [
        "Change one simulation parameter.",
        "Rerun with a different body count.",
        "Inspect how browser-facing functions are structured."
      ]
    }
  };

  function setText(root, selector, value) {
    const node = root.querySelector(selector);
    if (node) {
      node.textContent = value;
    }
  }

  function renderPoints(root, items) {
    const list = root.querySelector("[data-demo-points]");
    if (!list) {
      return;
    }

    list.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
  }

  function activateView(root, view) {
    root.querySelectorAll(".playground-demo-tab").forEach((button) => {
      button.classList.toggle("playground-demo-tab--active", button.dataset.view === view);
    });

    root.querySelectorAll(".playground-demo-panel").forEach((panel) => {
      panel.classList.toggle("playground-demo-panel--active", panel.dataset.panel === view);
    });
  }

  function activateExample(root, key) {
    const data = DEMO_DATA[key];
    if (!data) {
      return;
    }

    root.querySelectorAll(".playground-demo-example").forEach((button) => {
      button.classList.toggle("playground-demo-example--active", button.dataset.example === key);
    });

    setText(root, "[data-demo-title]", data.title);
    setText(root, "[data-demo-source]", data.source);
    setText(root, "[data-demo-output]", data.output);
    setText(root, "[data-demo-generated]", data.generated);
    setText(root, "[data-demo-heading]", data.heading);
    setText(root, "[data-demo-summary]", data.summary);
    renderPoints(root, data.points);
  }

  function installDemo(root) {
    root.querySelectorAll(".playground-demo-tab").forEach((button) => {
      button.addEventListener("click", () => activateView(root, button.dataset.view));
    });

    root.querySelectorAll(".playground-demo-example").forEach((button) => {
      button.addEventListener("click", () => activateExample(root, button.dataset.example));
    });

    activateExample(root, "hello");
    activateView(root, "source");
  }

  function init() {
    document.querySelectorAll("[data-playground-demo]").forEach(installDemo);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
