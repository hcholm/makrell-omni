# Makrell

Monorepo for the Makrell language family and tooling.

Makrell includes:
- **MakrellPy**: general-purpose language with Python interop and metaprogramming.
- **MRON**: Makrell Object Notation.
- **MRML**: Makrell Markup Language.
- **MBF**: Makrell Base Format used by all of the above.

Project website and docs: [makrell.dev](https://makrell.dev)

## Repository layout

- `specs/`: normative and draft specifications (`main-spec.md`, `makrellpy-spec.md`, `mron-spec.md`, `mrml-spec.md`, `mbf-spec.md`).
- `impl/py/`: Python reference implementation, tests, examples, packaging, and implementation docs.
- `makrell.dev/`: website/docs source.
- `vscode-makrell/`: VS Code extension and editor integration assets.

## Working with the Python reference implementation

From `impl/py/`:

```bash
pip install -e .
python -m pytest
```

Run MakrellPy REPL/script:

```bash
makrell
makrell path/to/script.mr
```

## Specifications first

The language and format behaviour in this repo should be driven by `specs/`.
Implementation changes in `impl/py/` should stay aligned with those specs and tests.

## Licence

This repository is released under the MIT licence. See [`LICENSE`](LICENSE).
