import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const browserExample = join(root, "examples", "browser-smoke", "index.html");
const browserCompileExample = join(root, "examples", "browser-compile", "index.html");
const browserCompileApp = join(root, "examples", "browser-compile", "app.js");
const nbodyExample = join(root, "examples", "nbody-browser", "index.html");
const nbodyApp = join(root, "examples", "nbody-browser", "app.js");
const browserBundle = join(root, "dist", "browser", "browser.js");
const workerBundle = join(root, "dist", "browser", "meta_worker.js");
const editorAssetsBundle = join(root, "dist", "editor_assets.js");
const playgroundBundle = join(root, "dist", "playground.js");

if (!existsSync(browserExample)) {
  console.error("Missing browser smoke example:", browserExample);
  process.exit(1);
}

const html = readFileSync(browserExample, "utf8");
if (!html.includes("<script type=\"module\">")) {
  console.error("Browser smoke example must include an inline module script.");
  process.exit(1);
}

if (!html.includes("MakrellTS browser smoke")) {
  console.error("Browser smoke example marker not found.");
  process.exit(1);
}

console.log("Browser smoke check OK:", browserExample);

if (!existsSync(browserCompileExample) || !existsSync(browserCompileApp)) {
  console.error("Missing browser compile example files.");
  process.exit(1);
}

if (!existsSync(nbodyExample) || !existsSync(nbodyApp)) {
  console.error("Missing nbody browser example files.");
  process.exit(1);
}

if (!existsSync(browserBundle)) {
  console.error("Missing browser bundle:", browserBundle);
  process.exit(1);
}

if (!existsSync(workerBundle)) {
  console.error("Missing meta worker bundle:", workerBundle);
  process.exit(1);
}

if (!existsSync(editorAssetsBundle)) {
  console.error("Missing editor assets bundle:", editorAssetsBundle);
  process.exit(1);
}

if (!existsSync(playgroundBundle)) {
  console.error("Missing playground bundle:", playgroundBundle);
  process.exit(1);
}

const browserCompileSource = readFileSync(browserCompileApp, "utf8");
if (!browserCompileSource.includes("../../dist/editor_assets.js")) {
  console.error("Browser compile example should consume the shared editor assets bundle.");
  process.exit(1);
}

if (!browserCompileSource.includes("../../dist/playground.js")) {
  console.error("Browser compile example should consume the MakrellTS playground example bundle.");
  process.exit(1);
}

console.log("Browser bundle check OK:", browserBundle);
console.log("Meta worker bundle check OK:", workerBundle);
console.log("Editor assets bundle check OK:", editorAssetsBundle);
console.log("Playground bundle check OK:", playgroundBundle);
console.log("N-body example check OK:", nbodyExample);
