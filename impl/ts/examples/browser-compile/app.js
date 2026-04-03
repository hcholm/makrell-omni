import { compileForBrowser, runInBrowserAsync } from "../../dist/browser/browser.js";
import { makrellEditorLanguages } from "../../dist/editor_assets.js";
import { makrellPlaygroundExamples } from "../../dist/playground.js";

const src = `
{fun add [x:int y:int]
  x + y
}
{add 20 22}
`;

const js = compileForBrowser(src);
const result = await runInBrowserAsync(src, {
  scope: { console, Promise },
});

const out = document.getElementById("out");
if (out) {
  const extensions = makrellEditorLanguages.flatMap((language) => language.extensions).join(", ");
  const launchExamples = makrellPlaygroundExamples.map((example) => example.id).join(", ");
  out.textContent = `MakrellTS browser compile: result=${String(result)} jslen=${js.length} languages=${makrellEditorLanguages.length} extensions=${extensions} launch=${makrellPlaygroundExamples.length}:${launchExamples}`;
}
