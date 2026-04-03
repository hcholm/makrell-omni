import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, "..");
const sharedRoot = path.resolve(extensionRoot, "..", "shared", "makrell-editor-assets");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const packageJson = readJson(path.join(extensionRoot, "package.json"));
const sharedLanguages = readJson(path.join(sharedRoot, "languages.json")).languages;
const contributedLanguages = packageJson.contributes.languages;
const contributedGrammars = packageJson.contributes.grammars;
const contributedSnippets = packageJson.contributes.snippets;

const sharedById = new Map(sharedLanguages.map((lang) => [lang.id, lang]));
const contributedById = new Map(contributedLanguages.map((lang) => [lang.id, lang]));

const problems = [];

for (const shared of sharedLanguages) {
  const contributed = contributedById.get(shared.id);
  if (!contributed) {
    problems.push(`Missing contributed language for '${shared.id}'.`);
    continue;
  }

  const sharedExtensions = JSON.stringify(shared.extensions);
  const contributedExtensions = JSON.stringify(contributed.extensions);
  if (sharedExtensions !== contributedExtensions) {
    problems.push(`Extension mismatch for '${shared.id}': shared=${sharedExtensions} contributed=${contributedExtensions}`);
  }

  const sharedAliases = JSON.stringify(shared.aliases);
  const contributedAliases = JSON.stringify(contributed.aliases);
  if (sharedAliases !== contributedAliases) {
    problems.push(`Alias mismatch for '${shared.id}': shared=${sharedAliases} contributed=${contributedAliases}`);
  }
}

for (const grammar of contributedGrammars) {
  if (!sharedById.has(grammar.language)) {
    problems.push(`Grammar entry references unknown language '${grammar.language}'.`);
  }
}

for (const snippet of contributedSnippets) {
  if (!sharedById.has(snippet.language)) {
    problems.push(`Snippet entry references unknown language '${snippet.language}'.`);
  }
}

if (problems.length > 0) {
  console.error("Shared asset validation failed:");
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log(`Shared asset validation passed for ${sharedLanguages.length} languages.`);
