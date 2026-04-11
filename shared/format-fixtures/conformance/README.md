# MBF Level 0/1 Conformance Cases

These cases are the start of a shared conformance set for data-format SDKs that
target MBF level 0 and level 1.

Current scope:

- identifier versus operator boundaries
- comments
- nested bracket structure as exercised through MRON and MRTD
- MRTD typed and untyped header handling
- rejection cases that must fail before any level 2 operator semantics are applied

The intent is that MRON, MRML, and MRTD implementations in additional host
languages should consume the same source cases rather than re-encoding them as
ad hoc inline smoke-test strings.

Current groups:

- `mron/comments-and-identifiers.mron`
- `mron/hyphenated-bareword.invalid.mron`
- `mrtd/untyped-headers.mrtd`
- `mrtd/hyphenated-bareword.invalid.mrtd`
