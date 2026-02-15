# Session Notes

Use this file to preserve short-term working context between Codex sessions.
Keep entries concise and append-only.

## Current Focus

- Feature/area: MakrellTS reference-implementation transition
- Goal: plan and stage work to make `impl/ts` the primary reference implementation

## Decisions

- 2026-02-15: MakrellTS (`impl/ts`) becomes target reference implementation; preserve near-parity with MakrellPy but use TS/JS semantics where specified.
- 2026-02-15: Meta/macro execution must run in an isolated JS context (worker/vm adapter model).
- 2026-02-15: Class instantiation baseline syntax in MakrellTS: `{new Point [2 3]}`.
- 2026-02-15: Browser example requirement: interactive N-body simulation with merge-on-collision.
- 2026-02-15: TS-compatible typing is required in MakrellTS source syntax and compiler output (TS emit and/or declaration output).
- 2026-02-15: No new AST node kinds for typing in MakrellTS; encode types using existing MBF/Makrell node structures.
- 2026-02-15: `in` is not to be introduced as an operator token; mapped-type forms must be rewritten to existing operator/core-node constructs or omit `in` when possible.
- 2026-02-15: N-body browser example must be runnable directly from repo source without a separate build step; runnable output artifacts should be kept with the example.

## Completed

- 2026-02-15: Added MakrellTS reference transition plan.
  - Files: `impl/ts/REFERENCE_PLAN.md`
  - Tests run: N/A (planning/documentation only)
  - Result: plan committed in-repo for future sessions
- 2026-02-15: Executed M0 baseline for `impl/ts`.
  - Files: `impl/ts/package.json`, `impl/ts/tsconfig.json`, `impl/ts/README.md`, `impl/ts/COMPATIBILITY.md`, `impl/ts/.gitignore`, `impl/ts/scripts/test-browser-smoke.ts`, `impl/ts/examples/browser-smoke/index.html`, `impl/ts/tests/unit/index.test.ts`, `.github/workflows/ts-m0.yml`
  - Tests run: `bun run ci` (from `impl/ts`)
  - Result: baseline scripts and checks pass locally
- 2026-02-15: Delivered M1 core increment in `impl/ts`.
  - Files: `impl/ts/src/ast.ts`, `impl/ts/src/tokenizer.ts`, `impl/ts/src/parser.ts`, `impl/ts/src/compiler.ts`, `impl/ts/tests/unit/index.test.ts`
  - Scope:
    - source span tracking in AST/tokens/parser
    - source-positioned parse/compile diagnostics
    - class + `new` compilation baseline (`{class ...}`, `{new ...}`)
    - typed syntax compatibility via existing nodes (`x:int`, typed function params) with runtime JS emit
    - additional reserved constructs (`when`, `while`, `for`) in compiler core
  - Tests run: `bun run ci` (from `impl/ts`)
  - Result: all checks pass (`build`, `test`, `typecheck`, `test:browser`)
- 2026-02-15: Delivered M2 meta runtime isolation increment in `impl/ts`.
  - Files: `impl/ts/src/meta_runtime.ts`, `impl/ts/scripts/meta-runner.ts`, `impl/ts/src/macros.ts`, `impl/ts/src/compiler.ts`, `impl/ts/src/index.ts`, `impl/ts/tests/unit/index.test.ts`, `impl/ts/README.md`
  - Scope:
    - Added meta runtime adapter interface
    - Added subprocess adapter for isolated Makrell macro execution (Bun)
    - Added in-process adapter fallback
    - Refactored macro registry to serializable Makrell macro entries
    - Added subprocess runner script and tests for adapter routing
  - Tests run: `bun run ci` (from `impl/ts`)
  - Result: all checks pass (`build`, `test`, `typecheck`, `test:browser`)
- 2026-02-15: Delivered M3 pattern matching increment in `impl/ts`.
  - Files: `impl/ts/src/pattern.ts`, `impl/ts/src/compiler.ts`, `impl/ts/src/index.ts`, `impl/ts/tests/unit/index.test.ts`, `impl/ts/README.md`
  - Scope:
    - Added built-ins: `_`, `$`, literals, lists, `|`, `&`, type patterns, binop-with-`$`
    - Added regular patterns `{$r ...}` including quantifiers and `$rest`
    - Added constructor/type destructuring `{$type ...}`
    - Added short-form `{match value pattern}` -> boolean
    - Added runtime user-defined pattern hook API (`registerPatternHook`, `clearPatternHooks`)
  - Tests run: `bun run ci` (from `impl/ts`)
  - Result: all checks pass (`build`, `test`, `typecheck`, `test:browser`)
- 2026-02-15: Started parity test migration from MakrellPy suites.
  - Files: `impl/ts/tests/parity/manifest.md`, `impl/ts/tests/parity/patmatch.parity.test.ts`, `impl/ts/src/pattern.ts`
  - Scope:
    - Added parity manifest with `portable/adapt/exclude` status mapping
    - Ported substantial `test_patmatch.mr` subset into TS parity tests
    - Fixed grouped round-pattern handling used by `$r` advanced forms
  - Tests run: `bun run ci` (from `impl/ts`)
  - Result: all checks pass (`build`, `test`, `typecheck`, `test:browser`)
- 2026-02-15: Added parity tests for previous milestones (M0/M1/M2).
  - Files: `impl/ts/tests/parity/core.parity.test.ts`, `impl/ts/tests/parity/meta.parity.test.ts`, `impl/ts/tests/parity/manifest.md`
  - Scope:
    - M0/M1 core parity checks (compile/run/function flow/class/new/typed surface/diagnostics)
    - M2 meta parity checks (in-process + subprocess adapter macro execution)
  - Tests run: `bun run ci` (from `impl/ts`)
  - Result: all checks pass (`build`, `test`, `typecheck`, `test:browser`)
- 2026-02-15: Migrated parity tests to MBF-first authoring where possible.
  - Files: `impl/ts/tests/parity/mbf/core.mr`, `impl/ts/tests/parity/mbf/meta.mr`, `impl/ts/tests/parity/mbf/patmatch.mr`, `impl/ts/tests/parity/_mbf_runner.ts`, parity wrapper test files
  - Scope:
    - MBF parity sources now hold most test logic
    - TypeScript parity files are thin wrappers for file loading + adapter selection
  - Tests run: `bun run ci` (from `impl/ts`)
  - Result: all checks pass (`build`, `test`, `typecheck`, `test:browser`)

## In Progress

- Item: MakrellTS milestone execution (M0-M7)
- Status: M0 completed; M1 core increment completed; M2 isolation increment completed; M3 increment completed
- Blockers: none documented yet

## Next Actions

1. Build parity matrix from MakrellPy tests into `impl/ts/tests/parity/` status categories.
2. Port additional MakrellPy suites into `impl/ts/tests/parity/` (`test_funcs.mr`, `test_flow.mr`, `test_classes.mr`).
3. Define MakrellTS typing syntax subset using existing AST node forms only (formal doc + fixtures).
4. Add browser worker adapter for isolated meta execution in browser target.

## Quick Repro / Verification

Run from `impl/py/`:

```bash
python -m pytest -q
```

Focused suites:

```bash
python -m pytest tests/makrellpy/test_mr_tests.py -q
python -m pytest tests/makrellpy/test_missing_features.py tests/makrellpy/test_simple.py tests/makrellpy/test_interop.py -q
python -m pytest tests/test_mrml.py tests/test_tokeniser.py -q
```

## Hand-off Prompt

Use this at the start of a new chat:

"Read `AGENTS.md` and `SESSION_NOTES.md`, summarize current state in 5 bullets, then continue with `Next Actions` item 1."
