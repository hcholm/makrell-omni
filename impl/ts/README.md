# MakrellJs (`jsport1`)

MakrellJs is a Bun + TypeScript Makrell-to-JS port with JS semantics.

## Status

This is an MVP compiler/runtime focused on:

- Makrell-like syntax (`{...}`, `[...]`, binary operators)
- JavaScript code generation
- compile-time macros written in MakrellJs (`{def macro ...}`)
- implicit return values in function bodies
- pattern matching (`{match ...}`) inspired by MakrellPy

## Install

```bash
cd jsport1
bun install
```

## Run a file

```bash
bun src/cli.ts examples/hello.mrjs
```

Emit generated JS:

```bash
bun src/cli.ts examples/hello.mrjs --emit-js
```

## Macros (MakrellJs)

Macros are authored in MakrellJs and run at compile time:

```clojure
{def macro inc [ns]
  n = {regular ns}@0
  {quote {$ n} + 1}
}

{inc 41}
```

Supported macro-time helpers include `regular`, `operator_parse`, `parse`, `len`, `range`, `map`, `list`, `assert`, and node constructors like `Identifier`, `BinOp`, `SquareBrackets`.
List-friendly helpers include `first`, `rest`, `reversed`, `push`, and `pop`.

`quote` / `unquote` are supported with `{quote ...}` and `{$ ...}`. Multi-node `quote` output is supported for statement-emitting macros.

## Pattern matching

Supported in `{match value pattern result ...}`:

- `_` wildcard
- `$` self-truthy
- literals (`2`, `"x"`, `true`, `null`)
- list patterns (`[_ _:int]`)
- `|` and `&`
- type patterns (`_:str`, `_:int`, `_:Point`)
- expression-like binop patterns using `$` (e.g. `$ > 3`, `$.x < 5`)

## Notes

- This is not a direct one-to-one port of MakrellPy.
- Semantics are intentionally JavaScript-first.
- Macro execution is implemented in the language evaluator (no Node-only API requirement), so it works in browser and Node environments.
