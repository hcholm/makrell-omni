# Makrell Formats for Go

This directory hosts the Go MRON, MRML, and MRTD package.

Planned published module:

- `github.com/makrell/makrell-go/formats`

Current scope:

- public API surface
- tests
- examples
- Go module metadata
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- comments and identifier-as-string handling in MRON and MRTD
- deterministic XML-style MRML serialisation
- basic MRTD type support: `string`, `int`, `float`, `bool`
- explicit MBF level 0/1 implementation for the data formats, with level 2 reserved for later
- shared `basic suffix profile` support for MRON and MRTD, exposed explicitly via `ApplyBasicSuffixProfile(...)` as a post-L1 conversion layer

Current public model types:

- `ParseMronString(...)` returns native Go maps, slices, and scalar values
- `ParseMrmlString(...)` returns `MrmlElement`
- `ParseMrtdString(...)` returns `MrtdDocument`
- `ApplyBasicSuffixProfile(...)` exposes the shared suffix conversion layer directly for reuse by other format/language code
