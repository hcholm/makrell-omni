# Makrell# (`makrellsharp`) Implementation Plan

## Goal

Build a full .NET implementation of Makrell named **Makrell#**, using `makrellsharp` as the implementation/package/tooling ID where needed.

Scope:

- Base Format parser
- MRON and MRML parsers
- Makrell# to .NET bytecode compiler
- .NET interop model
- dynamic compile/load of Makrell# bytecode modules
- full macro/meta support using Makrell# itself during compile time and dynamic loading
- full automated test suite
- full documentation at `makrell.dev`
- example applications

The language should stay close to MakrellPy and MakrellTS in syntax and feature set, while adopting .NET-friendly semantics, APIs, packaging, and runtime behaviour.

## Context From Existing Implementations

The current repository already provides the reference shape for the work:

- `impl/py/` has the most complete Makrell feature surface and semantics.
- `impl/ts/` shows a cleaner staged compiler/runtime split, parity manifesting, and meta-runtime isolation.
- `impl/py/makrell/tokeniser.py` and `impl/py/makrell/baseformat.py` define the MBF token and parse pipeline.
- `impl/py/makrell/makrellpy/` contains the richer reserved-form, macro, pattern matching, and runtime behaviours.
- `impl/ts/src/parser.ts`, `impl/ts/src/compiler.ts`, `impl/ts/src/macros.ts`, and `impl/ts/src/meta_runtime.ts` provide a good template for a modern layered implementation.
- `impl/py/tests/` and `impl/ts/tests/` already define the corpus shape that Makrell# should mirror.

Makrell# should therefore be designed as:

1. A faithful MBF front-end.
2. A .NET-oriented language/runtime backend.
3. A parity-tested implementation with explicitly documented divergences.

## High-Level Product Decisions

## Name and IDs

- Language name: `Makrell#`
- Canonical implementation ID: `makrellsharp`
- Suggested package/tool names:
  - NuGet packages:
    - `MakrellSharp.Core`
    - `MakrellSharp.Compiler`
    - `MakrellSharp.Runtime`
    - `MakrellSharp.Cli`
  - CLI:
    - `makrellsharp`
    - optional short alias later: `msharp` or `mrsharp`

## Target Runtime and Frameworks

Start with:

- `.NET 9` if the repo is happy to target current platform features
- otherwise `.NET 8 LTS` as the safest baseline

Recommended initial choice:

- Primary target: `.NET 8`
- Optional multi-target later: `.NET 8` and `.NET 9`

Reason:

- better long-term tooling stability
- broad runtime compatibility
- supports `AssemblyLoadContext`, Roslyn, source generation, and modern reflection APIs

## Semantic Direction

Makrell# should preserve Makrell syntax and core forms where practical, but adopt these .NET-aligned semantics:

- Explicit `new` for instance creation:
  - `{new Point [2 3]}`
- Control-flow conditions should be boolean-oriented, matching C# expectations more closely than Python truthiness.
- Numeric defaults should be CLR-friendly:
  - integers default to `long`
  - decimals/floats default to `double`
  - suffixes can extend to `decimal`, `BigInteger`, etc.
- `null`, `true`, and `false` are first-class literals.
- Async maps to `Task` / `Task<T>` / `ValueTask` where relevant.
- Import/interoperability should align with assemblies, namespaces, types, and members rather than Python modules.
- Exceptions, pattern matching, and generics should feel natural to .NET developers.

Recommended rule:

- Keep surface syntax as close as possible to MakrellPy and MakrellTS.
- Prefer .NET runtime semantics whenever Python and .NET differ materially.
- Document every intentional divergence in a compatibility matrix.

## Recommended Repository Layout

Create the implementation under `impl/dotnet/` with this structure:

