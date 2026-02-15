# Session Notes

Use this file to preserve short-term working context between Codex sessions.
Keep entries concise and append-only.

## Current Focus

- Feature/area:
- Goal:

## Decisions

- YYYY-MM-DD: Decision -> reason

## Completed

- YYYY-MM-DD: Change summary
  - Files:
  - Tests run:
  - Result:

## In Progress

- Item:
- Status:
- Blockers:

## Next Actions

1. 
2. 
3. 

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
