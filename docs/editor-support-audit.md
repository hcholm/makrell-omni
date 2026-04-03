# Editor Support Audit

This note records the current editor-support situation around `v0.10.0`,
especially for `vscode-makrell`, the existing Python language server, and the
near-term path for Makrell#.

## Current Python LSP

Implementation location:

- `impl/py/makrell/langserver/__init__.py`

Current useful capabilities:

- diagnostics on open/change
  - uses MakrellPy parsing/compilation and publishes compiler diagnostics
- workspace diagnostics
- very minimal completions
- basic semantic tokens
- stdio/TCP/WebSocket launch modes

Current limitations:

- no hover
- no go to definition
- no find references
- no rename
- no document symbols
- no real semantic completions
- no Makrell# intelligence
- no first-class MRON/MRML/MRTD editor intelligence
- several commands in the module are still pygls-example/demo style rather than
  Makrell-specific product features

Conclusion:

- the Python LSP is useful as an optional bridge for diagnostics and a little
  editor intelligence
- it is not strong enough to be the long-term editor architecture for the whole
  Makrell family
- `vscode-makrell` should not depend on the Python VS Code extension
- the longer-term direction should still converge on one TS-based family
  language-server/tooling stack

## `vscode-makrell` direction for `v0.10.0`

The extension should be:

- editor-first by default
- useful immediately without external dependencies
- able to use `makrell-langserver` when available
- not dependent on the Python VS Code extension

That means the current extension shape for `v0.10.0` is:

- syntax highlighting
- snippets
- file associations
- language configuration
- run current file for MakrellPy, MakrellTS, and Makrell#
- CLI-backed diagnostics/code markings for:
  - MakrellPy via `makrell check --json`
  - MakrellTS via `makrellts check --json`
  - Makrell# via `makrellsharp check --json`
  - MRON via `makrellsharp check-mron --json`
  - MRML via `makrellsharp check-mrml --json`
  - MRTD via `makrellsharp check-mrtd --json`
- REPL commands
- docs/repo commands
- optional LSP-backed diagnostics/hover/go-to/completions if
  `makrell-langserver` is installed or configured

## Run support for `v0.10.0`

The extension should also aim for a simple run/build/check story across the
three main language tracks:

- MakrellPy
  - run current file
  - REPL / send to REPL
- MakrellTS
  - run current file
  - possibly compile/show JS later
- Makrell#
  - run current file
  - build current file
  - check current file
  - emit C#

Full debugger integration is not the low-hanging-fruit target for `v0.10.0`.
Run/build/check support is.

## Makrell# path for `v0.10.0`

Makrell# should get a similar incremental path:

- keep the editor experience usable immediately through shared grammar/snippets
- add compiler diagnostics as the first important language-intelligence layer
- expose the existing compiler/CLI surfaces in ways a future TS language server
  can call

This is especially important because compiler diagnostics are one of the most
valuable low-cost editor features for Makrell#.

## Low-hanging fruit for Makrell#

### 1. Add a diagnostics-oriented CLI command

Suggested command:

- `makrellsharp check <file.mrsh>`

Recommended output modes:

- human-readable default output
- JSON output for editor/tooling use

Suggested JSON shape:

```json
{
  "ok": false,
  "diagnostics": [
    {
      "phase": "baseformat",
      "code": "MBF001",
      "message": "Unmatched opening bracket.",
      "severity": "error",
      "range": {
        "start": { "line": 3, "column": 5 },
        "end": { "line": 3, "column": 6 }
      }
    }
  ]
}
```

Why this is attractive:

- it fits `v0.10.0`
- it is useful even before a TS family language server exists
- it gives VS Code and other tools a stable bridge to real compiler feedback

### 2. Thread `DiagnosticBag` through the Makrell# front-end more explicitly

Relevant code already exists:

- `impl/dotnet/src/MakrellSharp.BaseFormat/Diagnostics.cs`
- `impl/dotnet/src/MakrellSharp.BaseFormat/BaseFormatParser.cs`

Low-cost improvement:

- expose parser/front-end diagnostics through a public compiler/check API rather
  than only by exceptions or implicit behaviour

This would let tooling surface:

- bracket/base-format errors
- parse/operator-shape errors
- some macro/meta/front-end errors where spans are already available

### 3. Add a compile-with-diagnostics API in Makrell#

Suggested direction:

- `MakrellCompiler.Check(...)`
- or `MakrellCompiler.CompileWithDiagnostics(...)`

This should return:

- success/failure
- diagnostics with source spans where available
- optionally emitted C# when compilation succeeds far enough

This would be a better editor/tooling boundary than "call `Run` and catch an
exception".

### 4. Reuse existing inspection surfaces

Makrell# already has useful CLI surfaces:

- `emit-csharp`
- `meta-sources`

These are not diagnostics, but they are immediately helpful for tooling:

- generated-code inspection
- compile-time source inspection

Those should be considered part of the editor-support story even before a full
language server exists.

### 5. Add a simple parse/check path before deeper semantic tooling

A basic Makrell# support baseline for `v0.10.0` should aim for:

- compiler diagnostics
- generated C# inspection
- optional compile-time source inspection

This is a much better short-term goal than trying to jump directly to full
hover/go-to/reference support for Makrell#.

## Things that are not low-hanging fruit

These are good longer-term goals, but they are not the easy wins:

- mapping Roslyn diagnostics from generated C# back to original Makrell#
  positions in a robust way
- full hover and go-to-definition for Makrell#
- cross-language symbol navigation
- rename/refactor support
- full semantic completions

Those likely belong to the later TS family language-server work rather than the
`v0.10.0` baseline.

## Recommended `v0.10.0` minimum

For editor support across the family, a realistic minimum looks like this:

- `vscode-makrell` works well without external dependencies
- optional Python LSP bridge still exists for hover/go-to/completions and
  other richer editor features
- the three main language tracks have a basic run/build/check story in the
  extension
- editor-visible diagnostics/code markings now exist for:
  - MakrellPy
  - MakrellTS
  - Makrell#
  - MRON
  - MRML
  - MRTD
- the repo records one TS-family language-server direction for the longer term
