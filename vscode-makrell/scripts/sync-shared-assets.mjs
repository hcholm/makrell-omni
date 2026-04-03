import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, "..");
const sharedRoot = path.resolve(extensionRoot, "..", "shared", "makrell-editor-assets");

const copies = [
  ["language-configuration.json", "language-configuration.json"],
  [path.join("snippets", "makrell.code-snippets.json"), path.join("snippets", "makrell.code-snippets.json")],
  [path.join("syntaxes", "makrell.tmLanguage.json"), path.join("syntaxes", "makrell.tmLanguage.json")]
];

for (const [fromRel, toRel] of copies) {
  const from = path.join(sharedRoot, fromRel);
  const to = path.join(extensionRoot, toRel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`Synced ${fromRel} -> ${toRel}`);
}
