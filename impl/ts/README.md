# MakrellTS

`impl/ts` is the TypeScript reference implementation for Makrell.

Targets:
- Bun (preferred) and Node.js
- Browser runtime (including isolated meta execution support)

Website and documentation: **[makrell.dev](https://makrell.dev)**

Current editor workflow: [`../../vscode-makrell/README.md`](../../vscode-makrell/README.md)

## Install

```bash
bun add -g makrellts
```

The published CLI/build story is Bun-first.

Run a script:

```bash
makrellts hello.mrts
```

Emit generated JS:

```bash
makrellts hello.mrts --emit-js
```

Check a file and emit machine-readable diagnostics:

```bash
makrellts check hello.mrts --json
```

Published package shape:

- library entry: `makrellts`
- browser entry: `makrellts/browser`
- shared editor assets: `makrellts/editor-assets`
- playground launch examples: `makrellts/playground`
- CLI entry: `makrellts`

For the current browser-facing product direction, see
[`https://makrell.dev/playground/`](https://makrell.dev/playground/).

## Contributor commands

```bash
cd impl/ts
bun install
bun run build
bun run build:browser
bun run test
bun run typecheck
bun run lint
bun run test:browser
bun run ci
```

Typed outputs (API):

```ts
import { compileToTs, compileToDts } from "makrellts";
```

Shared editor assets (for browser tooling, playground work, or editor reuse):

```ts
import { getMakrellEditorAssets, makrellEditorLanguages } from "makrellts/editor-assets";
```

Playground launch examples (generated from real checked-in `.mrts` sources):

```ts
import { getMakrellPlaygroundExample, makrellPlaygroundExamples } from "makrellts/playground";
```

Async execution:

```ts
import { runAsync } from "makrellts";
```

## MakrellTS by example

### Core syntax

```mbf
a = 2
b = a + 3
[a b 5] | sum

{fun add [x y]
  x + y}

{if a < b
  "a is less"
  "a is not less"}

{match a
  2 "two"
  _ "other"}
```

Runtime indexing and slicing:

```mbf
items = [1 2 3 4]
middle = items @ (1 .. 3)
prefix = items @ (_ .. 2)
suffix = items @ (2 .. _)
whole = items @ (_ .. _)
items @ (1 .. 3) = [8 9]

doc = {}
doc @ "title" = "MakrellTS"

[middle prefix suffix whole items doc @ "title"]
```

Current MakrellTS runtime surface:
- `x @ i` works for arrays, strings, and JS property/index access
- `x @ (a .. b)` works for arrays and strings
- `_ .. b`, `a .. _`, and `_ .. _` leave slice bounds open
- `x @ (a .. b) = values` currently works for arrays
- negative array/string indexes work through `@`

### TypeScript-oriented semantics

```mbf
Point = {class Point
  {fun __init__ [self x:number y:number]
    self.x = x
    self.y = y}
}

p:Point = {new Point [2 3]}

mode:"option1" | "option2" = "option1"
```

### Macros and meta execution

```mbf
{def macro twice [x]
  [{quote $x} {quote $x}]}

{twice {print "hello"}}
```

Macro showcase:

- `examples/macros/showcase.mrts`
- includes `pipe`, `rpn`, and `lisp`
- intended as the compact shared macro trio for `v0.10.0`
- now matches the current MakrellPy / Makrell# showcase results for the shared
  `pipe` / `rpn` / `lisp` examples

### Async/await

```mbf
{async fun addLater [x y]
  left = {await {Promise.resolve x}}
  right = {await {Promise.resolve y}}
  left + right
}

{await {addLater 20 22}}
```

API:

```ts
import { runAsync } from "makrellts";

const result = await runAsync(`
{async fun addLater [x y]
  left = {await {Promise.resolve x}}
  right = {await {Promise.resolve y}}
  left + right
}

{await {addLater 20 22}}
`);
```

Checked-in example:

- `examples/async/await.mrts`

## MRON example

```mbf
owner "Rena Holm"
active true
count 3
items [
  { name "A" }
  { name "B" }
]
```

## MRML example

```mbf
{html
  {body
    {h1 MakrellTS}
    {p Generated from MBF-style syntax.}
  }
}
```

## MRTD example

```text
name:string age:int active:bool
Ada 32 true
"Rena Holm" 29 false
```

API:

```ts
import { parseMrtd, readMrtdRecords, readMrtdTuples, writeMrtdRecords } from "makrellts";

const doc = parseMrtd(`
name:string age:int active:bool
Ada 32 true
Ben 41 false
`);
```

Basic suffix profile example:

```ts
const profileDoc = parseMrtd(`
when bonus
"2026-04-03"dt 3k
`);
```

## Layout

- `src/`: compiler/runtime source
- `src/browser.ts`: browser compile/execute entrypoint
- `src/editor_assets.ts`: exported synced editor-language metadata for playground/editor reuse
- `src/meta_worker.ts`: browser meta worker entrypoint
- `src/playground.ts`: exported launch-example manifest for browser/playground reuse
- `src/browser-runtime/`: checked-in browser runtime JS for no-build static hosting
- `tests/unit/`: unit tests
- `tests/parity/`: parity tests against MakrellPy behaviour where applicable
- `scripts/`: helper scripts (including browser smoke check)
- `examples/`: runnable examples
  - `examples/browser-smoke/index.html`
  - `examples/browser-compile/index.html`
  - `examples/nbody-browser/index.html`
- `COMPATIBILITY.md`: runtime/tooling support matrix
- `IMPORT_MODEL.md`: runtime/importm interoperability model (CJS/ESM/browser strategy)
- `REFERENCE_PLAN.md`: roadmap and milestone tracking

## Notes

- Bun is the preferred local runtime.
- Node/browser support is tracked in `COMPATIBILITY.md`.
- `import`/`importm` behaviour and browser module loading strategy are defined in `IMPORT_MODEL.md`.
- Browser runtime bundle outputs are built to `dist/browser/` and mirrored in `src/browser-runtime/` for static hosting without build steps.
- Shared editor assets are synced from `../../shared/makrell-editor-assets/` into `src/editor-assets/` via `bun run sync:assets`.
- Playground launch examples are synced from real `.mrts` source files into `src/generated/playground_examples.ts` via `bun run sync:playground`.
- N-body simulator example is at `examples/nbody-browser/index.html` and uses MakrellTS source (`app.mrts`).
- For the current editor workflow across the family, see
  [`../../vscode-makrell/README.md`](../../vscode-makrell/README.md).

## Licence

MIT. See [`../../LICENSE`](../../LICENSE).
