# Publishing `vscode-makrell`

This extension now uses a Bun-first local workflow.

## Local release verification

From `src/vscode-makrell/`:

```bash
bun install
bun run verify:release
```

That does two things:

- compiles the extension after syncing shared editor assets
- creates a local `.vsix` package with `@vscode/vsce`

Expected output:

- `vscode-makrell-<version>.vsix`

## Local smoke test in VS Code

After `bun run verify:release`, install the generated `.vsix` in VS Code:

1. Open Extensions
2. Open the `...` menu
3. Choose `Install from VSIX...`
4. Select the generated `vscode-makrell-<version>.vsix`

Smoke-check at least:

- Makrell family files open in the correct language mode
- syntax highlighting works for:
  - `.mr`
  - `.mrts`
  - `.mrsh`
  - `.mron`
  - `.mrml`
  - `.mrtd`
- snippets appear
- `Makrell: Open Makrell Docs`
- `Makrell: Open Makrell Repository`

If `makrell-langserver` is available locally, also smoke-check:

- `Makrell: Start Makrell REPL`
- REPL send/stop commands
- hover/diagnostics on a Makrell file
- `Makrell: Restart Makrell Language Server`

## Marketplace publication

This repo does not store publisher credentials.

Typical publish flow:

```bash
bun install
bun run verify:release
bunx @vscode/vsce publish <version>
```

or, for a patch release:

```bash
bunx @vscode/vsce publish patch
```

Notes:

- publishing requires a configured VS Code Marketplace publisher/token
- prefer verifying the generated `.vsix` locally before publishing
- keep the extension version aligned with the intended release milestone

## `v0.10.0` notes

For `v0.10.0`, the extension release should reflect:

- Makrell family-wide scope
- `.mrts`, `.mrsh`, and `.mrtd` support
- shared editor assets sourced from `shared/makrell-editor-assets/`
- Bun-first local packaging workflow
- no hard dependency on the Python VS Code extension
- optional `makrell-langserver` integration while broader TS-based family
  tooling is still being built
