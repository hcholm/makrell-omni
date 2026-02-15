
# Overview

# Syntax levels

Level 0: Tokenisation. Some tokens may have an expandable set of type specifiers, such as `42.3d` for decimal numbers `"2026-02-04T12:00:00Z"t` for timestamps, etc.
Level 1: Parsing into the three types of lists, "round" (parentheses `()`), "square" (square brackets `[]`), and "curly" (curly braces `{}`).
Level 2: Parsing binary expressions according to a give and expandable set of operator precedence rules.

# Common language features

Languages in the Makrell family should share a common set of features and capabilities, while allowing for language-specific syntax and idioms. The goal is to provide a consistent development experience across different languages, while also leveraging the strengths and conventions of each language.

Compilers should cover the full range of features in the target language or platform, except where redundant or not applicable. For example, a Makrell compiler targeting JavaScript should support JavaScript-specific features such as async/await and Promises, while a Makrell compiler targeting Python should support Python-specific features such as generators and context managers.

Where applicable and feasible, the following features should be supported across all languages:

- Support for parsing levels 0, 1, and 2 of the Makrell syntax specification.
- Support for MRON and MRML.
- Customisable compiler pipeline.
- Functional programming constructs.
- Implicit returns.
- Pattern matching with pluggable patterns.
- Type annotations with `:` operator, e.g. `x : int`.
- Hindley–Milner type inference.
- Other annotations and attributes with `'` operator, e.g. `{SomeAttribute} ' internal ' x`, etc.
- Support platform module imports with `{import ...}` syntax.
- Support including external files with `{include ...}` syntax, including macro definitions.
- Support for meta runtime context at compile time with `{meta ...}` syntax.
- Support for macros with `{macro ...}` syntax, implemented as functions in the meta context.
- Support for user-defined operators with `{operator ...}` syntax.

Parts of the compilers should be implemented in it's own language where possible after bootstrapping the basic compiler features.

Toolchain features:

- IDE integration with Language Server Protocol (LSP) support, including features such as:
    - Syntax highlighting.
    - Eerror reporting.
    - Code completion.
    - Code formatting.
    - Code navigation (e.g., go to definition, find references).
- Support for testing frameworks and tools, including:
    - Unit testing.
    - Integration testing.
    - Code coverage analysis.
    - Test runners and frameworks (e.g., Jest, PyTest).
- Debugging support for command line and IDE, including:
    - Integration with debugging tools (e.g., Chrome DevTools, Python Debugger).
    - Support for breakpoints, step-through debugging, and variable inspection.
- Support for documentation generation, including:
    - Integration with documentation tools (e.g., JSDoc, Sphinx).
    - Support for generating API documentation from code comments and annotations.
- Support for build tools and task runners, including:
    - Integration with build tools (e.g., Webpack, Gulp, Make).
    - Support for defining and running build tasks (e.g., compiling, testing, linting).
- Compilers should be distributed as standalone command-line tools, with support for installation via package managers (e.g., npm for JavaScript, pip for Python).

Old reference implementation is MakrellPy.
New reference implementation should be MakrellTS.

## MRON

## MRML

 
# Individual languages with native compilers

## MakrellPy

- Compiles to Python AST.
- Written in Python.
- Meta code runs in a separate Python context at compile time.
- Available as a Python package via pip.

## MakrellTS

- Compiles to JavaScript code and TypeScript declaration files.
- Written in TypeScript.
- TypeScript semantics, also for type checking and inference.
- Meta code runs in a separate JavaScript context at compile time.
- Available as an npm package.

## MakrellJ
- Compiles to JVM bytecode.
- Written in Kotlin.
- Meta code runs in a separate JVM context at compile time.
- Available as a JVM library via Maven Central.

## MakrellCSharp
- Compiles to C# CLR IL.
- Written in C#.
- Meta code runs in a separate, dynamic C# context at compile time.
- Available as a .NET library via NuGet.

# Individual languages compiled with MakrellTS

## MakrellPHP
- Compiles to PHP code.
- Written in MakrellTS.
- Meta code runs in a separate JS context at compile time.

## MakrellLlvm
- Compiles to LLVM IR.
- Written in MakrellTS.
- Meta code runs in a separate JS context at compile time.

## MakrellWasm
- Compiles to WebAssembly (Wasm) binary format.
- Written in MakrellTS.
- Meta code runs in a separate JS context at compile time.

## MakrellDart
- Compiles to Dart code.
- Written in MakrellTS.
- Meta code runs in a separate JS context at compile time.

## MakrellSwift
- Compiles to Swift code.
- Written in MakrellTS.
- Meta code runs in a separate JS context at compile time.

## MakrellC
- Compiles to C code.
- Written in MakrellTS.
- Meta code runs in a separate JS context at compile time.

## MakrellRust
- Compiles to Rust code.
- Written in MakrellTS.
- Meta code runs in a separate JS context at compile time.


# Ideas for libraries

- LINQ-like library for functional data manipulation.
- Pluggable COM moniker inspired syntax for accessing any data source, possibly with LINQ.
- Reactive programming library for building event-driven applications.
- More functional programming utilities and data structures.
- gRPC extensions.
- Go channels inspired concurrency primitives.
