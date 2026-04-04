import type { MakrellPlaygroundExample } from "../../impl/ts/src/playground";

export interface PlaygroundDocNote {
  title: string;
  summary: string;
  prompts: string[];
  links: Array<{ label: string; href: string }>;
  notes?: string[];
}

const base = "/makrellts";

export const docsByExample: Record<string, PlaygroundDocNote> = {
  hello: {
    title: "MakrellTS quick start",
    summary: "A compact first file with macros, pattern matching, debug output, and ordinary function flow.",
    prompts: [
      "Change the debug labels and run it again.",
      "Edit the pattern match to force the fallback branch.",
      "Replace repeat_add with a direct pipeline of ordinary functions."
    ],
    links: [
      { label: "MakrellTS quick start", href: `${base}/quick-start.html` },
      { label: "First MakrellTS program", href: "/tutorials/first-program-makrellts.html" },
      { label: "VS Code workflow", href: "/reference/vscode-makrell.html" }
    ]
  },
  "macros-showcase": {
    title: "Macro showcase",
    summary: "The shared v0.10.0 trio: pipe, rpn, and lisp, using the real MakrellTS macro path.",
    prompts: [
      "Change the pipe chain and rerun it.",
      "Alter the RPN input and inspect the generated JavaScript.",
      "Edit the Lisp-like source string and compare source versus output."
    ],
    links: [
      { label: "MakrellTS macro cookbook", href: `${base}/cookbook-macros.html` },
      { label: "MakrellTS metaprogramming", href: `${base}/metaprogramming.html` },
      { label: "Makrell family concepts", href: "/concepts/macros-and-meta.html" }
    ],
    notes: [
      "This example is runnable directly in the playground.",
      "It uses the real MakrellTS macro compiler path rather than a separate demo transform."
    ]
  },
  "nbody-browser": {
    title: "Browser-facing MakrellTS",
    summary: "A larger example built for browser state, animation, and canvas drawing. The playground now mounts a compact live canvas preview using the real MakrellTS browser runtime path.",
    prompts: [
      "Open Generated JS to see the browser-facing output shape.",
      "Change a parameter or helper function and recompile.",
      "Use this as the larger reference example for browser-oriented MakrellTS work."
    ],
    links: [
      { label: "MakrellTS browser cookbook", href: `${base}/cookbook-browser.html` },
      { label: "MakrellTS guide", href: `${base}/guide.html` },
      { label: "MakrellTS tooling", href: `${base}/tooling.html` }
    ],
    notes: [
      "The preview uses the checked-in MakrellTS example source and real browser-runtime execution.",
      "It is a compact playground host, not a full copy of the dedicated demo page."
    ]
  }
};

export function getDocNote(example: MakrellPlaygroundExample): PlaygroundDocNote {
  return docsByExample[example.id] ?? {
    title: example.title,
    summary: example.summary,
    prompts: ["Edit the source and inspect the generated JavaScript."],
    links: [{ label: "MakrellTS docs", href: `${base}/index.html` }]
  };
}
