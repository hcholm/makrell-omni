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

Each scaffold includes:

- serialiser and deserialiser entry points for MRON, MRML, and MRTD
- tests
- code examples
- package metadata for publication
- MIT licence metadata
- room for a future full Makrell/MBF layer rather than a dead-end format-only API

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

## Current Status

This repo change creates real package and test structure across the new targets,
with first actual implementation passes in Dart, on the JVM, in Rust, in PHP,
and in Go rather than pretending all five new ecosystems are equally complete
at once.

That means:

- package layout is now real
- package names and publication metadata are now explicit
- examples and tests are checked in
- Dart now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- JVM now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- Rust now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- PHP now has a first working core parser/serialiser pass for MRON, MRML, and MRTD
- Go now has a first working core parser/serialiser pass for MRON, MRML, and MRTD

That is deliberate: it keeps the project honest while still turning the
expansion into concrete repository structure rather than an abstract wish list.