```text
impl/dotnet/
  README.md
  MAKRELLSHARP_PLAN.md
  global.json
  Directory.Build.props
  MakrellSharp.sln
  src/
    MakrellSharp.Ast/
    MakrellSharp.BaseFormat/
    MakrellSharp.Mron/
    MakrellSharp.Mrml/
    MakrellSharp.Core/
    MakrellSharp.Compiler/
    MakrellSharp.Runtime/
    MakrellSharp.Meta/
    MakrellSharp.Interop/
    MakrellSharp.Cli/
  tests/
    MakrellSharp.BaseFormat.Tests/
    MakrellSharp.Mron.Tests/
    MakrellSharp.Mrml.Tests/
    MakrellSharp.Compiler.Tests/
    MakrellSharp.Meta.Tests/
    MakrellSharp.Interop.Tests/
    MakrellSharp.Parity.Tests/
    MakrellSharp.Integration.Tests/
  examples/
    hello/
    mrml-minisite/
    aspnet-minimal-api/
    wpf-playground/
  docs/
    parity/
    design/
```

## Architecture

## 1. AST and Front-End Core

Build a shared AST library first. It should model the same conceptual nodes already used in Python and TypeScript:

- `Identifier`
- `String`
- `Number`
- `Operator`
- `BinOp`
- `RoundBrackets`
- `SquareBrackets`
- `CurlyBrackets`
- `Sequence`
- trivia/token nodes as needed for diagnostics

Requirements:

- preserve source spans on all nodes
- support optional preservation of whitespace nodes for embedded whitespace-sensitive sublanguages such as MRML
- support serialisation for macro runtime boundaries
- support visitor and rewrite utilities
- separate token stream, parse tree, and operator-parsed tree clearly

Suggested projects:

- `MakrellSharp.Ast`
- `MakrellSharp.BaseFormat`

## 2. Base Format Parser

Port the MBF pipeline in stages:

1. Tokeniser
2. Bracket grouping
3. Operator precedence parsing
4. include/e-string/suffix transforms
5. diagnostics and recovery

Implementation notes:

- mirror precedence rules from `impl/py/makrell/baseformat.py`
- keep operator precedence configurable for user-defined operators
- support Unicode identifiers/operators
- preserve comments/trivia when helpful for tooling and docs, even if the execution path filters them
- do not assume all Makrell# compilation paths are whitespace-insensitive; embedded DSL subtrees must be able to bypass blanket regularization

Deliverables:

- `Token` model
- `Tokenizer`
- `BracketParser`
- `OperatorParser`
- `Diagnostics` API
- AST printer/debug formatter

## 3. MRON

MRON should be implemented as a parser/lowering layer over MBF rather than a separate tokenizer.

Recommended representation:

- parse MRON into MBF AST
- lower to CLR object graph:
  - `Dictionary<string, object?>`
  - `List<object?>`
  - scalar CLR values
- later add typed deserialisation:
  - `Deserialize<T>()`
  - source generators or reflection binders as optional advanced work

Key features:

- plain data objects
- nested arrays/objects
- Makrell expression embedding where specified
- round-trip friendly formatting API

Suggested package:

- `MakrellSharp.Mron`

## 4. MRML

MRML should also sit on top of MBF.

Recommended outputs:

- DOM-like tree model
- HTML/XML string rendering
- optional writer API for streaming large outputs

Key features:

- element nodes
- attributes
- embedded Makrell expressions
- composable rendering pipeline
- escaping rules and HTML/XML mode switches

Suggested package:

- `MakrellSharp.Mrml`

## 5. Makrell# Compiler Pipeline

The compiler should be staged explicitly:

1. `Source -> Tokens`
2. `Tokens -> MBF AST`
3. `MBF AST -> operator-parsed AST`
4. `AST -> macro expansion / compile-time transformations`
5. `Expanded AST -> typed or annotated intermediate representation`
6. `IR -> C# syntax tree or lower-level CLR emit model`
7. `Emit -> in-memory assembly or on-disk assembly`

Recommended backend strategy:

### Stage A: Roslyn-backed compiler

Compile Makrell# to C# syntax trees, then compile those with Roslyn into IL/bytecode.

Why this should be first:

