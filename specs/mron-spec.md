# MRON Specification (Draft)

## 1. Scope

This document defines MRON semantics on top of MBF.

Normative MBF syntax is defined in `specs/mbf-spec.md`.

## 2. Root Rules

Given root regularized nodes:
- 0 nodes -> `null`
- 1 node -> scalar/collection/object value
- even count (>1) -> object from key/value pairs
- odd count (>1) -> MUST raise error

## 3. Object Parsing

Object-like forms are parsed from key/value pairs:
- keys: identifiers or strings (and implementation-supported scalar keys)
- values: any MRON value

Curly blocks parse as nested objects.

## 4. Arrays

Square brackets parse to arrays/lists.

## 5. Scalars

Scalars include identifier text values, string/number literals with suffix conversions, and null/bool equivalents where language layer provides them.

## 6. Executable Embeds

If `allow_exec = true`, `{$ ...}` inside MRON MAY be evaluated as MakrellPy expression and substituted.

If `allow_exec = false`, executable embeds MUST NOT run.

## 7. Diagnostics and Errors

Minimum required parse errors:
- illegal root cardinality
- odd pair count for object-like pair parsing
- malformed syntax inherited from MBF levels

## 8. Security Considerations

Execution-enabled MRON parsing is unsafe for untrusted input and MUST be treated as code execution.

## 9. Conformance Test Mapping

- `impl/py/tests/test_mron.py`: root cardinality, object/list/scalar parsing, suffix conversion behavior, nested objects, execution embeds

## 10. Known Limitations

- Error typing is not yet fully standardized beyond message-level behavior.
- Execution embeds (`allow_exec`) are implementation-specific and tightly coupled to MakrellPy semantics.

## 11. References

- `specs/mbf-spec.md`
- `impl/py/makrell/_mron_py.py`
- `impl/py/tests/test_mron.py`
- `https://makrell.dev/`
