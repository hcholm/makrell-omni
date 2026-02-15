# MakrellPy Specification (Draft)

## 1. Scope

This document defines MakrellPy semantics on top of MBF.

Normative MBF syntax is defined in `specs/mbf-spec.md`.

## 2. Core Data and Constants

Reserved literals:
- `true` -> boolean true
- `false` -> boolean false
- `null` -> null/None

Container literals:
- `[]` list
- `(x)` parenthesized expression
- `(x y ...)` tuple
- `{...}` call/special form depending on head

## 3. Function Call and Partial Application

Curly form `{f a b}` calls function `f` with arguments `a`, `b`.

If `_` appears in call arguments, the expression MUST be compiled as a lambda with generated placeholder parameters.

Examples:
- `{add 2 _}`
- `{mul_xyz _ 2 _}`

## 4. Implicit Return

Functions and `do` blocks SHOULD return the value of their final expression unless an explicit `{return ...}` is used.

## 5. Reserved Curly Forms

The following reserved forms are implemented:
- `{if ...}`
- `{when ...}`
- `{while ...}`
- `{fun name [args] ...}`
- `{class Name [bases/keywords] ...}`
- `{dataclass Name field:type ...}`
- `{for target iterable ...}`
- `{import ...}` and `{importm ...}`
- `{include "path"}`
- `{return ...}`
- `{yield ...}` and `{yieldfrom ...}`
- `{raise ...}`
- `{try ... {catch ...} {else ...} {finally ...}}`
- `{with expr var ...}`
- `{del x}`
- `{assert cond [message]}`
- `{pass}` `{break}` `{continue}` `{global ...}` `{nonlocal ...}`
- `{async fun ...}` `{async for ...}` `{async with ...}` `{await expr}`
- `{dict ...}` `{set ...}` `{slice ...}`
- `{do ...}`
- `{meta ...}`
- `{quote ...}`
- `{def macro ...}`
- `{def operator ...}`
- `{def pattern ...}`
- `{def strsuffix ...}`
- `{def intsuffix ...}`
- `{def floatsuffix ...}`

## 6. Binary Operator Semantics

In addition to standard arithmetic/comparison/logical operators, MakrellPy defines:
- `|`: pipe (`a | f` rewrites to `{f a}`)
- `\\`: reverse pipe (`f \\ a` rewrites to `{f a}`)
- `|*`: map pipe (`values |* f`)
- `*\\`: reverse map pipe (`f *\\ values`)
- `->`: lambda construction
- `@`: indexing/subscript
- `..`: slice range helper
- `.`: attribute access
- `=`: assignment
- `~=` / `!~=`: pattern match / negated pattern match

## 7. User-defined Operators

`{def operator OP PRECEDENCE [rightassoc] BODY}` MUST:
- register operator precedence and associativity
- compile operator use to a callable over `$left`, `$right`

## 8. Meta and Macros

`{meta ...}` runs at compile time in meta context.

`{def macro name [nodes] ...}` defines compile-time transformation functions.

`{quote ...}` returns AST-like node values; `{unquote ...}` and `{$ ...}` unquote inside quote context.

`quote` forms:
- `{quote x}` returns one quoted node/value.
- `{quote x y ...}` returns a list of quoted nodes/values.
- Nested quote semantics:
  - nested `{quote ...}` is processed recursively
  - `{unquote ...}` and `{$ ...}` apply only at the current quote level
  - unquote forms inside deeper nested quotes are preserved as syntax nodes until that quote level is evaluated

`def pattern`:
- Form: `{def pattern NAME CAN_HANDLE MAKE_TEST}`
- `CAN_HANDLE` MUST compile/evaluate to a callable `(pattern_node) -> bool`.
- `MAKE_TEST` MUST compile/evaluate to a callable `(testval, pattern, next) -> [test_node bindings]`.
- A defined pattern is prepended to the runtime `_match_pattern_types` registry.

