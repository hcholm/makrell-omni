# Debug Information and Source Mapping

This note records the current debug-information and source-mapping story for
the three main language tracks in `v0.10.0`.

The short version is:

- Makrell# has real host-level PDB output
- MakrellTS has host build sourcemaps for the TypeScript implementation and browser bundles
- MakrellPy preserves source filenames in important execution paths
- none of the three tracks has full Makrell-aware source mapping yet

## Makrell#

Current state:

- compiled Makrell# assemblies carry both PE bytes and PDB bytes in:
  - `impl/dotnet/src/MakrellSharp.Compiler/MakrellAssemblyImage.cs`
- Roslyn emits both streams in:
  - `impl/dotnet/src/MakrellSharp.Compiler/RoslynExecutor.cs`
- the CLI writes sibling `.pdb` files during build in:
  - `impl/dotnet/src/MakrellSharp.Cli/Program.cs`

What this means:

- Makrell# has real debug artefacts at the host/.NET level
- package/build workflows can preserve usable PDB output
- generated assemblies can be loaded with symbols

Current limitation:

- the PDBs are for the generated C# assembly, not for `.mrsh` as a first-class
  source language
- Roslyn diagnostics are currently surfaced with C# source coordinates
- there is no robust mapping from generated C# spans back to Makrell# spans

Practical summary:

- host-level debugging support exists
- Makrell-aware debugging and source maps do not yet exist

## MakrellTS

Current state:

- package/browser builds use Bun sourcemaps in:
  - `impl/ts/package.json`
- the browser playground build also emits linked sourcemaps in:
  - `playground/build.mjs`

What this means:

- the TypeScript implementation itself has ordinary host-tool sourcemaps
- browser bundles and package outputs can be debugged as built JS/TS artefacts

Current limitation:

- those sourcemaps are for:
  - TypeScript implementation source -> built JS
- they are not for:
  - `.mrts` source -> generated JS

Practical summary:

- host/toolchain sourcemaps exist
- MakrellTS user code does not yet have a Makrell-aware source-map layer

## MakrellPy

Current state:

- MakrellPy compiles and executes Python AST/modules using explicit filenames in:
  - `impl/py/makrell/makrellpy/compiler.py`
- `exec_src(...)` and `exec_file(...)` preserve the Makrell filename in the
  Python `compile(...)` call

What this means:

- tracebacks and execution paths can refer to the Makrell source filename
- this is much better than treating everything as anonymous generated code

Current limitation:

- there is no sourcemap-style mapping between generated Python and Makrell
  source spans
- line/column fidelity still depends on the generated Python structure and
  compiler path

Practical summary:

- filename preservation exists
- full Makrell-aware debug/source mapping does not

## Current family-level gap

Across all three main tracks, the missing layer is:

- Makrell node/span -> emitted host-code span

That is the piece needed for:

- Makrell-aware stack traces
- Makrell-aware debugger stepping
- mapping Roslyn or JS host diagnostics back to Makrell source
- stronger editor/debug tooling across the family

## `v0.10.0` position

For `v0.10.0`, the honest release position is:

- the family now has some real host-level debug artefacts
- especially in Makrell#
- but true Makrell-aware source mapping is still future work

This should be treated as a shared tooling direction rather than as three
totally separate host-specific problems.
