# v0.10.0 Release Smoke Suite

## Purpose

This is the compact release-verification set for `v0.10.0`.

It is intentionally smaller than the full repo test surface. The goal is to
exercise the most important packaging, format, editor-facing, and public
showcase paths without turning the smoke pass into a second full CI system.

## Smoke suite

### 1. MakrellPy

Run from `impl/py/`.

```powershell
python -m pytest tests/test_mron.py tests/test_mrml.py tests/test_mrtd.py -q
python -m pytest tests/test_cli.py -q
python -m makrell.cli examples/macros/showcase.mr
```

Why:

- covers MRON, MRML, and MRTD parser behaviour
- covers CLI `check --json`
- covers the public macro showcase

### 2. MakrellTS

Run from `impl/ts/`.

```powershell
bun test tests/unit/index.test.ts
bun run typecheck
bun run src/cli.ts check examples/hello.mrts --json
bun run src/cli.ts examples/macros/showcase.mrts
```

Why:

- covers the main unit/regression surface
- covers the editor-facing CLI diagnostics path
- covers the public macro showcase
- includes MRTD coverage through the main unit suite

Note:

- MakrellTS is part of the release MRTD story.
- MRON and MRML are still evolving in the TS track and are therefore not part
  of the parser-level smoke suite yet.

### 3. Makrell#

Run from `impl/dotnet/`.

```powershell
dotnet test tests/MakrellSharp.Mron.Tests/MakrellSharp.Mron.Tests.csproj /nodeReuse:false -p:UseSharedCompilation=false
dotnet test tests/MakrellSharp.Mrml.Tests/MakrellSharp.Mrml.Tests.csproj /nodeReuse:false -p:UseSharedCompilation=false
dotnet test tests/MakrellSharp.Mrtd.Tests/MakrellSharp.Mrtd.Tests.csproj /nodeReuse:false -p:UseSharedCompilation=false
dotnet test tests/MakrellSharp.Cli.Tests/MakrellSharp.Cli.Tests.csproj /nodeReuse:false -p:UseSharedCompilation=false
dotnet run --project src/MakrellSharp.Cli -- examples/showcase.mrsh
```

Why:

- covers MRON, MRML, and MRTD parser behaviour
- covers CLI diagnostics/check paths, including format checks
- covers the public macro showcase

### 4. Site/docs

Run from `makrell.dev/`.

```powershell
python -m sphinx -b html source build\html
```

Why:

- verifies the current public documentation surface
- catches broken links/structure caused by release documentation work

## Current interpretation

The smoke suite is considered green for `v0.10.0` when:

- all commands above succeed
- the showcase examples run
- the format tests stay green in the tracks that currently claim them

This suite is intentionally allowed to reflect the current family shape rather
than an idealised future one. In particular:

- MRON/MRML are smoke-checked in MakrellPy and Makrell#
- MRTD is smoke-checked across MakrellPy, MakrellTS, and Makrell#
- the release does not pretend MakrellTS already has the same MRON/MRML parser
  surface as the Py and `.NET` tracks
