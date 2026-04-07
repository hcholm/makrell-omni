import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const distDir = path.join(root, "dist");
const distSrcDir = path.join(distDir, "src");

if (!existsSync(distSrcDir)) {
  process.exit(0);
}

for (const name of ["index.js", "index.js.map", "cli.js", "cli.js.map", "editor_assets.js", "editor_assets.js.map", "playground.js", "playground.js.map"]) {
  const from = path.join(distSrcDir, name);
  const to = path.join(distDir, name);
  if (existsSync(from)) {
    cpSync(from, to, { force: true });
  }
}

mkdirSync(path.join(distDir, "scripts"), { recursive: true });
rmSync(distSrcDir, { recursive: true, force: true });
