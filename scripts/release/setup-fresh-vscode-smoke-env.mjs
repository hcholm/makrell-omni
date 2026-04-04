import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const isWindows = process.platform === "win32";
const openAfterSetup = process.argv.includes("--open");

const pyDir = path.join(root, "impl", "py");
const tsDir = path.join(root, "impl", "ts");
const familyLspDir = path.join(root, "tooling", "ts-family-language-server");
const dotnetDir = path.join(root, "impl", "dotnet");
const vscodeDir = path.join(root, "vscode-makrell");

const tsNodeModulesDir = path.join(tsDir, "node_modules");
const familyLspNodeModulesDir = path.join(familyLspDir, "node_modules");
const vscodeNodeModulesDir = path.join(vscodeDir, "node_modules");
const tsBunLockPath = path.join(tsDir, "bun.lock");
const familyLspBunLockPath = path.join(familyLspDir, "bun.lock");

function isWindowsBatchCommand(command) {
  if (!isWindows) {
    return false;
  }

  const extension = path.extname(command).toLowerCase();
  return extension === ".cmd" || extension === ".bat";
}

function quoteWindowsCmdArg(text) {
  return `"${text.replace(/"/g, '""')}"`;
}

function quotePowerShellArg(text) {
  return `'${text.replace(/'/g, "''")}'`;
}

function getSpawnParameters(command, args) {
  if (!isWindowsBatchCommand(command)) {
    return {
      command,
      args,
      shell: false,
    };
  }

  const invocation = `& ${quotePowerShellArg(command)} ${args.map(quotePowerShellArg).join(" ")}`.trim();
  return {
    command: "powershell.exe",
    args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", invocation],
    shell: false,
  };
}

