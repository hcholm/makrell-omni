# MakrellPy

`impl/py` contains the Python implementation track for Makrell.

Status:
- Actively maintained for compatibility and ecosystem continuity.
- No longer the reference implementation; MakrellTS in `impl/ts` is the reference.

Website and documentation: **[makrell.dev](https://makrell.dev)**

## Quick start

### Installation

```bash
pip install makrell
```

### Run tests

```bash
python -m pytest
```

### MakrellPy REPL usage

```bash
makrell
> 2 + 3
5
> [2 3 5] | sum
10
```

### Run a MakrellPy script

```bash
makrell myscript.mr
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
- LSP support

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

## Makrell Base Format (MBF)

MBF supports identifiers, strings, numbers, bracketed lists (`()`, `[]`, `{}`), operators, comments, and binary expressions.

## Relationship to MakrellTS

MakrellTS (`impl/ts`) is the reference implementation for ongoing language evolution.
MakrellPy remains important for parity testing, interoperability checks, and existing Python-based workflows.

## Licence

Makrell is developed by Hans-Christian Holm and licensed under the MIT licence. See [LICENSE](../../LICENSE) for details.
