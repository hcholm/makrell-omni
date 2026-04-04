# Compile-time Parity Review for `v0.10.0`

This note records the current compile-time parity picture for the three main
Makrell implementation tracks at the end of the `v0.10.0` consolidation pass.

It is not a claim of full parity. It is the release-oriented answer to:

- does compile-time Makrell feel real in each main track?
- does the shared `pipe` / `rpn` / `lisp` showcase exist publicly?
- what important gaps are still visible?

## Verification snapshot

Public showcase commands verified during this review:

```bash
# impl/py
python -m makrell.cli examples/macros/showcase.mr

# impl/ts
bun run src/cli.ts examples/macros/showcase.mrts

# impl/dotnet
dotnet run --project src/MakrellSharp.Cli -- examples/showcase.mrsh
```

Observed outputs:

- MakrellPy
  - `pipe_result = 64`
  - `rpn_result = 41`
  - `rpn_add_result = 13`
  - `lisp_result = 52`
  - `lisp_sum_squares = 38`
- MakrellTS
  - `pipeResult = 64`
  - `rpnResult = 41`
  - `rpnAddResult = 13`
  - `lispResult = 52`
  - `lispSumSquares = 38`
- Makrell#
  - `pipeResult = 64`
  - `rpnResult = 41`
  - `rpnAddResult = 13`
  - `lispResult = 52`
  - `lispSumSquares = 38`

## Review by track

## MakrellPy

Status: strongest current compile-time reference.

What is strong:

- public macro showcase exists in `impl/py/examples/macros/showcase.mr`
- macros, `meta`, and runtime interop still feel the most natural here
- the showcase examples demonstrate:
  - syntax reshaping through `pipe`
  - postfix-to-AST transformation through `rpn`
  - language embedding through `lisp`

Release judgement:

- credible for `v0.10.0`
- still the benchmark for compile-time ergonomics in the family

## MakrellTS

Status: credible public compile-time story with the shared showcase now aligned.

What is strong:

- public macro showcase exists in `impl/ts/examples/macros/showcase.mrts`
- the checked-in showcase now runs through the actual CLI
- the TypeScript track clearly supports real macro-driven structural rewriting
- browser/tooling integration makes this track especially important for the
  future editor and playground story

Release judgement:

- credible for `v0.10.0`
- the shared public `pipe` / `rpn` / `lisp` showcase now lines up with the
  other main tracks for the current examples
- still not the final word on full compile-time parity, but no longer carrying
  the visible `rpn` mismatch from the earlier review

## Makrell#

Status: clearly improved and now credible for `v0.10.0`.

What is strong:

- public macro showcase exists in `impl/dotnet/examples/showcase.mrsh`
- the showcase runs through the packaged CLI workflow
- compile-time `match`, `~=`, and `!~=` now work in `meta`/macro code
- the public showcase is commented and usable as a learning example

Important current gap:

- Makrell# compile-time execution still relies on a bespoke meta evaluator in
  places
- that means the track is stronger than before, but the architecture is not yet
  where the family wants it to be long-term

Release judgement:

- credible for `v0.10.0`
- much improved
- still carrying an architectural parity gap that is documented rather than
  resolved

## Family-level judgement

For `v0.10.0`, the shared `pipe` / `rpn` / `lisp` macro showcase now exists
publicly in all three main implementation tracks and can be treated as part of
the release story.

That said, compile-time parity is still not “done”.

The main visible remaining gap is:

- Makrell# still has a meaningful architectural gap between compile-time and
  runtime execution machinery

## Release-level conclusion

The honest `v0.10.0` position is:

- compile-time Makrell is no longer obviously underpowered in the main tracks
- the shared public macro story is real
- parity is improved enough to be part of the release
- the remaining important gaps are now more architectural than showcase-level

## Follow-up direction

The next parity work after `v0.10.0` should probably focus on:

- continuing the Makrell# move away from a separate semantic engine for
  compile-time execution
- keeping the shared `pipe` / `rpn` / `lisp` showcase runnable as a regression
  surface in all three tracks
