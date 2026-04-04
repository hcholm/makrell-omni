# Publishing Playbook

This note is the practical publishing recipe for the package-producing parts of
the Makrell monorepo:

- MakrellPy
- MakrellTS
- Makrell Family LSP
- Makrell# libraries and CLI tool
- `vscode-makrell`

It is written for repeatable release work rather than one-off experimentation.

## Fast path

From the repo root:

```bash
node scripts/release/verify-publish.mjs
```

That runs the current publish preflight across:

- MakrellPy build plus fresh-venv smoke check
- MakrellTS CI and package dry run
- Makrell Family LSP build and package dry run
- Makrell# pack plus local tool smoke check
- `vscode-makrell` release verification and VSIX build

After that succeeds, use the manual publish checklist below.

Optional fresh-editor smoke pass:

```bash
node scripts/release/setup-fresh-vscode-smoke-env.mjs
```

That creates an isolated VS Code profile, installs the packaged `vscode-makrell`
VSIX into a separate extensions directory, installs the packaged Makrell tools
into temp locations, and prepares a sample workspace wired to those installed
commands.

## Prerequisites

Make sure these are available locally before publishing:

- Python 3.10+
- Bun
- .NET 8 SDK
- Node.js
- publish credentials for:
  - PyPI
  - npm
  - NuGet
  - VS Code Marketplace

Recommended auth setup:

- PyPI:
  - `TWINE_USERNAME=__token__`
  - `TWINE_PASSWORD=<pypi token>`
- npm / Bun:
  - npm auth already configured locally
- NuGet:
  - `NUGET_API_KEY=<nuget api key>`
- VS Code Marketplace:
  - publisher login or configured PAT for `vsce`

## Version bump locations

Before publishing, decide the version for each package and update the right
files.

Current bump points:

- MakrellPy:
  - `impl/py/setup.py`
- MakrellTS:
  - `impl/ts/package.json`
- Makrell Family LSP:
  - `tooling/ts-family-language-server/package.json`
- Makrell# libraries:
  - `impl/dotnet/Directory.Build.props`
- Makrell# CLI tool:
  - `impl/dotnet/src/MakrellSharp.Cli/MakrellSharp.Cli.csproj`
- VS Code extension:
  - `vscode-makrell/package.json`

Release-doc follow-up usually also means checking:

- `docs/v0.10.0-release-notes.md`
- `README.md`

## Pre-publish checklist

- [ ] Decide the release version(s)
- [ ] Update version fields in the package metadata files
- [ ] Review package descriptions, URLs, and readmes
- [ ] Run `node scripts/release/verify-publish.mjs`
- [ ] Confirm the resulting artefacts look correct
- [ ] Sanity-check Git status and commit the release-ready state

## MakrellPy

Working directory:

```bash
cd impl/py
```

Build:

```bash
python -m build
```

Optional explicit metadata check:

```bash
python -m twine check dist/*
```

Publish:

```bash
python -m twine upload dist/*
```

Manual checklist:

- [ ] `impl/py/setup.py` version updated
- [ ] `python -m build` succeeded
- [ ] `twine check` succeeded
- [ ] wheel and sdist in `impl/py/dist/`
- [ ] upload to PyPI completed

## MakrellTS

Working directory:

```bash
cd impl/ts
```

Preflight:

```bash
bun install
bun run ci
bun pm pack --dry-run
```

Publish:

```bash
bun publish --access public
```

Manual checklist:

- [ ] `impl/ts/package.json` version updated
- [ ] `bun run ci` succeeded
- [ ] `bun pm pack --dry-run` looked correct
- [ ] npm authentication is active
- [ ] `bun publish --access public` completed

## Makrell Family LSP

Working directory:

```bash
cd tooling/ts-family-language-server
```

Preflight:

```bash
bun install
bun run build
bun run pack:dry-run
```

Publish:

```bash
bun publish --access public
```

Manual checklist:

- [ ] `tooling/ts-family-language-server/package.json` version updated
- [ ] `bun run build` succeeded
- [ ] `bun run pack:dry-run` looked correct
- [ ] npm authentication is active
- [ ] `bun publish --access public` completed

## Makrell#

Working directory:

```bash
cd impl/dotnet
```

Pack:

```bash
dotnet pack MakrellSharp.sln -c Release /nodeReuse:false -p:UseSharedCompilation=false
```

That should produce:

- library `.nupkg` files under the packageable projects
- the CLI tool package under:
  - `impl/dotnet/src/MakrellSharp.Cli/bin/Release/`

Optional local CLI smoke:

```bash
dotnet tool install MakrellSharp.Cli --tool-path .tmp-tools --add-source src/MakrellSharp.Cli/bin/Release --version <version>
.tmp-tools/makrellsharp examples/hello.mrsh
```

Push libraries and CLI package:

```powershell
Get-ChildItem -Recurse -Filter *.nupkg |
  Where-Object { $_.Name -notlike "*.symbols.nupkg" } |
  ForEach-Object {
    dotnet nuget push $_.FullName `
      --source https://api.nuget.org/v3/index.json `
      --api-key $env:NUGET_API_KEY `
      --skip-duplicate
  }
```

Manual checklist:

- [ ] `Directory.Build.props` version updated for the libraries
- [ ] `MakrellSharp.Cli.csproj` version updated for the tool
- [ ] `dotnet pack` succeeded
- [ ] local tool smoke check passed
- [ ] all intended `.nupkg` files pushed to NuGet

## VS Code extension

Working directory:

```bash
cd vscode-makrell
```

Preflight:

```bash
bun install
bun run verify:release
```

That should produce:

- `vscode-makrell-<version>.vsix`

Optional local smoke in VS Code:

- install the generated VSIX
- confirm family file associations and highlighting
- confirm command palette actions
- confirm diagnostics/run workflows still work

Publish:

```bash
bunx @vscode/vsce publish <version>
```

or:

```bash
bunx @vscode/vsce publish patch
```

Manual checklist:

- [ ] `vscode-makrell/package.json` version updated
- [ ] `bun run verify:release` succeeded
- [ ] VSIX installed locally and smoke-checked
- [ ] Marketplace publish command completed

Optional stronger smoke check:

```bash
node scripts/release/setup-fresh-vscode-smoke-env.mjs --open
```

That opens VS Code in a separate fresh profile with:

- the packaged Makrell extension installed from the built VSIX
- packaged MakrellPy / MakrellTS / Makrell# / `makrell-family-lsp` commands
- a sample workspace containing `.mrpy`, `.mrts`, `.mrsh`, `.mron`, `.mrml`,
  and `.mrtd` files

## Suggested release order

If publishing everything in one pass, this is the safest order:

1. MakrellPy
2. MakrellTS
3. Makrell Family LSP
4. Makrell# libraries and CLI tool
5. `vscode-makrell`

Why this order:

- language/runtime packages first
- the family LSP before the editor package that points at it
- editor package last, once package names and install flows are already real

## Final human checklist

- [ ] versions updated in all intended package manifests
- [ ] `node scripts/release/verify-publish.mjs` succeeded
- [ ] MakrellPy uploaded
- [ ] MakrellTS uploaded
- [ ] Makrell Family LSP uploaded
- [ ] Makrell# libraries uploaded
- [ ] Makrell# CLI tool uploaded
- [ ] `vscode-makrell` published
- [ ] release notes reviewed
- [ ] git tag / GitHub release prepared if desired

## Notes

- The helper script is a preflight, not a credentialed publish step
- credentials remain manual by design
- if one package fails publication, stop and fix it before pushing the rest