- much lower implementation risk than direct IL emit
- easier debugging and diagnostics
- easier interop with generics, attributes, async, and reflection
- better generated-source visibility during development

### Stage B: Optional direct IL backend

After the language is stable, consider a second backend using:

- `System.Reflection.Emit` for dynamic-only cases
- or `Mono.Cecil` / `System.Reflection.Metadata` for lower-level control

This should be an optimisation or advanced mode, not the initial path.

## 6. Compiler Projects

Recommended split:

- `MakrellSharp.Compiler`
  - parsing orchestration
  - reserved-form compilation
  - lowering
  - Roslyn emit
- `MakrellSharp.Runtime`
  - runtime helper functions
  - pattern matching helpers
  - standard-library primitives
- `MakrellSharp.Meta`
  - compile-time macro engine
  - AST serialisation and boundary contracts
- `MakrellSharp.Interop`
  - .NET import and binding helpers

## 7. Reserved Forms and Language Features

Port in this order:

1. expression forms:
  - identifiers
  - literals
  - bracket forms
  - member access
  - function calls
  - assignment
  - pipe operators
2. control forms:
  - `if`
  - `when`
  - `while`
  - `for`
  - `do`
3. function/class forms:
  - `fun`
  - `class`
  - `new`
  - `return`
4. import/meta forms:
  - `import`
  - `importm`
  - `meta`
  - `quote`
  - `def macro`
  - `def operator`
  - pattern definitions
  - suffix definitions
5. async and advanced forms:
  - `await`
  - `async fun`
  - `async for` if retained
  - exception handling
  - `with`-style resource patterns if desired for .NET ergonomics

## 8. Type System Strategy

Makrell# should support a gradually typed surface aligned with CLR types.

Recommended principles:

- keep type syntax lightweight and MBF-aligned
- reuse existing node forms instead of inventing many new surface constructs
- map naturally to C# types and generics

Examples to support:

```mbf
x:int = 2
name:string = "Rena"
items:List[int] = [1 2 3]
{fun add [a:int b:int] -> int
  a + b}
```

Recommended mappings:

- `int` -> `long` or alias layer documented clearly
- `float` -> `double`
- `string` -> `string`
- `bool` -> `bool`
- `list[T]` or `List[T]` -> `List<T>`
- `dict[K V]` or mapped equivalent -> `Dictionary<K, V>`

Important decision to make early:

- whether surface aliases should follow Makrell tradition (`int`, `float`, `list`) or CLR names (`long`, `double`, `List[T]`)

Recommended compromise:

- accept Makrell-friendly aliases
- emit CLR-native types internally
- document canonical aliases in Makrell# docs

## 9. Runtime Interop with .NET

Interop is one of the most important areas for Makrell#.

Runtime interop should support:

- importing assemblies and namespaces
- accessing static members
- constructing objects
- calling instance methods
- property/indexer access
- delegates and lambdas
- generic methods/types
- async interop with `Task`
- extension methods where practical

Recommended initial import model:

- `{import System}`
- `{import System.IO}`
- `{import System.Text.StringBuilder}`
- `{import System.Text@[StringBuilder Encoding]}`

Recommended semantics:

- `import` binds namespaces/types into Makrell scope
- member access via `.` remains explicit
- `new` creates CLR instances
- overload resolution is performed by runtime binder helpers
- dynamic and reflection-heavy scenarios go through cached binders for performance

Implementation advice:

- do not rely on raw reflection everywhere
- build an interop binder layer with:
  - member lookup cache
  - overload ranking
  - generic method closure support
  - value conversion rules

## 10. Macro and Meta Runtime

Makrell# needs full macro support, and the macro language itself should be Makrell#.

This is a core requirement, not an optional extra.

The model should follow the phase separation already visible in MakrellPy and MakrellTS:

- runtime code and compile-time code are distinct
- compile-time code runs in an isolated context
- AST values cross the boundary in serialisable form

Recommended architecture:

### Macro definitions

