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

## Completed

- 2026-02-15: Added MakrellTS reference transition plan.
  - Files: `impl/ts/REFERENCE_PLAN.md`
  - Tests run: N/A (planning/documentation only)
  - Result: plan committed in-repo for future sessions

## In Progress

- Item: MakrellTS milestone execution (M0-M7)
- Status: planning complete; implementation not started in this thread
- Blockers: none documented yet

## Next Actions

1. Build parity matrix from MakrellPy tests into `impl/ts/tests/parity/` status categories.
2. Implement isolated meta runtime adapter interface for Bun/Node + browser worker.
3. Define MakrellTS typing syntax subset using existing AST node forms only.
4. Add `{new ...}` construct and baseline class-instantiation tests in `impl/ts`.

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