function run(command, args, cwd) {
  console.log(`\n[run] ${command} ${args.join(" ")}`);
  const spawnParams = getSpawnParameters(command, args);
  const result = spawnSync(spawnParams.command, spawnParams.args, {
    cwd,
    stdio: "inherit",
    shell: spawnParams.shell,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status ?? "unknown"}): ${command} ${args.join(" ")}`);
  }
}

function runCapture(command, args, cwd) {
  const spawnParams = getSpawnParameters(command, args);
  const result = spawnSync(spawnParams.command, spawnParams.args, {
    cwd,
    encoding: "utf8",
    shell: spawnParams.shell,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `Command failed: ${command}`).trim());
  }
  return result.stdout.trim();
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function parsePythonVersion() {
  const setupPy = readText(path.join(pyDir, "setup.py"));
  const match = /version='([^']+)'/.exec(setupPy);
  if (!match) throw new Error("Could not parse MakrellPy version from setup.py");
  return match[1];
}

function parseDotnetCliVersion() {
  const csproj = readText(path.join(dotnetDir, "src", "MakrellSharp.Cli", "MakrellSharp.Cli.csproj"));
  const match = /<Version>([^<]+)<\/Version>/.exec(csproj);
  if (!match) throw new Error("Could not parse Makrell# CLI version from MakrellSharp.Cli.csproj");
  return match[1];
}

function findCodeCommand() {
  if (process.env.VSCODE_EXE && existsSync(process.env.VSCODE_EXE)) {
    return process.env.VSCODE_EXE;
  }

  if (isWindows) {
    const codeCmd = runCapture("where", ["code.cmd"], root).split(/\r?\n/).find(Boolean);
    if (codeCmd && existsSync(codeCmd)) {
      return codeCmd;
    }

    const output = runCapture("where", ["Code.exe"], root).split(/\r?\n/).find(Boolean);
    if (output && existsSync(output)) {
      const codeCli = path.join(path.dirname(output), "bin", "code.cmd");
      if (existsSync(codeCli)) {
        return codeCli;
      }
      return output;
    }

    const fallback = path.join(process.env.LOCALAPPDATA || "", "Programs", "Microsoft VS Code", "Code.exe");
    if (existsSync(fallback)) {
      const codeCli = path.join(path.dirname(fallback), "bin", "code.cmd");
      if (existsSync(codeCli)) {
        return codeCli;
      }
      return fallback;
    }
  }

  const output = runCapture("which", ["code"], root).split(/\r?\n/).find(Boolean);
  if (output && existsSync(output)) {
    return output;
  }

  throw new Error("Unable to locate VS Code executable. Set VSCODE_EXE if needed.");
}

function resolveCodeGuiExecutable(codePath) {
  if (!isWindows) {
    return codePath;
  }

  const lower = codePath.toLowerCase();
  if (lower.endsWith("\\code.exe")) {
    return codePath;
  }

  if (lower.endsWith("\\bin\\code.cmd")) {
    const guiPath = path.join(path.dirname(path.dirname(codePath)), "Code.exe");
    if (existsSync(guiPath)) {
      return guiPath;
    }
  }

  return codePath;
}

function openVsCodeWindow(codePath, args) {
  const guiExecutable = resolveCodeGuiExecutable(codePath);
  console.log(`\n[open] ${guiExecutable} ${args.join(" ")}`);

  if (isWindows) {
    const child = spawn(guiExecutable, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    child.unref();
    return;
  }

  const child = spawn(guiExecutable, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function openWindowsLauncher(launcherPath) {
  console.log(`\n[open] Start-Process ${launcherPath}`);
  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Start-Process -FilePath ${quotePowerShellArg(launcherPath)}`,
  ], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Failed to open launcher: ${launcherPath}`);
  }
}

function getWindowsVsCodeUpdateProcesses() {
  if (!isWindows) {
    return [];
  }

  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "Get-Process | Where-Object { $_.ProcessName -like 'CodeSetup*' } | Select-Object -ExpandProperty ProcessName",
  ], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function waitForEnter(message) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    await new Promise((resolve) => {
      rl.question(message, () => resolve());
    });
  } finally {
    rl.close();
  }
}

function toolExecutable(toolDir, commandName) {
  return isWindows
    ? path.join(toolDir, `${commandName}.exe`)
    : path.join(toolDir, commandName);
}

function localBinExecutable(jsToolsDir, commandName) {
  const binDir = path.join(jsToolsDir, "node_modules", ".bin");
  if (!isWindows) {
    return path.join(binDir, commandName);
  }

  const exePath = path.join(binDir, `${commandName}.exe`);
  if (existsSync(exePath)) {
    return exePath;
  }

  const cmdPath = path.join(binDir, `${commandName}.cmd`);
  if (existsSync(cmdPath)) {
    return cmdPath;
  }

  return exePath;
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function copySample(sourceRelativePath, destinationPath) {
  cpSync(path.join(root, sourceRelativePath), destinationPath);
}

function createBrokenSample(filePath) {
  writeFileSync(filePath, "answer =\n", "utf8");
}

const python = process.env.PYTHON || "python";
const pyVersion = parsePythonVersion();
const tsVersion = readJson(path.join(tsDir, "package.json")).version;
const familyLspVersion = readJson(path.join(familyLspDir, "package.json")).version;
const dotnetCliVersion = parseDotnetCliVersion();
const vscodeVersion = readJson(path.join(vscodeDir, "package.json")).version;
const codeCommand = findCodeCommand();
const codeGuiCommand = resolveCodeGuiExecutable(codeCommand);

const tempRoot = mkdtempSync(path.join(tmpdir(), "makrell-vscode-smoke-"));
const workspaceDir = path.join(tempRoot, "workspace");
const workspaceVsCodeDir = path.join(workspaceDir, ".vscode");
const workspacePyDir = path.join(workspaceDir, "makrellpy");
const workspaceTsDir = path.join(workspaceDir, "makrellts");
const workspaceSharpDir = path.join(workspaceDir, "makrellsharp");
const workspaceFormatsDir = path.join(workspaceDir, "formats");
const workspaceScratchDir = path.join(workspaceDir, "scratch");
const userDataDir = path.join(tempRoot, "user-data");
const extensionsDir = path.join(tempRoot, "extensions");
const toolsDir = path.join(tempRoot, "tools");
const pyVenvDir = path.join(toolsDir, "py-venv");
const pyVenvPython = isWindows
  ? path.join(pyVenvDir, "Scripts", "python.exe")
  : path.join(pyVenvDir, "bin", "python");
const pyVenvScriptDir = isWindows
  ? path.join(pyVenvDir, "Scripts")
  : path.join(pyVenvDir, "bin");
const jsToolsDir = path.join(toolsDir, "js");
const dotnetToolDir = path.join(toolsDir, "dotnet-tools");

const pyWheelPath = path.join(pyDir, "dist");
const dotnetCliPackageDir = path.join(dotnetDir, "src", "MakrellSharp.Cli", "bin", "Release");

console.log("[versions]");
console.log(`  MakrellPy          ${pyVersion}`);
console.log(`  MakrellTS          ${tsVersion}`);
console.log(`  Makrell Family LSP ${familyLspVersion}`);
console.log(`  Makrell# CLI       ${dotnetCliVersion}`);
console.log(`  VS Code extension  ${vscodeVersion}`);
console.log(`  VS Code command    ${codeCommand}`);
console.log(`  VS Code GUI        ${codeGuiCommand}`);
console.log(`\n[temp] ${tempRoot}`);