- `{def macro name [args] ...}`
- stored in a macro registry
- serialised into loadable metadata where needed
- macro invocation must receive original AST children, including whitespace/comment nodes where relevant, so a macro can decide for itself whether it is whitespace-sensitive

### Compile-time execution

- compile macro bodies to an in-memory collectible assembly
- execute them in a dedicated `AssemblyLoadContext`
- pass only approved capabilities into the meta runtime

### Required meta APIs

Expose at compile time:

- AST node constructors
- `regular`
- `operator_parse`
- `parse`
- `quote` / unquote
- pattern and suffix registration APIs
- diagnostics emission
- deterministic standard-library helpers

### Dynamic load support

When loading Makrell# modules dynamically at runtime:

- compile-time macro replay must still work
- modules containing macro definitions must publish meta metadata
- `importm` should restore those macro definitions during later compilations

Recommended metadata format:

- serialised AST-based macro manifest embedded in the compiled assembly
- readable via reflection without executing arbitrary runtime entrypoints

Possible implementation options:

- custom assembly attribute with compressed JSON payload
- embedded resource such as `makrellsharp.meta.json`
- generated manifest type with strongly typed metadata

Recommended initial choice:

- embedded resource, because it is easy to inspect, version, and test

## 11. Dynamic Compile and Load

Makrell# should support:

- compile source to DLL/EXE on disk
- compile source to in-memory assembly
- load compiled modules dynamically
- unload collectible modules when possible

Recommended API surface:

```csharp
CompileResult Compile(string source, CompileOptions options);
Assembly CompileToAssembly(string source, CompileOptions options);
MakrellModule LoadModule(string source, LoadOptions options);
MakrellModule LoadAssembly(Stream peStream, Stream? pdbStream = null);
```

Implementation pieces:

- Roslyn `CSharpCompilation`
- PE/PDB emit to memory streams
- `AssemblyLoadContext` for load/unload
- symbol/source map metadata for diagnostics and debugging

Important requirement:

- the same pathway must work both for ordinary modules and for meta/macro assemblies

## 12. Pattern Matching

Pattern matching should be planned early even if it lands after core compilation.

Match support should include:

- wildcard `_`
- literal matches
- list patterns
- union/or patterns
- binding patterns
- type patterns
- regular patterns `{$r ...}`
- type constructor patterns `{$type ...}`
- user-defined patterns

Implementation recommendation:

- use a mix of compile-time lowering and runtime helpers
- lower simple patterns directly for performance
- route complex and user-defined patterns through runtime matcher helpers

Suggested package ownership:

- syntax and lowering in `MakrellSharp.Compiler`
- helper engine in `MakrellSharp.Runtime`

## 13. Tooling and Developer Experience

CLI commands should include:

- `makrellsharp run file.mrsh`
- `makrellsharp build file.mrsh`
- `makrellsharp repl`
- `makrellsharp test`
- `makrellsharp fmt` later
- `makrellsharp emit-csharp file.mrsh`
- `makrellsharp emit-il file.mrsh` later if direct IL backend is added

Development tooling to adopt:

- solution-wide `dotnet build`
- `dotnet test`
- `dotnet format`
- Roslyn analyzers
- nullable reference types enabled everywhere
- Source Link and deterministic builds

Nice-to-have later:

- VS Code extension support
- Language Server Protocol support
- debugger integration
- source generator for MRON typed binding

## 14. Test Strategy

Makrell# should adopt the same broad testing shape as MakrellPy and MakrellTS:

- unit tests
- parity tests
- integration tests
- golden-output tests
- example-app smoke tests

### Unit tests

Per project:

- tokenizer/parser behaviour
- precedence and bracket parsing
- AST serialisation
- MRON and MRML transforms
- compiler lowering
- interop binder
- macro runtime helpers

### Parity tests

Create a Makrell# parity manifest similar to `impl/ts/tests/parity/manifest.md`.

Classify current MakrellPy tests as:

- `portable`
- `adapt`
- `exclude`

