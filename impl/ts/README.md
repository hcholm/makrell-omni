# MakrellTS

`impl/ts` is the TypeScript implementation track for Makrell.

Status: M0 baseline prepared (build/test/typecheck/browser-smoke scripts + compatibility matrix).

## Install

From `impl/ts/`:

```bash
bun install
```

## Commands

```bash
bun run build
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

## Layout

- `src/`: compiler/runtime source
- `tests/unit/`: unit tests
- `scripts/`: helper scripts (including browser smoke check)
- `examples/`: runnable examples
  - `examples/browser-smoke/index.html`
- `COMPATIBILITY.md`: runtime/tooling support matrix
- `REFERENCE_PLAN.md`: roadmap to make MakrellTS the reference implementation

## Notes

- Bun is the preferred local runtime.
- Node/browser support is tracked in `COMPATIBILITY.md`.
- Typing and semantic parity work is tracked in `REFERENCE_PLAN.md`.
- Current M0 typecheck scope is intentionally minimal (`src/ast.ts`) and will expand in M1.
- Makrell-defined macros now run through a meta-runtime adapter layer (`src/meta_runtime.ts`), with subprocess isolation enabled by default on Bun.
