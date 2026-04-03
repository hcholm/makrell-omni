import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..");
const outputPath = join(projectRoot, "src", "generated", "playground_examples.ts");

const examples = [
  {
    id: "hello",
    title: "Hello and basics",
    summary: "A compact MakrellTS file showing functions, macros, debug output, and pattern matching.",
    entryPath: "examples/hello.mrts",
    runtime: "cli",
    tags: ["intro", "core", "macro"],
  },
  {
    id: "macros-showcase",
    title: "Shared macro showcase",
    summary: "The v0.10.0 showcase trio: pipe, rpn, and lisp in the MakrellTS track.",
    entryPath: "examples/macros/showcase.mrts",
    runtime: "cli",
    tags: ["macro", "pipe", "rpn", "lisp"],
  },
  {
    id: "nbody-browser",
    title: "N-body browser simulation",
    summary: "A larger browser-facing MakrellTS example with animation state, physics, and canvas drawing.",
    entryPath: "examples/nbody-browser/app.mrts",
    runtime: "browser",
    tags: ["browser", "simulation", "canvas"],
  },
];

const payload = examples.map((example) => ({
  ...example,
  source: readFileSync(join(projectRoot, example.entryPath), "utf8"),
}));

const output = `export interface MakrellPlaygroundExample {
  id: string;
  title: string;
  summary: string;
  entryPath: string;
  runtime: "cli" | "browser";
  tags: string[];
  source: string;
}

export const makrellPlaygroundExamples: MakrellPlaygroundExample[] = ${JSON.stringify(payload, null, 2)};\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, output, "utf8");
console.log(`Synced playground examples -> ${outputPath}`);