Use the existing Python suites as seed material:

- `tests/test_tokeniser.py`
- `tests/test_parsing.py`
- `tests/test_mron.py`
- `tests/test_mrml.py`
- `tests/makrellpy/test_core.mr`
- `tests/makrellpy/test_meta.mr`
- `tests/makrellpy/test_patmatch.mr`
- `tests/makrellpy/test_flow.mr`
- `tests/makrellpy/test_funcs.mr`
- `tests/makrellpy/test_classes.mr`
- `tests/makrellpy/test_interop.py`

### Golden tests

Add snapshot tests for:

- emitted C#
- emitted diagnostics
- embedded macro metadata manifests
- rendered MRML HTML/XML

### Dynamic load tests

Test:

- compile to in-memory assembly
- load via `AssemblyLoadContext`
- invoke exported entrypoints
- unload successfully
- replay `importm` metadata from compiled assemblies

### Example app smoke tests

At least one test per example should build and run the app in CI.

## 15. Documentation Plan

The documentation should live at `makrell.dev`.

Content areas:

- getting started with Makrell#
- syntax and semantics
- .NET-specific differences from MakrellPy and MakrellTS
- interop guide
- macro/meta guide
- MRON and MRML guides
- compiler and dynamic loading APIs
- examples and tutorials

Recommended documentation structure:

- language-level docs under the main Makrell docs site
- implementation-specific docs under a `makrellsharp/` section
- design docs kept close to the implementation in `impl/dotnet/docs/`

Sphinx vs Hugo recommendation:

- if the docs site remains Sphinx in the near term, add Makrell# there first for lowest friction
- if the site is being modernised more broadly, Hugo is reasonable, but that migration should not block Makrell#

Recommended immediate choice:

- document Makrell# in the existing docs system first
- revisit Hugo separately if the overall site migration is approved

## 16. Example Applications

Build example apps in increasing order of complexity:

1. `hello`
   - simple CLI script
2. `mrml-minisite`
   - static site or page generator using MRML
3. `aspnet-minimal-api`
   - Makrell# logic called from ASP.NET Core
4. `wpf-playground` or `avalonia-playground`
   - desktop demo of .NET interop and dynamic module loading

Optional later examples:

- Blazor integration
- Roslyn scripting host integration
- plugin system example with dynamic reloading

## 17. Milestones

## M0. Scaffold and design freeze

Deliverables:

- `impl/dotnet/` solution scaffold
- package naming and namespace policy
- coding standards
- architecture decision records
- parity manifest draft

Exit criteria:

- solution builds
- empty test projects run
- design ADRs approved

## M1. MBF front-end

Deliverables:

- tokenizer
- bracket parser
- operator parser
- diagnostics
- AST printer/debugger helpers

Exit criteria:

- parser tests covering current MakrellPy tokeniser/baseformat behaviour

## M2. MRON and MRML

Deliverables:

- MRON object graph parser and serializer
- MRML tree model and renderer
- fixtures ported from Python tests

Exit criteria:

- MRON and MRML parity subset green

## M3. Core Makrell# expression compiler

Deliverables:

- literals, operators, assignment
- calls, member access, pipe operators
- `if`, `when`, `while`, `for`, `do`
- functions and classes
- C# emitter
- Roslyn compile-to-assembly

Exit criteria:

- core Makrell execution tests green

## M4. Runtime library and interop

Deliverables:

- runtime helper library
- import/binding model
- overload resolution
- constructors, properties, methods
- exception bridging

Exit criteria:

- interop examples run against core .NET libraries

## M5. Macro/meta execution

Deliverables:

- macro registry
- `quote` / unquote
- `meta`
- `def macro`
- compile-time execution in collectible load context
- serialised meta manifest format

Exit criteria:

- macro tests pass both in ordinary compilation and dynamic load scenarios

## M6. Pattern matching and extensibility

Deliverables:

- built-in pattern forms
- user-defined patterns
- suffix transforms
- custom operator definitions

Exit criteria:

