# Makrell async/await model

This note records the cross-language async/await direction for the Makrell
family.

It is not yet a final normative spec for every host detail. It is the shared
design and `v0.10.0` requirement that should guide MakrellPy, MakrellTS, and
Makrell# work.

## Goal

Makrell should support asynchronous programming across the main implementation
tracks in a way that:

- follows Makrell syntactic conventions
- feels like one language family rather than three unrelated host surfaces
- maps naturally to Python coroutines, JavaScript/TypeScript promises, and
  `.NET` tasks

## Core syntactic rule

Async forms should use ordinary Makrell reserved-form structure, not ad hoc
host-language syntax copied directly into the surface language.

The core forms are:

- `{async fun ...}`
- `{await expr}`

These already fit current Makrell conventions well:

- the construct stays one MBF node
- the reserved word appears in normal Makrell curly-form position
- the surface remains close to existing forms such as `{fun ...}` and
  `{match ...}`

## Core cross-language forms

The following should be treated as the core shared async surface for the family:

### Async function

```mbf
{async fun fetch-value [id]
  ...}
```

Meaning:

- MakrellPy: async Python function
- MakrellTS: async JS/TS function returning a `Promise`
- Makrell#: async method/function returning `Task` / `Task<T>` (or a closely
  related task-like type where documented)

### Await

```mbf
{await {fetch-value 42}}
```

Meaning:

- await an awaitable/promise/task according to the host runtime

This should remain a normal Makrell reserved form rather than introducing a
special infix or host-copied token sequence.

## Extended host-shaped forms

Some async constructs may be shared where the host model is close enough, but
they should be treated more carefully than the two core forms above.

Candidates:

- `{async for ...}`
- `{async with ...}`

Current guidance:

- MakrellPy already has these forms and they fit Python naturally
- MakrellTS and Makrell# should only adopt them where the mapping is clear and
  still feels like Makrell rather than a strained host imitation

For now:

- `async fun` and `await` are the priority shared requirement
- `async for` and `async with` are desirable, but may remain host/profile
  specific until their cross-language shape is clearer

## Portability model

Using the portability terminology elsewhere in Makrell:

- `Core`
  - `{async fun ...}`
  - `{await expr}`
- `Profile`
  - `{async for ...}`
  - `{async with ...}`
  - host-specific async helpers or task/promise interop conventions
- `Application`
  - framework-specific async wrappers or local helper conventions

This keeps the family-wide async story clean while still allowing host-specific
power where it makes sense.

## Host mappings

### MakrellPy

MakrellPy already has the strongest current async support.

Existing surface:

- `{async fun ...}`
- `{await expr}`
- `{async for ...}`
- `{async with ...}`

MakrellPy should remain the reference for the Makrell-shaped async surface, but
the family should avoid making Python-only async constructs the assumed baseline
for every host.

### MakrellTS

MakrellTS should gain async/await support for `v0.10.0`.

Minimum target:

- async function definitions
- await expressions
- promise-based runtime mapping

Desired mapping:

- `{async fun ...}` -> `async function ...`
- `{await expr}` -> `await expr`

The MakrellTS browser and playground work makes this especially valuable,
because async is a natural part of browser APIs and future compile-time/runtime
tooling.

### Makrell#

Makrell# should also gain async/await support for `v0.10.0`.

Minimum target:

- async function/method definitions
- await expressions
- natural mapping to `Task` / `Task<T>`

Desired mapping:

- `{async fun ...}` -> async C# method/function form
- `{await expr}` -> `await expr`

If additional forms such as `async foreach` are added later, they should still
be shaped through Makrell conventions rather than copied mechanically from C#.

## `v0.10.0` requirement

For `v0.10.0`, async/await should be treated as a release requirement rather
than a future curiosity.

Minimum release target:

- MakrellPy, MakrellTS, and Makrell# all support:
  - `{async fun ...}`
  - `{await expr}`
- the syntax is documented as a shared family feature
- examples and tests exist in all three tracks
- any remaining host-specific async constructs are clearly marked as such

## Non-goals

This note does not require `v0.10.0` to solve every async question, such as:

- cancellation models
- async streams parity across all hosts
- structured concurrency design
- framework-specific event loop / scheduler abstractions
- compile-time async execution rules

Those can be addressed later once the shared core syntax is in place.

## Design rule

Async support must follow Makrell syntactic conventions.

That means:

- prefer one-node Makrell forms
- avoid importing raw host syntax as surface syntax
- keep the shared async surface small and legible
- let host differences appear in semantics and documented profiles, not in a
  fractured top-level syntax
