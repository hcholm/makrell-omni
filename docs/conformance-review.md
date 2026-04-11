# Format Conformance Review

## Purpose

This note records the current `v0.10.0` conformance picture for the family
data formats:

- MRON
- MRML
- MRTD

It is not trying to claim full behavioural identity across all tracks. It is
meant to make the current mirrored coverage visible and to show where parity is
already strong versus where it is still evolving.

## Summary

### MRON

- **MakrellPy** has dedicated parser tests in `impl/py/tests/test_mron.py`.
- **Makrell#** has dedicated parser tests in
  `impl/dotnet/tests/MakrellSharp.Mron.Tests/MronParserTests.cs` and CLI
  coverage in `impl/dotnet/tests/MakrellSharp.Cli.Tests/MakrellSharpCliTests.cs`.
- **MakrellTS** does not yet have a checked-in MRON parser/runtime surface
  comparable to the Py and `.NET` tracks.

Current parity judgement:

- Py and `.NET` are meaningfully mirrored for the current release surface.
- TS is still **evolving** here rather than part of the parser-level parity
  story.

Covered behaviours in Py and `.NET`:

- empty/root-null handling
- scalar roots
- illegal root cardinality rejection
- arrays
- simple objects
- nested objects
- quoted keys and non-ASCII identifiers
- scalar suffix handling such as `dt`

Known difference:

- MakrellPy still supports executable embeds for MRON via `allow_exec=True`,
  while Makrell# currently rejects exec embeds as not yet implemented.

### MRML

- **MakrellPy** has dedicated parser tests in `impl/py/tests/test_mrml.py`.
- **Makrell#** has dedicated parser tests in
  `impl/dotnet/tests/MakrellSharp.Mrml.Tests/MrmlParserTests.cs` and CLI
  coverage in `impl/dotnet/tests/MakrellSharp.Cli.Tests/MakrellSharpCliTests.cs`.
- **MakrellTS** does not yet have a checked-in MRML parser/runtime surface
  comparable to the Py and `.NET` tracks.

Current parity judgement:

- Py and `.NET` are meaningfully mirrored for the current release surface.
- TS is still **evolving** here rather than part of the parser-level parity
  story.

Covered behaviours in Py and `.NET`:

- simple elements
- content and mixed content
- attributes
- attributes combined with content
- whitespace-sensitive content handling

Known difference:

- MakrellPy supports executable embeds for MRML via `allow_exec=True`,
  while Makrell# currently rejects exec embeds as not yet implemented.

### MRTD

- **MakrellPy** has dedicated tests in `impl/py/tests/test_mrtd.py`.
- **MakrellTS** has dedicated MRTD coverage in `impl/ts/tests/unit/index.test.ts`.
- **Makrell#** has dedicated parser and typed tests in
  `impl/dotnet/tests/MakrellSharp.Mrtd.Tests/MrtdParserTests.cs` and
  `impl/dotnet/tests/MakrellSharp.Mrtd.Tests/MrtdTypedTests.cs`, plus CLI
  coverage in `impl/dotnet/tests/MakrellSharp.Cli.Tests/MakrellSharpCliTests.cs`.

Current parity judgement:

- MRTD is the strongest truly shared family-format parity story right now.
- All three main implementation tracks cover the core syntax.

Covered behaviours across the three tracks:

- typed headers
- untyped headers
- quoted header names and values
- multiline rows
- row-width mismatch rejection
- typed/object mapping
- tuple mapping
- write helpers
- shared basic suffix profile

Known difference:

- MakrellTS currently writes `Date` values as full ISO timestamps with `dt`,
  while the Py and `.NET` examples/tests are still centred on date-shaped
  values. This is acceptable for `v0.10.0`, but it is still a useful
  cross-track formatting detail to keep visible.

## Release-level judgement

For `v0.10.0`, the honest conformance story is:

- MRON:
  - strong shared coverage in MakrellPy and Makrell#
  - not yet a MakrellTS parser-parity area
- MRML:
  - strong shared coverage in MakrellPy and Makrell#
  - not yet a MakrellTS parser-parity area
- MRTD:
  - real family-wide format coverage across MakrellPy, MakrellTS, and Makrell#

That is strong enough for the release as long as the docs continue to describe
MRON and MRML in MakrellTS as **evolving** rather than implying a parser
feature parity that does not exist yet.
