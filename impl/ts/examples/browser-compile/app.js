import { compileForBrowser, runInBrowser } from "../../dist/browser/browser.js";

const src = `
{fun add [x:int y:int]
  x + y
}
{add 20 22}
`;

const js = compileForBrowser(src);
const result = runInBrowser(src, {
  scope: { console },
});

const out = document.getElementById("out");
if (out) {
  out.textContent = `MakrellTS browser compile: result=${String(result)} jslen=${js.length}`;
}