- pattern parity subset green

## M7. Dynamic module compile/load

Deliverables:

- in-memory compilation API
- module loader/unloader
- importm replay from compiled assemblies
- plugin-style loading examples

Exit criteria:

- dynamic compile/load tests green

## M8. Docs and examples

Deliverables:

- Makrell# docs section at `makrell.dev`
- at least three example apps
- getting-started guide
- compatibility matrix

Exit criteria:

- documentation reviewed and examples build in CI

## M9. Release readiness

Deliverables:

- NuGet packaging
- versioning policy
- release notes template
- CI/CD publish pipeline
- stable public API review

Exit criteria:

- prerelease package published
- install/build/run workflow validated from a clean machine

## 18. Tools and Libraries Needed

Core toolchain:

- .NET SDK 8+
- Roslyn (`Microsoft.CodeAnalysis.CSharp`)
- xUnit or NUnit
- FluentAssertions optional
- Verify or Snapshooter for snapshot tests
- BenchmarkDotNet for performance testing
- `dotnet format`
- GitHub Actions for CI

Likely supporting libraries:

- `Microsoft.Extensions.DependencyInjection` for host integration examples
- `System.CommandLine` for CLI
- `Mono.Cecil` only if/when direct IL work becomes necessary

Recommended testing tools:

- xUnit
- FluentAssertions
- Verify.Tests

Recommended CI matrix:

- Windows
- Linux
- optional macOS later

## 19. Resources Needed

## Engineering work

At minimum:

- one lead implementer for compiler/runtime
- one contributor for tests/docs/examples if available

Helpful expertise:

- Roslyn compiler APIs
- `AssemblyLoadContext`
- CLR reflection and generics
- parser/compiler construction

## Design resources

Need explicit design notes for:

- Makrell# semantic divergences from MakrellPy
- type syntax and aliases
- import/importm for assemblies
- macro assembly metadata contract
- diagnostics strategy

## Documentation resources

- doc writer or maintainer time for tutorials and migration notes
- decision on whether syntax guides stay implementation-neutral or become backend-specific

## 20. Key Risks and Mitigations

Risk:

- direct IL emission is too costly too early

Mitigation:

- start with Roslyn-backed IL generation, defer low-level backend work

Risk:

- macro runtime isolation becomes difficult with dynamic loading

Mitigation:

- use serialisable AST contracts plus collectible `AssemblyLoadContext`

Risk:

- .NET interop overload resolution becomes unpredictable

Mitigation:

- centralise binder rules and write exhaustive interop tests

Risk:

- parity with MakrellPy is unclear in edge cases

Mitigation:

- maintain a living divergence matrix and tag tests as `portable`, `adapt`, or `exclude`

Risk:

- documentation work lags behind compiler work

Mitigation:

- require docs and examples as milestone exit criteria, not end-of-project extras

## 21. Immediate Next Steps

1. Scaffold `impl/dotnet/` as a .NET solution with the project layout above.
2. Write an ADR defining Makrell# semantic differences from MakrellPy and MakrellTS.
3. Port the MBF AST, tokenizer, and precedence parser first.
4. Create a parity manifest mapping current Python tests into `portable`, `adapt`, and `exclude`.
5. Implement a Roslyn-based `compile to C# syntax tree -> compile to assembly` path before attempting any direct IL work.
6. Define the macro metadata manifest format for `importm` before dynamic loading is implemented.
7. Add the first docs stub at `makrell.dev` once the front-end and compiler terminology are stable.

## Recommended Order of Execution

If the work is to start immediately, the most sensible build order is:

1. repo scaffold and ADRs
2. MBF front-end
3. MRON/MRML
4. core compiler and runtime
5. interop
6. macro/meta engine
7. dynamic loading
8. pattern matching and advanced extensibility
9. docs, examples, packaging, and release polish

This ordering keeps the riskiest compiler pieces grounded in a working front-end and avoids blocking the whole effort on the macro system before the runtime/compiler foundation exists.
