---
name: makrell-code
description: Write and explain code in MakrellPy, MakrellTS, and Makrell#. Use when creating, editing, or understanding Makrell-family source files (.mrpy, .mrts, .mrsh).
allowed-tools: Read Grep Glob Edit Write Bash
---

# Makrell Code

You are helping in a project that uses one or more Makrell programming languages.
The Makrell family shares a common structural core (MBF) but targets different host ecosystems.

## Implementations

| Language   | Host        | File ext | CLI command     | Install                             |
|------------|-------------|----------|-----------------|--------------------------------------|
| MakrellPy  | Python      | `.mrpy`  | `makrell`       | `pip install makrell`               |
| MakrellTS  | JS/TS       | `.mrts`  | `makrellts`     | `bun add -g makrellts`              |
| Makrell#   | .NET / CLR  | `.mrsh`  | `makrellsharp`  | `dotnet tool install --global MakrellSharp.Cli` |

## Syntax Quick Reference

### Expressions, calls, and assignment

```makrell
2 + 3                           # infix operator
{add 2 3}                       # function call
x = 42                          # assignment
```

### Functions

```makrell
{fun add [x y]
    x + y}

add3 = {add 3 _}               # partial application with placeholder
```

### Pipes

```makrell
[2 3 5] | sum                   # forward pipe
sum \ [2 3 5]                   # reverse pipe
2 | {+ 3} | {* 5}              # operator-as-function in pipe
```

### Conditionals

```makrell
{if (x > 0) "positive" "non-positive"}

{cond
    (x > 0)  "positive"
    (x == 0) "zero"
    true     "negative"}
```

### Pattern matching

```makrell
{match value
    2
        "two"
    [x=_ y=_]
        x + y
    _:str
        "string"
    _
        "other"}
```

### Macros and meta

```makrell
{def macro twice [x]
    [{quote $x} {quote $x}]}

{meta
    greeting = {quote "Hello"}}

{def macro hello [ns]
    {quote {print {unquote greeting}}}}
```

### Async/await (all three tracks)

```makrell
{async fun fetchValue [value]
    {await {Promise.resolve value}}}      # MakrellTS

{async fun just_sleep [n]
    {await {asyncio.sleep n}}             # MakrellPy
    n + 2}
```

### Classes (MakrellPy)

```makrell
{class Point
    {fun __init__ [self x y]
        self.x = x
        self.y = y}
    {fun dist [self]
        {math.sqrt (self.x ** 2 + self.y ** 2)}}}
```

### Imports

```makrell
{import math}                             # MakrellPy: import module
{import math@[sin cos]}                   # MakrellPy: import names
{import System.Text}                      # Makrell#: import CLR namespace
{import System.Text@[Encoding]}           # Makrell#: import specific type
```

### CLR interop (Makrell# specific)

```makrell
{new StringBuilder ["Mak"]}
{sb.Append "rell#"}
{sb.ToString}
{new (list string) ["a" "b"]}            # generic types
{Enumerable.Repeat@(string) "ha" 3}      # explicit generic call
```

## Operator Precedence (high to low)

| Operator | Precedence | Description          |
|----------|------------|----------------------|
| `.`      | 200        | member access        |
| `**`     | 100        | exponentiation       |
| `*`, `/` | 90         | multiplication, div  |
| `+`, `-` | 80         | addition, subtraction|
| `|>`     | 40         | map-pipe             |
| `|`      | 30         | forward pipe         |
| `\`      | 30         | reverse pipe         |
| `==`,`!=`| 20         | equality             |
| `<`,`>`  | 20         | comparison           |
| `and`    | 15         | logical and          |
| `or`     | 10         | logical or           |
| `=`      | 5          | assignment           |

Operators are extensible via `{def operator}`.

## Guidelines

When writing Makrell code:

- **Use curly braces `{}` for calls**, not parentheses: `{f x y}` not `f(x, y)`
- **Use square brackets `[]` for lists and parameter lists**: `[2 3 5]`, `{fun f [x y] ...}`
- **Use pipes for data flow** — prefer `xs | {map f} | sum` over nested calls
- **Use `_` for partial application** — `{add 3 _}` creates a function awaiting one argument
- **Indent body forms** under their head — the indentation is significant for readability
- **Operators can be used as functions** — `{+ 3}` is a function that adds 3
- **Pattern matching replaces chains of if/else** — prefer `{match ...}` for structural dispatch
- **Prefer pipeline style** for sequential transformations

When explaining Makrell code:

- Relate to the user's host ecosystem (Python, JS/TS, or .NET)
- Point out which features are family-wide vs implementation-specific
- Note operator precedence when it affects expression grouping

## Documentation

- MakrellPy: https://makrell.dev/makrellpy/
- MakrellTS: https://makrell.dev/makrellts/
- Makrell#: https://makrell.dev/makrellsharp/
- Shared concepts: https://makrell.dev/concepts/
- Playground (MakrellTS): https://makrell.dev/playground/
