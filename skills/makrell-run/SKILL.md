---
name: makrell-run
description: Run, check, build, and diagnose Makrell source files and data formats. Use when executing .mrpy/.mrts/.mrsh files, running diagnostics, or inspecting emitted output.
allowed-tools: Bash Read Grep Glob
disable-model-invocation: true
---

# Run and Check Makrell Files

You are helping run, check, build, and diagnose Makrell files in a project.

## Prerequisites

Ensure the relevant CLI is installed:

| Track      | Install command                              | Verify           |
|------------|----------------------------------------------|------------------|
| MakrellPy  | `pip install makrell`                        | `makrell --help` |
| MakrellTS  | `bun add -g makrellts`                       | `makrellts --help` |
| Makrell#   | `dotnet tool install --global MakrellSharp.Cli` | `makrellsharp --help` |

## Running source files

### MakrellPy (.mrpy)

```bash
makrell file.mrpy                    # run a script
makrell                              # start the REPL
makrell file.mrpy functionName       # call a specific function
makrell check file.mrpy --json       # diagnostics as JSON
```

### MakrellTS (.mrts)

```bash
makrellts file.mrts                  # run a script
makrellts file.mrts --emit-js        # show generated JavaScript
makrellts check file.mrts --json     # diagnostics as JSON
```

### Makrell# (.mrsh)

```bash
makrellsharp file.mrsh               # run a script
makrellsharp build file.mrsh         # compile to .NET assembly
makrellsharp emit-csharp file.mrsh   # show generated C#
makrellsharp check file.mrsh --json  # diagnostics as JSON
```

## Checking data formats

All format checks go through the Makrell# CLI:

```bash
makrellsharp check-mron file.mron --json
makrellsharp check-mrml file.mrml --json
makrellsharp check-mrtd file.mrtd --json
```

MRON can also be parsed/inspected:

```bash
makrellsharp parse-mron file.mron
makrellsharp parse-mrml file.mrml
```

## File extensions

| Extension | Language/Format |
|-----------|----------------|
| `.mrpy`   | MakrellPy      |
| `.mrts`   | MakrellTS      |
| `.mrsh`   | Makrell#       |
| `.mron`   | MRON           |
| `.mrml`   | MRML           |
| `.mrtd`   | MRTD           |
| `.mr`     | General Makrell / MBF |

## Diagnostic output

All `check` commands with `--json` emit machine-readable diagnostic arrays. Each entry typically has:

- `file` — source file path
- `line`, `col` — location
- `severity` — `"error"` or `"warning"`
- `message` — human-readable description

## Workflow

When the user asks to run or check a Makrell file:

1. Identify the file extension to determine which CLI to use
2. Check if the relevant CLI is available (run `--help` if uncertain)
3. Run the appropriate command
4. If there are errors, read the source file and correlate diagnostics with the code
5. Suggest fixes referencing specific line numbers

When the user wants to see emitted output:
- MakrellTS: use `--emit-js` to see the generated JavaScript
- Makrell#: use `emit-csharp` to see the generated C#
- These are useful for understanding how Makrell lowers into the host language

## VS Code integration

If the project uses `vscode-makrell-omni`, diagnostics also appear as editor markings.
The extension is available from the Visual Studio Marketplace:
https://marketplace.visualstudio.com/items?itemName=hchrholm.vscode-makrell-omni
