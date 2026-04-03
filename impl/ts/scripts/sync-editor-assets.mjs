import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, "..");
const sharedRoot = join(projectRoot, "..", "..", "shared", "makrell-editor-assets");
const targetRoot = join(projectRoot, "src", "editor-assets");

const mappings = [
  ["languages.json", "languages.json"],
  ["language-configuration.json", "language-configuration.json"],
  [join("snippets", "makrell.code-snippets.json"), join("snippets", "makrell.code-snippets.json")],
  [join("syntaxes", "makrell.tmLanguage.json"), join("syntaxes", "makrell.tmLanguage.json")],
];

if (!existsSync(sharedRoot)) {
  console.error("Shared editor asset root not found:", sharedRoot);
  process.exit(1);
}

for (const [sourceRelative, targetRelative] of mappings) {
  const sourcePath = join(sharedRoot, sourceRelative);
  const targetPath = join(targetRoot, targetRelative);
  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { force: true });
  console.log(`Synced ${sourceRelative} -> ${targetRelative}`);
}
