# MakrellTS

`impl/ts` is the TypeScript reference implementation for Makrell.

Targets:
- Bun (preferred) and Node.js
- Browser runtime (including isolated meta execution support)

## Install

From `impl/ts/`:

```bash
bun install
```

## Commands

```bash
bun run build
bun run build:browser
bun run test
bun run typecheck
bun run lint
bun run test:browser
bun run ci
```

Run a Makrell source file:

```bash
bun run src/cli.ts examples/hello.mrjs
```

Emit generated JS:

```bash
bun run src/cli.ts examples/hello.mrjs --emit-js
```

Typed outputs (API):

```ts
import { compileToTs, compileToDts } from "makrellts";
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

## Layout

- `src/`: compiler/runtime source
- `src/browser.ts`: browser compile/execute entrypoint
- `src/meta_worker.ts`: browser meta worker entrypoint
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
- N-body simulator example is at `examples/nbody-browser/index.html` and uses MakrellTS source (`app.mrjs`).

## Licence

MIT. See [`../../LICENSE`](../../LICENSE).
