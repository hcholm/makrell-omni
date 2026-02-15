# MakrellPy -> MakrellTS Parity Manifest

Status labels:
- `portable`: should match MakrellPy semantics directly
- `adapt`: same feature area, but TS/JS semantics require different expectations or syntax
- `exclude`: intentionally not in scope yet (or Python-specific)

## Source test files

- `test_simple.py`: `adapt` (numeric/string/boolean behavior and JS truthiness differences)
- `test_flow.mr`: `portable` (core conditional flow mostly compatible)
- `test_funcs.mr`: `portable` (function/lambda/do semantics target parity)
- `test_special_constructs.mr`: `adapt` (operator/function interop details differ)
- `test_classes.mr`: `adapt` (TS class/new semantics: `{new Point [..]}`)
- `test_patmatch.mr`: `portable` in progress (M3); some cases `adapt` for JS truthiness
- `test_meta.mr`: `portable` in progress (M2 delivered isolation baseline)
- `test_core.mr`: `adapt` (runtime/library surface differs)
- `test_embed.mr`: `exclude` (embedding flows not implemented in TS yet)
- `test_estrings.mr`: `exclude` (TS implementation status pending)
- `test_coroutines.mr`: `exclude` (async parity not implemented in TS yet)
- `test_interop.py`: `adapt` (Python interop -> JS module interop model)
- `test_missing_features.py`: `adapt` (maps to TS equivalents, not 1:1)

## M3 parity notes

- `test_patmatch.mr` core suites partially ported into:
  - `impl/ts/tests/parity/patmatch.parity.test.ts`
- Remaining port work:
  - additional compound edge cases
  - full binding propagation checks
  - truthiness divergences audit (`$` in JS vs Python)

## Milestone parity suites in TS

- M0/M1 core parity subset:
  - `impl/ts/tests/parity/core.parity.test.ts`
  - MBF source: `impl/ts/tests/parity/mbf/core.mr`
- M2 meta/macros parity subset:
  - `impl/ts/tests/parity/meta.parity.test.ts`
  - MBF source: `impl/ts/tests/parity/mbf/meta.mr`
- M3 pattern parity subset:
  - `impl/ts/tests/parity/patmatch.parity.test.ts`
  - MBF source: `impl/ts/tests/parity/mbf/patmatch.mr`

Parity test authoring preference:
- Prefer MBF test sources (`tests/parity/mbf/*.mr`) when possible.
- Keep TypeScript wrappers thin (file loading, adapter selection, assertions).
