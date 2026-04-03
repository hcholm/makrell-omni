# Makrell

Makrell is a structural family for programming languages, data formats,
markup formats, and embedded DSLs.

This repository contains the specifications, implementations, tooling, editor
integration, and documentation for that family.

Project website and docs: [makrell.dev](https://makrell.dev)

![vscode-makrell showing Makrell diagnostics in VS Code](makrell.dev/source/_static/ide.png)

At the centre is **MBF**, the Makrell Base Format: a bracket-and-operator based representation that supports code, data, and markup without treating them as entirely separate worlds. On top of MBF, Makrell currently spans:

- **MakrellTS**: the TypeScript implementation track, with CLI, browser/runtime support, examples, and tests
- **MakrellPy**: the Python implementation track, currently the most mature host for macro/meta semantics and compatibility work
- **Makrell#**: the .NET implementation track, including MBF, MRON, MRML, a Roslyn-backed compiler, runtime loading, and CLR interop
- **MRON**: Makrell Object Notation
- **MRML**: Makrell Markup Language
- **MRTD**: Makrell Tabular Data (draft)
## Why Makrell

Makrell is aiming for a coherent language family rather than a single isolated syntax.
The main ideas are:

- one shared structural foundation for programming, data, and markup
- strong macro and compile-time transformation capabilities
- host-language implementations that validate the design across ecosystems instead of tying Makrell to a single runtime
- a specs-first approach so the language can outgrow any one implementation

In practice, that means the repo is not only "a language implementation". It is also where the shared model across TypeScript, Python, and .NET is being worked out.

One cross-cutting rule emerging in the project is that features do not all need
the same portability level. Some constructs belong to the family core, some are
language/profile specific, and some are application-specific extensions for
controlled environments. See [`specs/portability-model.md`](specs/portability-model.md).

## A Quick Taste

Makrell code:

```makrell
{fun add [x y]
    x + y}

add3 = {add 3 _}

[2 5 8] | {map add3} | sum
```

MRON:

```mron
name "Makrell#"
features ["macros" "mron" "mrml" "interop"]
stable false
```

MRML:

```mrml
{page [lang="en"] {title "Makrell#"} {p "A small MRML example."}}
```

## What Is In This Repo

- `specs/`: normative and draft specifications, including MBF, MakrellPy, Makrell#, MRON, and MRML
- `impl/ts/`: TypeScript implementation, tests, examples, browser runtime, and roadmap material
- `impl/py/`: Python implementation, tests, examples, packaging, and implementation docs
- `impl/dotnet/`: .NET implementation for Makrell#, parsers, compiler, CLI, tests, and examples
- `makrell.dev/`: website and documentation source
- `vscode-makrell/`: VS Code extension and editor support assets

## Start Here

- Website: [makrell.dev](https://makrell.dev)
- Playground and browser-facing direction: [makrell.dev/playground/](https://makrell.dev/playground/)
- VS Code/editor workflow: [`vscode-makrell/README.md`](vscode-makrell/README.md)
- Specification index: [`specs/main-spec.md`](specs/main-spec.md)
- MakrellTS guide: [`impl/ts/README.md`](impl/ts/README.md#makrellts-by-example)
- MakrellPy guide: [`impl/py/README.md`](impl/py/README.md#makrellpy-by-example)
- Makrell# guide: [`impl/dotnet/README.md`](impl/dotnet/README.md)

## Current Front Door

For `v0.10.0`, the most practical current entry points are:

- **`makrell.dev`** for the family overview, implementation docs, and the
  MakrellTS-first playground track
- **`vscode-makrell`** for the current editor workflow across:
  - MakrellPy / `.mrpy`
  - MakrellTS / `.mrts`
  - Makrell# / `.mrsh`
  - MRON / `.mron`
  - MRML / `.mrml`
  - MRTD / `.mrtd`
- the three implementation READMEs for current install/run/check details

Today, `vscode-makrell` gives you:

- syntax highlighting and snippets
- `Run Current File` for MakrellPy, MakrellTS, and Makrell#
- CLI-backed diagnostics/code markings for MakrellPy, MakrellTS, Makrell#,
  MRON, MRML, and MRTD
- an optional `makrell-langserver` bridge while the longer-term TS-family
  tooling path is being built

## Current Implementation Picture

- **MakrellTS** is a major implementation track and an important practical reference for the JavaScript and browser ecosystem.
- **MakrellPy** is a key semantic reference point, especially for macro/meta behaviour and compatibility validation.
- **Makrell#** is the .NET track, already covering MBF parsing, MRON, MRML, compile/load, CLI tooling, and an actively growing CLR interop layer.

The long-term source of truth should be the specs and conformance tests rather than any single implementation in isolation.

## Working With MakrellTS

From `impl/ts/`:

```bash
bun install
bun run ci
bun run src/cli.ts examples/hello.mrts
bun run src/cli.ts check examples/hello.mrts --json
```

## Working With MakrellPy

From `impl/py/`:

```bash
pip install -e .
python -m pytest
makrell
makrell path/to/script.mrpy
makrell check path/to/script.mrpy --json
```

## Working With Makrell#

From `impl/dotnet/`:

```bash
dotnet build MakrellSharp.sln
dotnet test MakrellSharp.sln
dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh
dotnet run --project src/MakrellSharp.Cli -- check examples/hello.mrsh --json
dotnet run --project src/MakrellSharp.Cli -- build examples/hello.mrsh
dotnet run --project src/MakrellSharp.Cli -- run-assembly examples/hello.dll
dotnet run --project src/MakrellSharp.Cli -- meta-sources examples/macros.dll
dotnet run --project src/MakrellSharp.Cli -- parse-mron examples/sample.mron
dotnet run --project src/MakrellSharp.Cli -- parse-mrml examples/sample.mrml
dotnet run --project src/MakrellSharp.Cli -- parse-mrtd examples/sample.mrtd
```

Local tool install from a packed CLI package:

```bash
dotnet pack MakrellSharp.sln -c Release
dotnet tool install MakrellSharp.Cli --tool-path .tmp-tools --add-source src/MakrellSharp.Cli/bin/Release
.tmp-tools/makrellsharp examples/hello.mrsh
```

## Development Principle

Makrell is being developed specs first.
Changes in `impl/ts/`, `impl/py/`, and `impl/dotnet/` should track `specs/` and come with tests.
When implementations differ, those differences should be made explicit rather than silently treated as the language definition.

## Licence

This repository is released under the MIT licence. See [`LICENSE`](LICENSE).
