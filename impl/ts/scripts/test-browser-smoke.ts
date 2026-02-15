import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const browserExample = join(root, "examples", "browser-smoke", "index.html");

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
