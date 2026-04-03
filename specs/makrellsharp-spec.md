# Makrell# Specification (Draft)

## 1. Scope

This document defines the current Makrell# semantics on top of MBF.

Normative MBF syntax is defined in `specs/mbf-spec.md`.

Makrell# is the .NET implementation track for the Makrell language family. The current implementation ID is `makrellsharp`, and source files conventionally use the `.mrsh` extension.

## 2. Status

This is a draft implementation-aligned spec.

It documents the behaviour currently implemented under `impl/dotnet/`. It is not yet a full parity specification with MakrellPy or MakrellTS.

## 3. Core Data and Constants

Reserved literals:
- `true` -> boolean true
- `false` -> boolean false
- `null` -> null

Container literals:
- `[]` -> runtime array/object sequence
- `(x)` -> parenthesised expression
- `(x y ...)` -> runtime sequence/object array
- `{...}` -> call or special form depending on head

## 4. Functions and Return Behaviour

Curly form `{f a b}` calls function `f` with arguments `a`, `b`.

Named function form:
- `{fun name [args] ...}`

Anonymous function form:
- `{fun [args] ...}`

Lambda operator:
- `x -> expr`
- `[x y] -> expr`

If `_` appears as a direct call argument, the call MUST be compiled as a lambda with generated placeholder parameters bound left-to-right.

Examples:
- `{add 3 _}`
- `{pack _ 2 _}`

Operators may also be used as first-class function values and partially applied through curly call form.

Examples:
- `{*}`
- `{+ 2}`
- `{>}`
- `{@}`
- `{{*} 5 7}`

Functions and `do` blocks return the value of their final expression unless an explicit `{return ...}` is used.

## 5. Reserved Curly Forms

The following reserved forms are currently implemented in Makrell#:
- `{if ...}`
- `{match value pattern}` short-form boolean match
- `{match value pattern result ...}` match expression
- `{when ...}`
- `{while ...}`
- `{for item iterable ...}`
- `{fun name [args] ...}`
- `{fun [args] ...}`
- `{do ...}`
- `{new Type [args...]}`
- `{import ...}`
- `{return ...}`
- `{quote ...}`
- `{meta ...}`
- `{def macro ...}`

`{importm ...}` is implemented in the compiler/meta pipeline, but it is not yet emitted as a runtime special form in the C# emitter.

## 6. Binary Operator Semantics

Makrell# currently implements:
- `+`, `-`, `*`, `/`, comparison operators through normal compiled expression lowering
- `|` pipe
- `\\` reverse pipe
- `|*` map pipe
- `*\\` reverse map pipe
- `->` lambda construction
- `@` indexing
- `.` member access
- `=` assignment
- `~=` / `!~=` pattern match / negated pattern match

Operator semantics:
- `a | f` rewrites to `{f a}`
- `f \\ a` rewrites to `{f a}`
- `values |* f` maps `f` across `values`
- `f *\\ values` maps `f` across `values`
- `{*}` produces an operator function value
- `{+ 2}` partially applies the operator with its left operand fixed
- arithmetic, comparison, logical, and indexing operators can be used through operator-function values
- `x @ i` indexes sequences, strings, dictionaries, CLR indexers, and arrays
- `x.y` is CLR member/property access
- `x = y` assigns to identifiers
- `x.y = z` assigns to writable CLR members/properties
- `x @ i = z` assigns through runtime index support

## 6.1 Pattern Matching

Makrell# now includes an initial pattern-matching slice.

