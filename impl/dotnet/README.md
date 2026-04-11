# Makrell#

Makrell# is the .NET implementation track for the Makrell language family.

Current status: early implementation, but already usable for core MBF parsing, MRON/MRML parsing, Makrell# compilation to .NET assemblies, compile-time macro/meta execution, and a first .NET interop layer.

Website and documentation: **[makrell.dev](https://makrell.dev)**

Current editor workflow: [`../../vscode-makrell/README.md`](../../vscode-makrell/README.md)

## Projects

- `MakrellSharp.Ast`: shared AST model
- `MakrellSharp.BaseFormat`: MBF tokenising, structure parsing, operator parsing
- `MakrellSharp.Mron`: MRON to `System.Text.Json.JsonDocument`
- `MakrellSharp.Mrml`: MRML to `System.Xml.Linq.XDocument`
- `MakrellSharp.Mrtd`: MRTD to a normalised tabular model with JSON projections
- `MakrellSharp.Compiler`: Makrell# to generated C# and compiled .NET bytecode

## Packaging status for v0.10.0

For `v0.10.0`, the `.NET` packaging decision is:

- package the library projects as NuGet-ready units
- package `MakrellSharp.Cli` as a `.NET` tool

See [`PACKAGING.md`](PACKAGING.md) for the recorded scope and rationale.

## Install and use

Public NuGet packages verified on 12 April 2026:

- `MakrellSharp.Ast`
- `MakrellSharp.BaseFormat`
- `MakrellSharp.Mron`
- `MakrellSharp.Mrml`
- `MakrellSharp.Mrtd`
- `MakrellSharp.Compiler`
- `MakrellSharp.Cli`

```bash
dotnet tool install --global MakrellSharp.Cli
```

Example library reference:

```xml
<ItemGroup>
  <PackageReference Include="MakrellSharp.Mrtd" Version="0.10.0" />
</ItemGroup>
```

Run the CLI:

```bash
makrellsharp hello.mrsh
makrellsharp check hello.mrsh --json
makrellsharp build hello.mrsh
makrellsharp emit-csharp hello.mrsh
makrellsharp parse-mron sample.mron
makrellsharp parse-mrml sample.mrml
makrellsharp parse-mrtd sample.mrtd
```

## Build and test from the repo

From `impl/dotnet/`:

```bash
dotnet build MakrellSharp.sln
dotnet test MakrellSharp.sln
dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh
dotnet run --project src/MakrellSharp.Cli -- check examples/hello.mrsh --json
```

## Current language slice

Implemented so far:

- MBF parsing with optional whitespace preservation
- MRON parsing to `JsonDocument`
- MRML parsing to `XDocument`
- expression compilation for arithmetic, assignment, `if`, `do`, functions, placeholder lambdas, pipe/reverse-pipe, map pipe, indexing, and quoting
- statement forms `when`, `while`, `for`, and `return`
- initial pattern matching through `match`, `~=`, and `!~=`
- compile-time `meta`
- Makrell-defined macros with original whitespace-preserving nodes
- dynamic compile/load with replayable `importm` metadata
- first-pass .NET interop through `import`, `new`, member calls, generic member calls, inferred generic static calls, property assignment, and index assignment
- basic constructor and method overload coercion for common scalar CLR arguments
- adaptation of Makrell functions to CLR delegate parameters for common interop calls

Not implemented yet:

- REPL
- full parity with MakrellPy/MakrellTS
- full MakrellPy pattern-matching parity
- broader CLR overload/generic-method ergonomics beyond the current common cases

## Function calls and lambdas

Ordinary calls use curly form:

```makrell
{add 2 3}
```

Arrow lambdas are supported:

```makrell
x -> x + 1
[x y] -> x + y
```

Direct call arguments can also use `_` as a placeholder, which lowers to a generated lambda:

```makrell
{fun add [x y]
    x + y}

add3 = {add 3 _}
{add3 2}
```

Multiple placeholders bind left-to-right:

```makrell
{fun pack [x y z]
    x * 100 + y * 10 + z}

f = {pack _ 2 _}
{f 3 5}
```

Operators can also be used as first-class functions:

```makrell
mul = {*}
{mul 2 3}

add2 = {+ 2}
{add2 3}

gt = {>}
{gt 5 3}

idx = {@}
{idx [10 20 30] 1}
```

Pipe operators are also supported:

```makrell
2 | add3
add3 \ 2
[2 5 8] |* add3
add3 *\ [2 5 8]
```

## Async and await

Makrell# now has the shared family baseline:

- `{async fun ...}`
- `{await expr}`

Example:

```makrell
{async fun fetchValue [value]
    value}

{async fun addLater [x y]
    left = {await {fetchValue x}}
    right = {await {fetchValue y}}
    left + right}

{await {addLater 20 22}}
```

Current scope:

- async named functions
- async anonymous functions
- await inside async functions
- top-level `{await ...}` through the normal Makrell# run path

Broader async parity such as additional host-shaped async forms is still future work.

## Pattern matching

Makrell# now has a first pattern-matching slice with:
- wildcard `_`
- literal patterns
- round-bracket grouped alternatives such as `(2 3 5)`
- alternation with `|`
- capture bindings with `name=pattern`
- fixed-length list/array patterns
- trailing list rest patterns such as `[head tail=$rest]` or `[x y $rest]`
- `_:Type` checks
- `$type` constructor patterns with type-only, positional tuple/sequence/`Deconstruct(...)`, and keyword member matching
- `$r` regular patterns with exact sequence matching, `_`, `$rest`, grouped alternatives, `maybe`/`some`/`any` quantifiers, range quantifiers, nested regular patterns, and binding-compatible `name=pattern` forms
- self truthiness pattern `$`
- composite patterns with `&`
- self-based predicate patterns such as `$ < 3`
- guarded clauses via a result wrapper of the form `{when condition result...}`
- short-form boolean matches
- `~=` and `!~=`

Examples:

```makrell
{match 3
    2
        "two"
    3
        "three"
    _
        "other"}
```

```makrell
{match [2 3]
    []
        "empty"
    [_]
        "one"
    [_ _]
        "two"}
```

```makrell
{match [2 3 5 7]
    [2 tail=$rest]
        tail @ 1
    _
        0}
```

```makrell
[2 3 5] ~= ([1 2] [2 3 5])
```

```makrell
[2 3] ~= [_ _]
```

```makrell
{match 2
    _:string & $ < 3
        "string"
    _:int & $ < 3
        "int"
    _
        "other"}
```

```makrell
date = {new System.DateTime [2024 6 7]}
{match date
    {$type System.DateTime [Year=2024 Month=6 Day=7]}
        "date"
    _
        "other"}
```

```makrell
{match [2 7 5]
    {$r 2 any*(_ | 7) 5}
        true
    _
        false}
```

```makrell
{match [[2 3] 7]
    {$r {$r 2 3} 7}
        true
    _
        false}
```

```makrell
{match [2 3]
    [a=_ b=_]
        a + b
    _
        0}
```

```makrell
{match [2 5]
    [x=_ y=_]
        {when x < y
            x + y}
    _
        0}
```

## Interop notes

Namespace and type imports:

```makrell
{import System.Text}
{import System.Text@[Encoding]}
{import System.Text.StringBuilder}
{import (list string)}
```

Generic CLR types use Makrell-shaped round forms:

```makrell
{new (list string) ["a" "b"]}
{new (dict string int) [["a" 1] ["b" 2]]}
{new (array string) ["a" "b"]}
```

Examples:

```makrell
{import System.Text}
sb = {new StringBuilder ["Mak"]}
{sb.Append "rell#"}
{sb.ToString}
```

```makrell
items = {new (array string) ["Mak" "rell#"]}
{String.Join "" items}
```

```makrell
empty = {Array.Empty@(string)}
empty.Length
```

```makrell
{import System.Linq}
repeated = {Enumerable.Repeat@(string) "ha" 3}
{String.Join "" repeated}
```

```makrell
{import System.Linq}
repeated = {Enumerable.Repeat "ha" 3}
{String.Join "" repeated}
```

```makrell
{import System.Threading.Tasks@[Task]}
task = {Task.FromResult 42}
{await task}
```

```makrell
items = {new (list string) ["mak" "rell"]}
upper = {items.ConvertAll@(string) {fun [x] {x.ToUpperInvariant}}}
{String.Join "" upper}
```

```makrell
items = {new (list string) ["a" "b"]}
items @ 1 = "c"
items @ 1
```

```makrell
items = {new (list int) [1 2 3 4]}
middle = items @ (1 .. 3)
prefix = items @ (_ .. 2)
suffix = items @ (2 .. _)
whole = items @ (_ .. _)
items @ (1 .. 3) = [8 9]
[middle prefix suffix whole items]
```

Current Makrell# runtime surface:
- `x @ i` works for strings, arrays, lists, dictionaries, and CLR indexers
- `x @ (a .. b)` works for strings, arrays, and lists
- `_ .. b`, `a .. _`, and `_ .. _` leave slice bounds open
- `x @ (a .. b) = values` works for arrays and lists
- array slice assignment currently requires the replacement to have the same length as the slice

## Macro and meta notes

Macros receive original nodes, including whitespace nodes. Whitespace-insensitive macros should call `regular` explicitly.

Compile-time `meta` code now supports the same basic pattern engine as runtime
Makrell# for common cases, including `match`, `~=`, `!~=`, capture bindings,
and guarded clauses. That means macros can use pattern-shaped logic directly
instead of rebuilding simple dispatch by hand.

Example:

```makrell
{def macro incr [ns]
    ns = {regular ns}
    {quote {unquote ns@0} + 1}}

{incr 4}
```

```makrell
{def macro second [ns]
    ns = {regular ns}
    {match ns
        [_ value=_ $rest]
            {quote {unquote value}}
        _
            {quote null}}}

{second 2 3 5}
```

Compile-time definitions can be replayed from compiled assemblies with `importm`.

## Examples

See:

- [`examples/hello.mrsh`](examples/hello.mrsh)
- [`examples/async.mrsh`](examples/async.mrsh)
- [`examples/interop.mrsh`](examples/interop.mrsh)
- [`examples/macros.mrsh`](examples/macros.mrsh)
- [`examples/showcase.mrsh`](examples/showcase.mrsh)
- [`examples/sample.mron`](examples/sample.mron)
- [`examples/sample.mrml`](examples/sample.mrml)

## MRTD notes

`MakrellSharp.Mrtd` supports the current MRTD draft surface:

- parsing to `MrtdDocument`
- row and record projections
- typed read/write helpers for object-like rows and tuple-like rows
- the shared basic suffix profile as part of the current MRTD core surface

Examples:

```csharp
var people = MrtdTyped.ReadRecords<Person>(
    """
    name:string age:int active:bool
    Ada 32 true
    Ben 41 false
    """);
```

```csharp
var tuples = MrtdTyped.ReadTuples<int, string, double>(
    """
    id:int name:string score:float
    1 Ada 13.5
    2 Ben 9.25
    """);
```

Basic suffix profile example:

```csharp
var doc = MrtdParser.ParseSource(
    """
    when bonus
    "2026-04-03"dt 3k
    """);
```

## Design docs

- implementation plan: [`MAKRELLSHARP_PLAN.md`](MAKRELLSHARP_PLAN.md)
- editor workflow: [`../../vscode-makrell/README.md`](../../vscode-makrell/README.md)
