# Makrell

Monorepo for the Makrell language family and tooling.

Makrell includes:
- **MakrellTS**: TypeScript reference implementation (Node/Bun + browser runtime).
- **MakrellPy**: Python implementation track for compatibility, validation, and tooling continuity.
- **MRON**: Makrell Object Notation.
- **MRML**: Makrell Markup Language.
- **MBF**: Makrell Base Format used by all of the above.

Project website and docs: [makrell.dev](https://makrell.dev)

## Repository layout

- `specs/`: normative and draft specifications (`main-spec.md`, `makrellpy-spec.md`, `mron-spec.md`, `mrml-spec.md`, `mbf-spec.md`).
- `impl/ts/`: TypeScript reference implementation, tests, examples, browser runtime, and roadmap docs.
- `impl/py/`: Python implementation track, tests, examples, packaging, and implementation docs.
- `makrell.dev/`: website/docs source.
- `vscode-makrell/`: VS Code extension and editor integration assets.

## Implementation guides

- MakrellTS guide and examples: [`impl/ts/README.md`](impl/ts/README.md#makrellts-by-example)
- MakrellPy guide and examples: [`impl/py/README.md`](impl/py/README.md#makrellpy-by-example)

## Working with MakrellTS (reference)

From `impl/ts/`:

```bash
bun install
bun run ci
```

Run MakrellTS CLI:

```bash
bun run src/cli.ts examples/hello.mrjs
```

## Working with MakrellPy

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

Language and format behaviour in this repo should be driven by `specs/`.
Implementation changes in both `impl/ts/` and `impl/py/` should stay aligned with specs and tests.

## Licence

This repository is released under the MIT licence. See [`LICENSE`](LICENSE).
