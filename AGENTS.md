# AGENTS.md

Guidance for coding agents working in this repository.

## Scope

This is the Makrell monorepo. Main areas:
- `specs/`: language/format specifications.
- `impl/py/`: Python reference implementation.
- `makrell.dev/`: website/docs source.
- `vscode-makrell/`: VS Code extension.

## Working Principles

- Specs first: if behaviour changes, update `specs/` and tests with the implementation change.
- Keep syntax MBF-aligned: prefer forms that are single MBF nodes in language design.
- Preserve existing style and naming in touched files.
- Make minimal, targeted changes; avoid broad refactors unless explicitly requested.

## MakrellPy Notes

- Compile-time macros/meta are separate from runtime imports.
- `{import ...}` is runtime Python import.
- `{importm ...}` replays `_mr_meta_` for compile-time definitions.
- Current `importm` implementation expects `module@[names]` to import meta definitions.
- Pattern matching is defined in `impl/py/makrell/makrellpy/patmatch.mrpy` with runtime helpers in `impl/py/makrell/makrellpy/patmatch_runtime.py`.
- Regular patterns use `{$r ...}`.
- Type constructor patterns use `{$type ...}`.

## Where To Edit

- Parser/token/operator behaviour:
  - `impl/py/makrell/tokeniser.py`
  - `impl/py/makrell/baseformat.py`
- MakrellPy compilation/runtime:
  - `impl/py/makrell/makrellpy/_compile.py`
  - `impl/py/makrell/makrellpy/_compile_binop.py`
  - `impl/py/makrell/makrellpy/_compile_curly_reserved.py`
  - `impl/py/makrell/makrellpy/_compiler_common.py`
  - `impl/py/makrell/makrellpy/compiler.py`
- Pattern matching:
  - `impl/py/makrell/makrellpy/patmatch.mrpy`
  - `impl/py/makrell/makrellpy/patmatch_runtime.py`

## Testing

Run from `impl/py/`.

Fast full suite:

```bash
python -m pytest -q
```

Common focused suites:

```bash
python -m pytest tests/makrellpy/test_mr_tests.py -q
python -m pytest tests/makrellpy/test_missing_features.py tests/makrellpy/test_simple.py tests/makrellpy/test_interop.py -q
python -m pytest tests/test_mrml.py tests/test_tokeniser.py -q
```

## Documentation Expectations

- If semantics change, update `specs/makrellpy-spec.md` (and related specs if needed).
- Keep root `README.md` repo-level; implementation-specific usage belongs under `impl/py/README.md`.
- Use UK spelling in prose where practical; keep filenames as they are (`LICENSE`).

## Safety

- Do not run destructive git commands.
- Do not revert unrelated local changes.
- If unexpected modifications appear, stop and ask before proceeding.
