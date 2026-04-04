# Makrell Language Support for Visual Studio Code

This extension adds Makrell family language support to VS Code.

Current scope:

- Makrell / MakrellPy / MakrellTS / Makrell#
- MRON
- MRML
- MRTD

Current features:

* Syntax highlighting
* Code snippets
* Start a Makrell REPL and send code to it
* Run the current MakrellPy, MakrellTS, or Makrell# file
* Basic MakrellPy, MakrellTS, Makrell#, and family-format diagnostics via packaged CLIs
* Optional Makrell language-server support for diagnostics, hover, go-to,
  completions, and related editor features

Editor asset source of truth:

- shared editor-facing assets now live under `shared/makrell-editor-assets/`
- the extension copies its packaged grammar, snippet, and language
  configuration files from there via `bun run sync:assets`
- this is intended to support future sharing with browser tooling rather than
  treating the VS Code extension as the only home for Makrell editor assets

Current file support:

- `.mr`
- `.mrx`
- `.mrpy`
- `.mrts`
- `.mrsh`
- `.mron`
- `.mrml`
- `.mrtd`

Local development and packaging:

```bash
bun install
bun run compile
bun run package:vsix
```

This produces a local `.vsix` package for smoke-testing the extension before
marketplace publication.

For the full Bun-first release/publish procedure, see
[`PUBLISHING.md`](./PUBLISHING.md).

![](images/ide.png)

This extension no longer depends on the Python VS Code extension.

For editor basics such as highlighting, snippets, file associations, and REPL
commands, nothing else is required.

Current editor workflow commands:

- `Makrell: Run Current File`
- `MakrellPy: Check Current MakrellPy File`
- `MakrellTS: Check Current MakrellTS File`
- `MakrellTS: Emit JavaScript for Current MakrellTS File`
- `Makrell#: Check Current Makrell# File`
- `Makrell#: Build Current Makrell# File`
- `Makrell#: Emit C# for Current Makrell# File`
- `Makrell#: Run Built Assembly for Current Makrell# File`
- `Makrell#: Show Meta Sources for Current Makrell# File`
- `Makrell: Parse Current MRON File`
- `Makrell: Parse Current MRML File`
- `Makrell: Parse Current MRTD File`
- `Makrell: Start Makrell REPL`
- `Makrell: Send Code to Makrell REPL`

If you also want hover, go-to, completions, diagnostics, and related LSP-backed
editor features, make `makrell-family-lsp` available on your `PATH` or point
the extension at it via settings:

```bash
bunx makrell-family-lsp
```

Relevant settings:

- `makrell.server.enabled`
- `makrell.server.command`
- `makrell.server.args`
- `makrell.server.cwd`
- `makrell.python.diagnosticsEnabled`
- `makrell.python.command`
- `makrell.run.pythonCommand`
- `makrell.run.tsCommand`
- `makrell.run.sharpCommand`
- `makrell.ts.diagnosticsEnabled`
- `makrell.ts.command`
- `makrell.sharp.diagnosticsEnabled`
- `makrell.sharp.command`

MakrellPy diagnostics currently come from the packaged `makrell` CLI:

```bash
makrell check path/to/file.mrpy --json
```

This MakrellPy path is for `.mrpy` files. `.mr` and `.mrx` stay available as
general Makrell/MBF-style files rather than being treated as MakrellPy
programs by default.

MakrellTS diagnostics currently come from the packaged `makrellts` CLI:

```bash
makrellts check path/to/file.mrts --json
```

Makrell# and family-format diagnostics currently come from the packaged `makrellsharp` CLI:

```bash
dotnet tool install --global MakrellSharp.Cli
```

That CLI currently provides:

```bash
makrellsharp check path/to/file.mrsh --json
makrellsharp check-mron path/to/file.mron --json
makrellsharp check-mrml path/to/file.mrml --json
makrellsharp check-mrtd path/to/file.mrtd --json
```

The long-term direction is now a TypeScript-based family language-server/tooling
stack, with `makrell-family-lsp` as the first concrete slice.

This extension is part of the Makrell monorepo:

- repo: <https://github.com/hcholm/makrell-omni>
- site: <https://makrell.dev/>
