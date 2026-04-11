# Shared Format Fixtures

These fixtures are intended to be shared across MRON, MRML, and MRTD
implementations in different host languages.

The first purpose is smoke testing and API wiring. The second purpose is to
grow into a real cross-language conformance set over time.

Current fixture groups:

- `mron/`
- `mrml/`
- `mrtd/`
- `conformance/`

The `conformance/` group is for smaller cross-language MBF level 0/1 cases that
multiple MRON/MRML/MRTD implementations should consume directly in tests.

Those cases are now used by multiple SDK tracks to check:

- identifier versus operator boundaries
- comments at the data-format level
- negative number handling
- untyped MRTD header preservation
- malformed bracket rejection
- shared rejection behaviour for invalid MBF level 0/1 input
