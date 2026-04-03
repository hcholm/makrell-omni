# Makrell# Packaging for v0.10.0

## Decision

For `v0.10.0`, Makrell# should ship as:

- NuGet-ready library packages for:
  - `MakrellSharp.Ast`
  - `MakrellSharp.BaseFormat`
  - `MakrellSharp.Mron`
  - `MakrellSharp.Mrml`
  - `MakrellSharp.Mrtd`
  - `MakrellSharp.Compiler`
- a packaged `.NET` tool:
  - `MakrellSharp.Cli`

## Why this is the right scope

The library projects already form a sensible package boundary:

- AST and base-format layers can be consumed independently
- MRON, MRML, and MRTD are useful as standalone format packages
- the compiler package is the natural Makrell# language package

The library projects already form a sensible package boundary, and the CLI has
now become important enough to the `v0.10.0` developer experience that it
should also be installable directly.

For `v0.10.0`, the CLI should be:

- built and tested as part of the solution
- documented clearly
- runnable via `dotnet run --project src/MakrellSharp.Cli -- ...`
- installable as a `.NET` tool

## Packaging metadata baseline

The packageable library projects now share baseline metadata through
`Directory.Build.props`:

- package version `0.10.0`
- MIT licence expression
- project URL `https://makrell.dev`
- repository URL `https://github.com/hcholm/makrell-omni`
- a shared package readme included as `NUGET_README.md`

## Verification target

For the release, the packaging smoke target is:

```powershell
dotnet pack MakrellSharp.sln -c Release
```

Expected interpretation:

- library projects and the CLI tool pack successfully
- test projects are not published artefacts

Local tool smoke check:

```powershell
dotnet tool install MakrellSharp.Cli --tool-path .tmp-tools --add-source src/MakrellSharp.Cli/bin/Release
.tmp-tools\makrellsharp examples/hello.mrsh
```

## Post-v0.10.0 follow-up

After `v0.10.0`, revisit whether `MakrellSharp.Cli` should also become:

- a self-contained binary distribution
- or a broader multi-channel CLI distribution story alongside the `.NET` tool
