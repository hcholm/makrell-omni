import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const isWindows = process.platform === "win32";

const pyDir = path.join(root, "impl", "py");
const tsDir = path.join(root, "impl", "ts");
const dotnetDir = path.join(root, "impl", "dotnet");
const vscodeDir = path.join(root, "vscode-makrell");
const tsNodeModulesDir = path.join(tsDir, "node_modules");
const vscodeNodeModulesDir = path.join(vscodeDir, "node_modules");
const tsBunLockPath = path.join(tsDir, "bun.lock");

function run(command, args, cwd) {
  console.log(`\n[run] ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status ?? "unknown"}): ${command} ${args.join(" ")}`);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function findNewestFile(dirPath, predicate) {
  const files = readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(predicate)
    .sort();
  if (files.length === 0) {
    throw new Error(`No matching file found in ${dirPath}`);
  }
  return path.join(dirPath, files.at(-1));
}

function parsePythonVersion() {
  const setupPy = readText(path.join(pyDir, "setup.py"));
  const match = /version='([^']+)'/.exec(setupPy);
  if (!match) throw new Error("Could not parse MakrellPy version from setup.py");
  return match[1];
}

function parseDotnetVersion() {
  const props = readText(path.join(dotnetDir, "Directory.Build.props"));
  const match = /<Version>([^<]+)<\/Version>/.exec(props);
  if (!match) throw new Error("Could not parse Makrell# library version from Directory.Build.props");
  return match[1];
}

function parseDotnetCliVersion() {
  const csproj = readText(path.join(dotnetDir, "src", "MakrellSharp.Cli", "MakrellSharp.Cli.csproj"));
  const match = /<Version>([^<]+)<\/Version>/.exec(csproj);
  if (!match) throw new Error("Could not parse Makrell# CLI version from MakrellSharp.Cli.csproj");
  return match[1];
}

function toolExecutable(toolDir, commandName) {
  return isWindows
    ? path.join(toolDir, `${commandName}.exe`)
    : path.join(toolDir, commandName);
}

const python = process.env.PYTHON || "python";
const pyVersion = parsePythonVersion();
const tsVersion = readJson(path.join(tsDir, "package.json")).version;
const dotnetVersion = parseDotnetVersion();
const dotnetCliVersion = parseDotnetCliVersion();
const vscodeVersion = readJson(path.join(vscodeDir, "package.json")).version;

console.log("[versions]");
console.log(`  MakrellPy     ${pyVersion}`);
console.log(`  MakrellTS     ${tsVersion}`);
console.log(`  Makrell# libs ${dotnetVersion}`);
console.log(`  Makrell# CLI  ${dotnetCliVersion}`);
console.log(`  VS Code       ${vscodeVersion}`);

const tmpRoot = mkdtempSync(path.join(tmpdir(), "makrell-release-"));
const pyVenvDir = path.join(tmpRoot, "py-venv");
const pyVenvPython = isWindows
  ? path.join(pyVenvDir, "Scripts", "python.exe")
  : path.join(pyVenvDir, "bin", "python");
const pyVenvScriptDir = isWindows
  ? path.join(pyVenvDir, "Scripts")
  : path.join(pyVenvDir, "bin");
const dotnetToolDir = path.join(tmpRoot, "dotnet-tools");

console.log(`\n[temp] ${tmpRoot}`);
const tsNodeModulesExisted = existsSync(tsNodeModulesDir);
const vscodeNodeModulesExisted = existsSync(vscodeNodeModulesDir);
const tsBunLockExisted = existsSync(tsBunLockPath);

let pyWheel = "";
const dotnetCliPackageDir = path.join(dotnetDir, "src", "MakrellSharp.Cli", "bin", "Release");
let vsixPath = "";

try {
  run(python, ["-m", "build"], pyDir);
  pyWheel = findNewestFile(path.join(pyDir, "dist"), (name) => name.endsWith(".whl"));
  run(python, ["-m", "venv", pyVenvDir], root);
  run(pyVenvPython, ["-m", "pip", "install", pyWheel], root);
  run(toolExecutable(pyVenvScriptDir, "makrell"), ["--help"], root);
  run(toolExecutable(pyVenvScriptDir, "makrell-langserver"), ["--help"], root);

  run("bun", ["install"], tsDir);
  run("bun", ["run", "ci"], tsDir);
  run("bun", ["pm", "pack", "--dry-run"], tsDir);

  run("dotnet", ["pack", "MakrellSharp.sln", "-c", "Release", "/nodeReuse:false", "-p:UseSharedCompilation=false"], dotnetDir);
  run("dotnet", [
    "tool",
    "install",
    "MakrellSharp.Cli",
    "--tool-path",
    dotnetToolDir,
    "--add-source",
    dotnetCliPackageDir,
    "--version",
    dotnetCliVersion,
  ], root);
  run(toolExecutable(dotnetToolDir, "makrellsharp"), [path.join(root, "impl", "dotnet", "examples", "hello.mrsh")], root);

  run("bun", ["install"], vscodeDir);
  run("bun", ["run", "verify:release"], vscodeDir);
  vsixPath = findNewestFile(vscodeDir, (name) => name.endsWith(".vsix"));

  console.log("\n[artifacts]");
  console.log(`  MakrellPy wheel: ${pyWheel}`);
  console.log(`  Makrell# CLI source: ${dotnetCliPackageDir}`);
  console.log(`  VSIX: ${vsixPath}`);

  console.log("\n[next]");
  console.log("  Manual publish steps are documented in docs/publishing-playbook.md");
} finally {
  if (!tsNodeModulesExisted && existsSync(tsNodeModulesDir)) {
    rmSync(tsNodeModulesDir, { recursive: true, force: true });
  }
  if (!vscodeNodeModulesExisted && existsSync(vscodeNodeModulesDir)) {
    rmSync(vscodeNodeModulesDir, { recursive: true, force: true });
  }
  if (!tsBunLockExisted && existsSync(tsBunLockPath)) {
    rmSync(tsBunLockPath, { force: true });
  }
}
