#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { compile, run } from "./index";

function printHelp(): void {
  console.log("Usage: bun run src/cli.ts <file.mrjs> [--emit-js]");
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  printHelp();
  process.exit(0);
}

const file = args[0];
const emit = args.includes("--emit-js");
const src = readFileSync(file, "utf8");

if (emit) {
  console.log(compile(src));
  process.exit(0);
}

const result = run(src, {
  scope: {
    console,
    Math,
    JSON,
    Date,
    print: (...args: unknown[]) => {
      console.log(...args);
      return args.length > 0 ? args[args.length - 1] : null;
    },
  },
});
if (result !== undefined) {
  console.log(result);
}
