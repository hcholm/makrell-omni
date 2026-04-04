# Makrell Family LSP

This is the first TypeScript-based family language-server slice for Makrell.

Current scope:

- stdio LSP server
- diagnostics for:
  - `.mrpy`
  - `.mrts`
  - `.mrsh`
  - `.mron`
  - `.mrml`
  - `.mrtd`
- diagnostics come from the real packaged CLIs:
  - `makrell`
  - `makrellts`
  - `makrellsharp`
- shared-snippet completions
- hover for current family file types and core forms such as `fun`, `match`, `meta`, and `await`
- basic document symbols
- same-file definition lookup for `fun`, `def macro`, and simple bindings
- same-file references and rename for that same symbol slice

Build:

```bash
bun install
bun run build
```

Run directly:

```bash
bun run start
```