Implemented forms:
- wildcard `_`
- literal number, string, boolean, and null patterns
- round-bracket grouped alternatives such as `(2 3 5)`
- alternation with `|`
- capture bindings with `name=pattern`
- fixed-length list/array patterns such as `[_ _]`
- trailing list rest patterns such as `[head tail=$rest]` or `[x y $rest]`
- type patterns of the form `_:Type`
- `$type` constructor patterns with type-only, positional tuple/sequence/`Deconstruct(...)`, and keyword member matching
- `$r` regular patterns with exact sequence matching, `_`, `$rest`, grouped alternatives, `maybe`/`some`/`any` quantifiers, range quantifiers, nested regular patterns, and binding-compatible `name=pattern` forms
- self truthiness pattern `$`
- composite patterns with `&`
- self-based predicate patterns such as `$ < 3`
- guarded clauses via a result wrapper of the form `{when condition result...}`
- short-form boolean matching: `{match value pattern}`
- expression matching with pattern/result pairs
- binary operator forms `value ~= pattern` and `value !~= pattern`

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
date = {new System.DateOnly [2024 6 7]}
{match date
    {$type System.DateOnly [_ 6 _]}
        "june"
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

This is intentionally only a first slice of MakrellPy-style pattern matching.
The current Makrell# implementation does not yet include user-defined patterns or full MakrellPy pattern parity.

## 7. Quote, Meta, and Macros

`{quote ...}` returns AST-like node values.

Inside quote context:
- `{unquote ...}` evaluates at the current quote level
- `{$ ...}` is equivalent to `unquote`
- nested quote preserves deeper unquote syntax until that quote level is evaluated

`{meta ...}` executes at compile time.

`{def macro name [ns] ...}` defines a Makrell# compile-time macro.

Macro input rules:
- macros receive original nodes, including whitespace nodes
- a macro that wants whitespace-insensitive behaviour should call `regular`
- this is required so whitespace-sensitive embedded languages such as MRML can be supported correctly

Compile-time execution currently supports:
- assignments
- arithmetic and comparison
- `if`, `when`, `while`, `for`, `break`, `continue`, `return`
- Makrell-defined helper functions
- quote/unquote
- `regular`, `len`, and `@`

`importm` replays embedded compile-time sources from previously compiled Makrell# assemblies.

## 8. CLR and .NET Interop

Interop is a primary Makrell# design goal.

Current implemented interop includes:
- namespace imports such as `{import System.Text}`
- selected type imports such as `{import System.Text@[Encoding]}`
- imported type aliases such as `{import System.Text.StringBuilder}`
- construction with `{new Type [args...]}`
- static/member calls via normal curly call syntax
- generic CLR method calls via `head@(types...)` in call position
- writable property assignment
- index access and assignment for CLR types with indexers
- basic constructor and method overload coercion for common scalar values
- adaptation of Makrell functions to CLR delegate parameters where signatures are compatible

Examples:

```makrell
{import System.Text}
sb = {new StringBuilder ["Mak"]}
{sb.Append "rell#"}
{sb.ToString}
```

```makrell
{import (list string)}
items = {new List ["a" "b"]}
items @ 1
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
items = {new (list string) ["mak" "rell"]}
upper = {items.ConvertAll@(string) {fun [x] {x.ToUpperInvariant}}}
{String.Join "" upper}
```

## 9. Type Reference Forms

Makrell# uses Makrell-shaped type references rather than C#-specific generic syntax.

Implemented forms include:
- `(list string)` -> `System.Collections.Generic.List<string>`
- `(dict string int)` -> `System.Collections.Generic.Dictionary<string, long>`
- `(dictionary string int)` -> `System.Collections.Generic.Dictionary<string, long>`
- `(array string)` -> `string[]`
- `(System.Collections.Generic.Dictionary string int)` -> fully-qualified generic CLR type

Current alias mapping:
- `string` -> `string`
- `bool` -> `bool`
- `object` -> `object`
- `int` -> `long`
- `long` -> `long`
- `float` -> `double`
- `double` -> `double`
- `decimal` -> `decimal`
- `list` -> `System.Collections.Generic.List`
- `dict` / `dictionary` -> `System.Collections.Generic.Dictionary`

These mappings are implementation-defined for now and may be refined as the spec matures.

## 10. Collection Construction

Makrell# supports collection-style `new` lowering for common CLR collection shapes.

Examples:

```makrell
{new (list string) ["a" "b"]}
{new (dict string int) [["a" 1] ["b" 2]]}
{new (array string) ["a" "b"]}
```

This currently lowers to CLR collection or array initialisers in generated C#.

## 11. Dynamic Compilation and Loading

Makrell# source may be:
- compiled to generated C#
- compiled further to .NET bytecode/assemblies
- loaded dynamically as collectible runtime modules

Compiled assemblies embed replayable compile-time source metadata so `importm` can reconstruct macro/meta definitions in later compilation sessions.

The .NET implementation also supports loading compiled Makrell# assemblies from disk and invoking their generated module entrypoint.
The .NET CLI also supports inspecting embedded replayable compile-time sources from a compiled Makrell# assembly.

## 12. Diagnostics and Runtime Errors

Makrell# compile failures from generated C# are surfaced as compile-time exceptions with Roslyn diagnostics.

Runtime CLR invocation failures are wrapped as Makrell# runtime exceptions and SHOULD expose the generated C# source to aid debugging.

Implementations SHOULD include source spans where practical, but source-mapped diagnostics are not yet complete in the current implementation.

## 13. MRON and MRML in the .NET Track

The .NET track also defines:
- MRON parsing to `System.Text.Json.JsonDocument`
- MRML parsing to `System.Xml.Linq.XDocument`

MRON executable embeds and MRML executable embeds are reserved for future work and are not yet implemented in Makrell#.

## 14. Current Non-goals / Not Yet Implemented

The following are not yet fully specified or implemented:
- full MakrellPy parity
- user-defined operators
- advanced MakrellPy pattern-matching parity
- CLI build/test/repl workflow parity
- direct IL backend
- full overload-resolution and generic-method ergonomics for CLR interop
- full source-mapped diagnostics

## 15. Conformance Mapping

Current executable conformance for Makrell# is primarily defined by:
- `impl/dotnet/tests/MakrellSharp.BaseFormat.Tests/`
- `impl/dotnet/tests/MakrellSharp.Mron.Tests/`
- `impl/dotnet/tests/MakrellSharp.Mrml.Tests/`
- `impl/dotnet/tests/MakrellSharp.Compiler.Tests/`

An implementation claiming current Makrell# compatibility SHOULD pass these tests or equivalent tests asserting the same behaviour.

## 16. References

- `specs/mbf-spec.md`
- `impl/dotnet/README.md`
- `impl/dotnet/MAKRELLSHARP_PLAN.md`
- `impl/dotnet/src/MakrellSharp.Compiler/`
- `impl/dotnet/tests/MakrellSharp.Compiler.Tests/`
