# MakrellPy

`impl/py` contains the Python implementation track for Makrell.

Status:
- Actively maintained for compatibility and ecosystem continuity.
- No longer the reference implementation; MakrellTS in `impl/ts` is the reference.

Website and documentation: **[makrell.dev](https://makrell.dev)**

Current editor workflow: [`../../vscode-makrell/README.md`](../../vscode-makrell/README.md)

## Quick start

### Installation

```bash
pip install makrell
```

Package smoke check from a built artefact:

```bash
python -m build
python -m venv .pack-smoke
.pack-smoke\Scripts\python.exe -m pip install <wheel-file-from-dist>
.pack-smoke\Scripts\makrellpy.exe --help
.pack-smoke\Scripts\makrellpy-langserver.exe --help
```

### Run tests

```bash
cd impl/py
python -m pytest
```

### MakrellPy REPL usage

```bash
makrellpy
> 2 + 3
5
> [2 3 5] | sum
10
```

### Run a MakrellPy script

```bash
makrellpy myscript.mrpy
```

## MakrellPy by example

### Syntax

```mbf
# This is a comment.
a = 2
b = a + 3
{sum [a b 5]}  # function call
[a b 5] | sum  # function call by pipe operator
sum \ [a b 5]  # function call by reverse pipe operator

# Conditional expression
{if a < b
    "a is less than b"
    "a is not less than b"}

# Function definition
{fun add [x y]
    x + y}

# Partial application
add3 = {add 3 _}
{add3 5}  # 8

# Pattern matching
{match a
    2
        "two"
    [_ 3|5]
        "list with two elements, second is 3 or 5"
    _:str
        "a string"
    _
        "something else"
}
```

### Other features

See `examples/` and `tests/` for:
- Class definitions
- String interpolation
- Async/await
- Functional programming utilities
- Metaprogramming and macros
- Python interoperability
- editor/LSP support

### Async/await

MakrellPy is still the strongest current reference for the broader Makrell
async surface.

Shared family baseline:

- `{async fun ...}`
- `{await expr}`

MakrellPy also has Python-shaped extensions such as:

- `{async for ...}`
- `{async with ...}`

Checked-in examples:

- `examples/makrellpy/coroutines.mrpy`
- `examples/makrellpy/async_for.mrpy`
- `examples/makrellpy/async_with.mrpy`

Run the coroutine example from `impl/py/`:

```bash
makrellpy examples/makrellpy/coroutines.mrpy
```

### Macro showcase

One of the nicest current MakrellPy showcase examples is:

- `examples/macros/showcase.mrpy`

It collects three small macros that are worth surfacing for `v0.10.0`:

- `pipe`
  - reshapes a sequence of forms into pipeline style
- `rpn`
  - turns postfix input into ordinary Makrell AST
- `lisp`
  - hosts a Lisp-like round-bracket notation inside Makrell

Run it:

```bash
makrellpy examples/macros/showcase.mrpy
```

```bash
makrellpy check examples/macros/showcase.mrpy --json
```

These are good examples not because they are large, but because they show three
different macro uses: ergonomic rewriting, alternative notation, and language
embedding.

## MRON example

```mbf
owner "Rena Holm"
last_update "2023-11-30"

books [
    {
        title  "That Time of the Year Again"
        year   1963
        author "Norton Max"
    }
    {
        title  "One for the Team"
        year   2024
        author "Felicia X"
    }
]
```

## MRML example

```mbf
{html
    {head
        {title A Test}
    }
    {body
        {h1 This is a Test}
        {p [style="color: red"] Just some {b bold} text here.}
    }
}
```

## MRTD example

```mrtd
name:string age:int active:bool
Ada 32 true
"Rena Holm" 29 false
```

Python API:

```python
from makrell.mrtd import parse_src, read_records, read_tuples, write_records

doc = parse_src("""
name:string age:int active:bool
Ada 32 true
Ben 41 false
""")

records = read_records("""
name:string age:int active:bool
Ada 32 true
Ben 41 false
""")
```

Profile example:

```python
from makrell.mrtd import parse_src

doc = parse_src("""
when bonus
"2026-04-03"dt 3k
""", profiles=("extended-scalars",))
```

## Makrell Base Format (MBF)

MBF supports identifiers, strings, numbers, bracketed lists (`()`, `[]`, `{}`), operators, comments, and binary expressions.

## Relationship to MakrellTS

MakrellTS (`impl/ts`) is the reference implementation for ongoing language evolution.
MakrellPy remains important for parity testing, interoperability checks, and existing Python-based workflows.
For the current editor workflow across MakrellPy, MakrellTS, Makrell#, MRON,
MRML, and MRTD, see [`../../vscode-makrell/README.md`](../../vscode-makrell/README.md).

## Licence

Makrell is developed by Hans-Christian Holm and licensed under the MIT licence. See [LICENSE](../../LICENSE) for details.