const tsNodeModulesExisted = existsSync(tsNodeModulesDir);
const familyLspNodeModulesExisted = existsSync(familyLspNodeModulesDir);
const vscodeNodeModulesExisted = existsSync(vscodeNodeModulesDir);
const tsBunLockExisted = existsSync(tsBunLockPath);
const familyLspBunLockExisted = existsSync(familyLspBunLockPath);

try {
  mkdirSync(workspaceVsCodeDir, { recursive: true });
  mkdirSync(workspacePyDir, { recursive: true });
  mkdirSync(workspaceTsDir, { recursive: true });
  mkdirSync(workspaceSharpDir, { recursive: true });
  mkdirSync(workspaceFormatsDir, { recursive: true });
  mkdirSync(workspaceScratchDir, { recursive: true });
  mkdirSync(userDataDir, { recursive: true });
  mkdirSync(extensionsDir, { recursive: true });
  mkdirSync(jsToolsDir, { recursive: true });

  run(python, ["-m", "build"], pyDir);
  const pyWheel = path.join(pyWheelPath, `makrell-${pyVersion}-py3-none-any.whl`);
  if (!existsSync(pyWheel)) {
    throw new Error(`Expected MakrellPy wheel not found: ${pyWheel}`);
  }
  run(python, ["-m", "venv", pyVenvDir], root);
  run(pyVenvPython, ["-m", "pip", "install", pyWheel], root);

  run("bun", ["install"], tsDir);
  run("bun", ["run", "ci"], tsDir);
  run("bun", ["pm", "pack"], tsDir);
  const tsTgz = path.join(tsDir, `makrellts-${tsVersion}.tgz`);

  run("bun", ["install"], familyLspDir);
  run("bun", ["run", "build"], familyLspDir);
  run("bun", ["pm", "pack"], familyLspDir);
  const familyLspTgz = path.join(familyLspDir, `makrell-family-lsp-${familyLspVersion}.tgz`);

  writeJson(path.join(jsToolsDir, "package.json"), {
    name: "makrell-vscode-smoke-tools",
    private: true,
    type: "module",
  });
  run("bun", ["add", tsTgz, familyLspTgz], jsToolsDir);

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

  run("bun", ["install"], vscodeDir);
  run("bun", ["run", "verify:release"], vscodeDir);
  const vsixPath = path.join(vscodeDir, `vscode-makrell-${vscodeVersion}.vsix`);
  if (!existsSync(vsixPath)) {
    throw new Error(`Expected VSIX not found: ${vsixPath}`);
  }

  const pythonCommand = toolExecutable(pyVenvScriptDir, "makrell");
  const tsCommand = localBinExecutable(jsToolsDir, "makrellts");
  const familyLspCommand = localBinExecutable(jsToolsDir, "makrell-family-lsp");
  const sharpCommand = toolExecutable(dotnetToolDir, "makrellsharp");
  const jsBinDir = path.join(jsToolsDir, "node_modules", ".bin");

  const settings = {
    "workbench.startupEditor": "readme",
    "makrell.server.enabled": true,
    "makrell.server.command": familyLspCommand,
    "makrell.run.pythonCommand": pythonCommand,
    "makrell.python.command": pythonCommand,
    "makrell.run.tsCommand": tsCommand,
    "makrell.ts.command": tsCommand,
    "makrell.run.sharpCommand": sharpCommand,
    "makrell.sharp.command": sharpCommand,
    "terminal.integrated.env.windows": isWindows
      ? {
          PATH: `${pyVenvScriptDir};${jsBinDir};${dotnetToolDir};${process.env.PATH ?? ""}`,
        }
      : undefined,
  };

  writeJson(path.join(workspaceVsCodeDir, "settings.json"), settings);

  copySample("impl/py/examples/makrellpy/hello.mrpy", path.join(workspacePyDir, "hello.mrpy"));
  copySample("impl/py/examples/makrellpy/pattern_matching.mrpy", path.join(workspacePyDir, "pattern_matching.mrpy"));
  createBrokenSample(path.join(workspacePyDir, "broken.mrpy"));

  copySample("impl/ts/examples/hello.mrts", path.join(workspaceTsDir, "hello.mrts"));
  copySample("impl/ts/examples/macros/showcase.mrts", path.join(workspaceTsDir, "showcase.mrts"));
  copySample("impl/ts/examples/async/await.mrts", path.join(workspaceTsDir, "await.mrts"));
  createBrokenSample(path.join(workspaceTsDir, "broken.mrts"));

  copySample("impl/dotnet/examples/hello.mrsh", path.join(workspaceSharpDir, "hello.mrsh"));
  copySample("impl/dotnet/examples/showcase.mrsh", path.join(workspaceSharpDir, "showcase.mrsh"));
  copySample("impl/dotnet/examples/interop.mrsh", path.join(workspaceSharpDir, "interop.mrsh"));
  createBrokenSample(path.join(workspaceSharpDir, "broken.mrsh"));

  copySample("impl/dotnet/examples/sample.mron", path.join(workspaceFormatsDir, "sample.mron"));
  copySample("impl/dotnet/examples/sample.mrml", path.join(workspaceFormatsDir, "sample.mrml"));
  copySample("impl/dotnet/examples/sample.mrtd", path.join(workspaceFormatsDir, "sample.mrtd"));

  writeFileSync(
    path.join(workspaceScratchDir, "new-script.mrts"),
    "{prin \"hello from fresh vscode smoke env\"}\n",
    "utf8",
  );

  writeFileSync(
    path.join(workspaceDir, "README.md"),
    [
      "# Makrell VS Code smoke workspace",
      "",
      "This folder is generated by `scripts/release/setup-fresh-vscode-smoke-env.mjs`.",
      "",
      "It is wired to an isolated VS Code profile and isolated installed tools:",
      "",
      `- MakrellPy wheel in ${pyVenvDir}`,
      `- MakrellTS package in ${jsToolsDir}`,
      `- Makrell Family LSP package in ${jsToolsDir}`,
      `- Makrell# .NET tool in ${dotnetToolDir}`,
      `- VS Code extension profile under ${extensionsDir}`,
      "",
      "Suggested checks:",
      "",
      "1. Open `makrellpy/hello.mrpy` and run `Makrell: Run Current File`.",
      "2. Open `makrellts/hello.mrts` and run `Makrell: Run Current File`.",
      "3. Open `makrellts/showcase.mrts` and run `MakrellTS: Emit JavaScript for Current MakrellTS File`.",
      "4. Open `makrellsharp/hello.mrsh` and run `Makrell#: Build Current Makrell# File`.",
      "5. Open `makrellsharp/interop.mrsh` and run `Makrell#: Emit C# for Current Makrell# File`.",
      "6. Open `formats/sample.mron`, `sample.mrml`, and `sample.mrtd` and run the matching parse commands.",
      "7. Open `broken.mrpy`, `broken.mrts`, and `broken.mrsh` to see diagnostics and LSP/editor features.",
      "",
      "You can also use the generated `open-vscode.cmd` / `open-vscode.ps1` launcher from the environment root.",
      "",
    ].join("\n"),
    "utf8",
  );

  writeFileSync(
    path.join(tempRoot, "open-vscode.cmd"),
    `@start "" "${codeGuiCommand}" --new-window --user-data-dir "${userDataDir}" --extensions-dir "${extensionsDir}" "${workspaceDir}"\r\n`,
    "utf8",
  );
  writeFileSync(
    path.join(tempRoot, "open-vscode.ps1"),
    `Start-Process -FilePath "${codeGuiCommand}" -ArgumentList @("--new-window", "--user-data-dir", "${userDataDir}", "--extensions-dir", "${extensionsDir}", "${workspaceDir}")\n`,
    "utf8",
  );

  const openVscodeCmdPath = path.join(tempRoot, "open-vscode.cmd");

  run(codeCommand, [
    "--install-extension",
    vsixPath,
    "--force",
    "--user-data-dir",
    userDataDir,
    "--extensions-dir",
    extensionsDir,
  ], root);

  const installedExtensions = runCapture(codeCommand, [
    "--list-extensions",
    "--show-versions",
    "--user-data-dir",
    userDataDir,
    "--extensions-dir",
    extensionsDir,
  ], root);

  console.log("\n[smoke-environment]");
  console.log(`  Root: ${tempRoot}`);
  console.log(`  Workspace: ${workspaceDir}`);
  console.log(`  User data dir: ${userDataDir}`);
  console.log(`  Extensions dir: ${extensionsDir}`);
  console.log(`  Python command: ${pythonCommand}`);
  console.log(`  TS command: ${tsCommand}`);
  console.log(`  Family LSP command: ${familyLspCommand}`);
  console.log(`  Makrell# command: ${sharpCommand}`);
  console.log("\n[installed extensions]");
  console.log(installedExtensions);

  if (openAfterSetup) {
    const updateProcesses = getWindowsVsCodeUpdateProcesses();
    if (updateProcesses.length > 0) {
      throw new Error(
        `VS Code appears to be updating (${updateProcesses.join(", ")}). Wait for the update to finish, then rerun the smoke script or the generated launcher.`,
      );
    }

    if (isWindows) {
      openWindowsLauncher(openVscodeCmdPath);
    } else {
      const openArgs = [
        "--new-window",
        "--user-data-dir",
        userDataDir,
        "--extensions-dir",
        extensionsDir,
        workspaceDir,
      ];
      openVsCodeWindow(codeCommand, openArgs);
    }
    console.log(`  Launched isolated VS Code window for: ${workspaceDir}`);
    console.log(`  Fallback launcher: ${openVscodeCmdPath}`);
    await waitForEnter("Press Enter after you have checked whether VS Code opened...");
  } else {
    console.log("\n[next]");
    console.log(`  Open the isolated workspace with: ${openVscodeCmdPath}`);
  }
} finally {
  if (!tsNodeModulesExisted && existsSync(tsNodeModulesDir)) {
    rmSync(tsNodeModulesDir, { recursive: true, force: true });
  }
  if (!familyLspNodeModulesExisted && existsSync(familyLspNodeModulesDir)) {
    rmSync(familyLspNodeModulesDir, { recursive: true, force: true });
  }
  if (!vscodeNodeModulesExisted && existsSync(vscodeNodeModulesDir)) {
    rmSync(vscodeNodeModulesDir, { recursive: true, force: true });
  }
  if (!tsBunLockExisted && existsSync(tsBunLockPath)) {
    rmSync(tsBunLockPath, { force: true });
  }
  if (!familyLspBunLockExisted && existsSync(familyLspBunLockPath)) {
    rmSync(familyLspBunLockPath, { force: true });
  }
}