Built-in regular pattern type (`$r`):
- Form: `[$r ...parts]`
- `$r` matches list/sequence shapes using regular-style composition.
- Supported part forms:
  - literal/pattern node: one item matching existing pattern semantics
  - `_`: wildcard item
  - `$rest`: sequence tail capture
  - alternatives: `[| p1 p2 ...]`
  - quantifiers:
    - exact repetition: `[n* patt]`
    - range repetition: `[(a..b)* patt]`
    - aliases: `[$maybe patt]`, `[$some patt]`, `[$any patt]` and `[maybe patt]`, `[some patt]`, `[any patt]`
- Regular subpatterns MAY be nested.
- Binding form `name=pattern` MUST be accepted inside regular parts and participate in match bindings.

Built-in constructor/type destructuring pattern (`$type`):
- Form: `{$type T}`
- Positional form: `{$type T [p1 p2 ...]}`
- Keyword form: `{$type T [field1=p1 field2=p2 ...]}`
- Mixed form: `{$type T [p1 ...] [field1=p1 ...]}`
- Semantics:
  - must match values whose runtime type is compatible with `T`
  - positional matching uses `__match_args__` when available, with dataclass field-order fallback
  - keyword matching tests named attributes
  - all provided positional and keyword constraints MUST hold

Suffix definition forms:
- `{def strsuffix SUFFIX TRANSFORM}`
- `{def intsuffix SUFFIX TRANSFORM}`
- `{def floatsuffix SUFFIX TRANSFORM}`

For each suffix form:
- `TRANSFORM` MUST compile/evaluate to a callable.
- The callable receives the literal lexeme body as a string.
- The callable MAY return a Python AST expression.
- The callable MAY return a Makrell node (which is recompiled).
- The callable MAY return a plain runtime value (wrapped as constant).
- User-defined suffixes override defaults for the same suffix key in the current compiler context.

Meta callable dispatch:
- Curly head expressions that resolve to meta symbols (including dotted access like `{tool.expand ...}`) are evaluated at compile time and may return node(s) for further compilation.

## 9. Include

`{include "path"}` and include expansion mechanisms are implementation-defined and MUST document path resolution behavior.

## 10. Diagnostics and Errors

Implementations SHOULD classify diagnostics with severity levels (`Hint`, `Info`, `Warning`, `Error`) and include source position when available.

Minimum required compile/parse errors:
- unknown operator at compile stage
- mismatched or incomplete bracket structures from MBF levels

## 11. Security Considerations

The following features execute code and MUST be disabled for untrusted input unless explicitly sandboxed:
- meta execution (`meta`)
- macro expansion functions
- include/import behavior

## 12. Conformance Test Mapping

The following test files act as the primary executable conformance suite for current MakrellPy behavior:
- `impl/py/tests/makrellpy/test_simple.py`: scalar literals, suffix basics, arithmetic, comparison, logical behavior
- `impl/py/tests/makrellpy/test_mr_tests.py`: runs `.mr` scenario suites under `impl/py/tests/makrellpy/`
- `impl/py/tests/makrellpy/test_funcs.mr`: functions, lambdas, lexical scope, `do`, call forms
- `impl/py/tests/makrellpy/test_special_constructs.mr`: partial application, pipe/reverse pipe/map pipe, operator-as-function
- `impl/py/tests/makrellpy/test_classes.mr`: class definitions, inheritance, metaclass support
- `impl/py/tests/makrellpy/test_flow.mr`: conditional forms
- `impl/py/tests/makrellpy/test_coroutines.mr`: `async`/`await`
- `impl/py/tests/makrellpy/test_meta.mr`: quoting, unquoting, meta execution, macros
- `impl/py/tests/makrellpy/test_patmatch.mr`: pattern matching semantics
- `impl/py/tests/makrellpy/test_missing_features.py`: user-defined suffixes, user-defined patterns, dotted meta callable dispatch

An implementation claiming MakrellPy conformance SHOULD pass these tests (or equivalent language-port tests that assert identical semantics).

## 13. Known Limitations

Current known limitations in the Python reference implementation:
- Remaining gaps are primarily test breadth/documentation depth rather than missing core features.

## 14. References

- `specs/mbf-spec.md`
- `impl/py/makrell/makrellpy/_compile.py`
- `impl/py/makrell/makrellpy/_compile_binop.py`
- `impl/py/makrell/makrellpy/_compile_curly_reserved.py`
- `impl/py/tests/makrellpy/`
