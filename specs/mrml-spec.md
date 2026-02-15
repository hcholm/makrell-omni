# MRML Specification (Draft)

## 1. Scope

This document defines MRML semantics on top of MBF.

Normative MBF syntax is defined in `specs/mbf-spec.md`.

## 2. Element Form

Canonical element syntax:
- `{tag}` self-closing
- `{tag content...}` with children/text
- `{tag [attr1=v1 attr2=v2] content...}` with attributes

Element name MAY be identifier or string.

## 3. Attributes

Attribute block is optional first square-bracket block after tag name.

Attributes are parsed as `name = value` pairs.

Attribute values are serialized to string form.

## 4. Children and Text

Children may be nested elements (`{...}`) or text fragments.

Adjacent text fragments MUST be concatenated in document order.

## 5. Executable Embeds

If `allow_exec = true`, `{$ ...}` in content or attribute position MAY be evaluated and injected as text.

If `allow_exec = false`, executable embeds MUST NOT run.

## 6. Output

MRML implementations SHOULD provide deterministic XML/HTML output serialization.

## 7. Diagnostics and Errors

Minimum required parse/render errors:
- malformed element form (non-curly root element)
- malformed attribute expression
- malformed syntax inherited from MBF levels

## 8. Security Considerations

Execution-enabled MRML parsing is unsafe for untrusted input and MUST be treated as code execution.

## 9. Conformance Test Mapping

- `impl/py/tests/test_mrml.py`: element rendering, attributes, mixed content, execution embeds in content and attributes

## 10. Known Limitations

- Output is currently XML-serialization-oriented and may differ from browser HTML serialization details.
- Some text normalization/whitespace edge behavior is implementation-specific.

## 11. References

- `specs/mbf-spec.md`
- `impl/py/makrell/mrml.py`
- `impl/py/tests/test_mrml.py`
- `https://makrell.dev/`
