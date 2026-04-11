# Multi-Platform Format SDK Expansion

This note records the first concrete repo structure for expanding MRON, MRML,
and MRTD to additional host ecosystems beyond the current Python, TypeScript,
and .NET tracks.

## Scope

New scaffolded language tracks:

- `impl/jvm/`
- `impl/dart/`
- `impl/go/`
- `impl/rust/`
- `impl/php/`
- `impl/c/`
- `impl/cpp/`
- `impl/r/`
- `impl/haskell/`
- `impl/perl/`
- `impl/ruby/`
- `impl/lua/`

Each scaffold includes:

- serialiser and deserialiser entry points for MRON, MRML, and MRTD
- tests
- code examples
- package metadata for publication
- MIT licence metadata
- room for a future full Makrell/MBF layer rather than a dead-end format-only API

For the data-format SDKs, the intended MBF split is now explicit:

- MBF level 0: tokenisation and lexical structure
- MBF level 1: bracketed/nested node structure used by MRON, MRML, and MRTD
- MBF level 2: reserved for later operator/expression-aware growth and must have
  an implementation slot even where it is not enabled yet

## Shared API Direction

The intended shape across languages is:

- `Mron.parseString(...)`, `Mron.parseFile(...)`, `Mron.writeString(...)`
- `Mrml.parseString(...)`, `Mrml.parseFile(...)`, `Mrml.writeString(...)`
- `Mrtd.parseString(...)`, `Mrtd.parseFile(...)`, `Mrtd.writeString(...)`

Portable goals:

- align with native JSON/XML/CSV expectations in each host ecosystem
- preserve room for Makrell-specific extensions such as comments, trailing
  commas, richer scalar types, and profile-gated behaviour
- keep a future syntax-preserving layer possible without forcing breaking API
  redesign

## Native Model Mapping

- JVM: JSON-like object graph today, with room for Jackson/DOM adapters later
- Dart: `Map`/`List`, XML package integration later, row/object table model for MRTD
- Go: `map[string]any`, `[]any`, XML-marshallable document/tree adapters later
- Rust: `serde_json::Value` / XML tree adapter / typed row records later
- PHP: associative arrays / `DOMDocument` integration / tabular arrays
- C: explicit tree structs for values, elements, and tabular documents
- C++: `std::variant`/`std::map`/`std::vector` native model layer
- R: lists/vectors with package-level helpers
- Haskell: algebraic data types with `Map`-based object models
- Perl: hashes/arrays with explicit MBF token and node layers
- Ruby: hashes/arrays with explicit MBF token and node layers
- Lua: tables with explicit MBF token and node layers

## Shared Fixtures

Portable conformance fixtures live under `shared/format-fixtures/` and are meant
to be reused by all language tracks.

Initial fixtures:

- `shared/format-fixtures/mron/sample.mron`
- `shared/format-fixtures/mrml/sample.mrml`
- `shared/format-fixtures/mrtd/sample.mrtd`

These are intentionally small and human-readable so they can serve as:

- example input
- smoke-test input
- future conformance-suite seeds

There is now also a smaller shared `conformance/` subset aimed specifically at
MBF level 0/1 behaviour that the data-format SDKs should consume directly:

- identifier versus operator boundaries
- comments
- untyped MRTD headers
- invalid operator-shaped barewords

## Current Status

This repo change creates real package and test structure across the new targets,
with first actual implementation passes in Dart, on the JVM, in Rust, in PHP,
in Go, in C, in C++, in R, and in Haskell rather than pretending all the new
ecosystems are equally complete at once.

That means:

- package layout is now real
- package names and publication metadata are now explicit
- examples and tests are checked in
- Dart now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- JVM now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- Rust now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- PHP now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- Go now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- C now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- C++ now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- R now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- Haskell now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- Perl now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- Ruby now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- Lua now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- multiple tracks now consume shared MBF level 0/1 conformance fixtures rather than only local inline smoke cases

That is deliberate: it keeps the project honest while still turning the
expansion into concrete repository structure rather than an abstract wish list.
