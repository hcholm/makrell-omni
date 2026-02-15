# MakrellTS Compatibility Matrix (M0)

This matrix defines the baseline environments for `impl/ts`.

## Runtime Targets

- Bun: `1.0.x` (preferred development/runtime target)
- Node.js: `20.x` LTS
- Browser (execution target for examples/tooling):
  - Chromium: current stable
  - Firefox: current stable
  - Safari: latest stable (best-effort until browser CI is added)

## Tooling Targets

- TypeScript: `^5.6.3`
- Module format: ESM

## M0 CI Baseline

The required CI baseline checks for M0 are:

1. `bun run build`
2. `bun run test`
3. `bun run typecheck`
4. `bun run test:browser`

All four must pass for the M0 baseline to be considered healthy.

Note:
- In M0, `typecheck` is a scoped check (`src/ast.ts`) to keep baseline CI stable while broader TS typing issues are addressed in M1.
