import { mkdir, readdir, rm, copyFile, stat } from "node:fs/promises";
import path from "node:path";

const root = new URL(".", import.meta.url);
const srcDir = path.join(root.pathname, "src");
const distDir = path.join(root.pathname, "dist");
const siteDir = path.join(root.pathname, "..", "makrell.dev", "build", "html", "playground");

async function copyDir(fromDir, toDir) {
  await mkdir(toDir, { recursive: true });
  for (const entry of await readdir(fromDir)) {
    const fromPath = path.join(fromDir, entry);
    const toPath = path.join(toDir, entry);
    const entryStat = await stat(fromPath);
    if (entryStat.isDirectory()) {
      await copyDir(fromPath, toPath);
    } else {
      await copyFile(fromPath, toPath);
    }
  }
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const result = await Bun.build({
  entrypoints: [path.join(srcDir, "main.ts")],
  outdir: distDir,
  naming: {
    entry: "app.js",
  },
  target: "browser",
  format: "esm",
  sourcemap: "linked",
  minify: false,
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

await copyFile(path.join(srcDir, "index.html"), path.join(distDir, "index.html"));
await copyFile(path.join(srcDir, "styles.css"), path.join(distDir, "styles.css"));

await rm(siteDir, { recursive: true, force: true });
await copyDir(distDir, siteDir);

console.log(`Playground built to ${distDir}`);
console.log(`Playground synced to ${siteDir}`);
