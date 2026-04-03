import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(here, "..");
const sourceRoot = join(siteRoot, "source", "_static", "playground-runtime");
const tsRoot = join(siteRoot, "..", "impl", "ts", "dist");

const mappings = [
  [join("browser", "browser.js"), "browser.js"],
  ["playground.js", "playground.js"],
  ["editor_assets.js", "editor_assets.js"],
];

for (const [sourceRelative, targetRelative] of mappings) {
  const sourcePath = join(tsRoot, sourceRelative);
  const targetPath = join(sourceRoot, targetRelative);
  if (!existsSync(sourcePath)) {
    console.error("Missing MakrellTS browser artifact:", sourcePath);
    process.exit(1);
  }
  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { force: true });
  console.log(`Synced ${sourceRelative} -> ${targetRelative}`);
}
