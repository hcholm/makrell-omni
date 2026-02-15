# Makrell Base Format Specification (Draft)

## 1. Scope and Conformance

This document defines Makrell Base Format (MBF) requirements as of February 15, 2026.

Requirement keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** follow RFC 2119.

A conforming MBF implementation MUST declare support for:
- Level 0: tokenization
- Level 1: bracket/list parsing
- Level 2: binary operator parsing

## 2. MBF Overview

MBF defines syntax levels shared by Makrell-family languages (`MakrellPy`, `MRON`, `MRML`).

## 3. MBF Level 0: Tokenization

A Level 0 tokenizer MUST process UTF-8 source text and produce an ordered token stream with source positions (`start_line`, `start_column`, `end_line`, `end_column`).

### 3.1 Token Classes

A tokenizer MUST classify input into:
- `Whitespace`
- `Comment`
- `Identifier`
- `String`
- `Number`
- `LPar` (opening bracket)
- `RPar` (closing bracket)
- `Operator`
- `Unknown`

### 3.2 Identifier

An identifier MUST:
- start with Unicode letter (`\p{L}`), `_`, or `$`
- continue with zero or more Unicode letters, Unicode numbers (`\p{N}`), `_`, or `$`

### 3.3 String Literal

A string literal MUST:
- begin and end with `"`
- allow escaped characters via backslash
- optionally include a suffix immediately after the closing quote

Examples:
- `"abc"`
- `"2026-02-04"dt`
- `"ff"hex`

### 3.4 Number Literal

A number literal MUST match:
- optional leading `-`
- digits with optional fractional and exponent parts
- optional suffix immediately after numeric body

Examples:
- `42`
- `13.5`
- `-5.7e-55`
- `2.5M`
- `2pi`

### 3.5 Brackets

Opening brackets: `(` `[` `{`

Closing brackets: `)` `]` `}`

### 3.6 Operator

An operator token is a contiguous symbol sequence (non-alphanumeric operator-like symbols), excluding characters reserved for strings/comments/identifier starts in tokenization rules.

Examples:
- `+`
- `==`
- `|*`
- `<*>`

### 3.7 Comments

Two comment forms MUST be supported:
- line comment: `# ...` until end-of-line
- block comment: `/* ... */`

### 3.8 Unknown

Any non-whitespace sequence that does not match prior token rules MUST be emitted as `Unknown`.

## 4. MBF Level 1: Bracket Parsing

Level 1 parsers MUST transform flat tokens into nested bracket nodes.

### 4.1 Sequence Node Kinds

The parser MUST support:
- `RoundBrackets` for `( ... )`
- `SquareBrackets` for `[ ... ]`
- `CurlyBrackets` for `{ ... }`
- root `Sequence`

### 4.2 Nesting and Matching

Parsers MUST:
- preserve nesting structure
- reject mismatched closing brackets
- report unmatched opening brackets as incomplete input diagnostics

### 4.3 Regularization

Implementations MAY provide a helper that filters out `Whitespace`, `Comment`, and `Unknown` nodes for semantic processing.

### 4.4 E-Strings

A string with suffix `e` MUST be treated as an interpolated expression string by implementations that support this feature (MakrellPy does). Embedded `{...}` segments are parsed as expressions and concatenated with string segments.

## 5. MBF Level 2: Binary Operator Parsing

Level 2 parsers MUST transform regularized node sequences into binary operation trees (`BinOp`) using precedence and associativity.

### 5.1 Default Operator Table

Default precedence/associativity (higher binds tighter):

| Operator(s) | Precedence | Associativity |
|---|---:|---|
| `=` | 0 | right |
| `|`, `|*` | 20 | left |
| `\\`, `*\\` | 20 | right |
| `->` | 30 | right |
| `||`, `&&` | 45 | left |
| `==`, `!=`, `<`, `>`, `<=`, `>=`, `~=`, `!~=` | 50 | left |
| `..` | 90 | left |
| `+`, `-` | 110 | left |
| `*`, `/`, `%` | 120 | left |
| `**` | 130 | right |
| `@` | 140 | left |
| `.` | 200 | left |

Unknown operators default to precedence `0`, left-associative, unless overridden by language-specific rules.

### 5.2 Extensibility

Language implementations MAY extend operator precedence tables (MakrellPy does via `def operator`).

## 6. Core Literal Value Mapping

This section defines currently supported literal conversion semantics in the Python reference implementation.

### 6.1 String Suffixes

Supported suffixes:
- `dt`: ISO datetime (`datetime.fromisoformat`)
- `bin`: parse as base-2 integer
- `oct`: parse as base-8 integer
- `hex`: parse as base-16 integer
- `regex`: compile to regex object
- empty suffix: plain string

### 6.2 Number Suffixes

Supported suffixes:
- `k`, `M`, `G`, `T`, `P`, `E`: scale by powers of 10^3
- `i`: imaginary component (complex)
- `e`: multiply by Euler's number
- `tau`: multiply by tau
- `deg`: degrees to radians
- `pi`: multiply by pi
- empty suffix: int/float standard numeric value

Implementations targeting non-Python runtimes MAY map these suffixes differently but MUST document exact behavior.

## 7. Conformance Test Mapping

- `impl/py/tests/test_tokeniser.py`: MBF Level 0 tokenization rules (including Unicode and suffix token capture)
- `impl/py/tests/test_parsing.py`: shared parsing helper semantics (`flatten`)
- `impl/py/tests/test_mron.py`: MBF structural behavior exercised through MRON parsing paths
- `impl/py/tests/test_mrml.py`: MBF structural behavior exercised through MRML parsing paths

## 8. Known Limitations

- The Python tokenizer emits `Unknown` tokens for unmatched symbol classes, but exact cross-runtime behavior is not yet standardized.
- Some lexical/operator edge cases are implementation-defined and not fully covered by standalone MBF tests.

## 9. References

- `impl/py/makrell/tokeniser.py`
- `impl/py/makrell/baseformat.py`
- `impl/py/makrell/parsing.py`
- `https://makrell.dev/`
