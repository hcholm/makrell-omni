# Documentation TODO

Use this file to capture documentation work that should be done later, especially
when code work is moving faster than docs.

Scope:
- repository documentation in `README.md`, `docs/`, and `specs/`
- site documentation in `makrell.dev/`

How to use it:
- add short, concrete items when a code change or design decision should be
  reflected in docs later
- prefer append-only updates unless an item is clearly obsolete
- mark items as done by moving them to a small completed section or deleting them
  once the corresponding docs are updated

Suggested item format:

```md
- [ ] Area: short note
  - Source: file/feature/decision
  - Target docs: path(s)
```

## Pending

- [ ] Keep this file updated whenever documentation work is deferred during coding.
  - Source: ongoing repo workflow
  - Target docs: `docs/documentation-todo.md`
- [ ] Surface signature showcase examples for MakrellPy, MakrellTS, and Makrell# as part of `v0.10.0`.
  - Source: existing interesting examples, tests, and implementation capabilities
  - Target docs: release notes, implementation READMEs, `makrell.dev/`, possible examples/showcase directories
- [ ] Surface the MakrellPy `pipe`, `rpn`, and `lisp` macros as the MakrellPy showcase set for `v0.10.0`.
  - Source: `impl/py/tests/makrellpy/test_meta.mr`
  - Target docs: release notes, `impl/py/README.md`, `makrell.dev/` MakrellPy docs, possible examples directory
- [ ] Add public `pipe`, `rpn`, and `lisp` showcase examples for MakrellTS.
  - Source: `v0.10.0` shared macro showcase goal
  - Target docs: `impl/ts/README.md`, `makrell.dev/`, examples/showcase directory, release notes
- [ ] Add public `pipe`, `rpn`, and `lisp` showcase examples for Makrell#.
  - Source: `v0.10.0` shared macro showcase goal
  - Target docs: `impl/dotnet/README.md`, `makrell.dev/`, examples/showcase directory, release notes
- [ ] Document the expanded Makrell# meta helper surface used by the macro showcase.
  - Source: `MetaProcessor` now supports member access, list `append`/`push`/`pop`, AST constructors, and `isinstance`-style node checks in compile-time code
  - Target docs: `impl/dotnet/README.md`, `specs/makrellsharp-spec.md`, `makrell.dev/` Makrell# macro/meta docs
- [ ] Pick and package the MakrellTS `v0.10.0` showcase examples.
  - Source: `impl/ts/examples/hello.mrts`, `impl/ts/examples/nbody-browser/`, `impl/ts/examples/browser-compile/`
  - Target docs: release notes, `impl/ts/README.md`, `makrell.dev/`, possible examples/showcase directory
- [ ] Pick and package the Makrell# `v0.10.0` showcase examples.
  - Source: `impl/dotnet/examples/interop.mrsh`, `impl/dotnet/examples/macros.mrsh`, existing pattern-matching examples in `impl/dotnet/README.md`
  - Target docs: release notes, `impl/dotnet/README.md`, `makrell.dev/`, possible examples/showcase directory

## Completed

- [x] Document the MRTD `extended-scalars` profile in implementation READMEs and `makrell.dev`.
  - Source: profile-gated MRTD suffix support in `.NET`, MakrellTS, and MakrellPy
  - Target docs: `impl/dotnet/README.md`, `impl/py/README.md`, `impl/ts/README.md`, `makrell.dev/`
- [x] Add MRTD family documentation pages and navigation on `makrell.dev`.
  - Source: new `specs/mrtd-spec.md` draft and initial `.NET` implementation
  - Target docs: `makrell.dev/`, MRTD section, tutorials, cookbook
- [x] Add MakrellPy and MakrellTS MRTD implementation notes once parser work starts there.
  - Source: MRTD is intended as a family format, not a `.NET`-only feature
  - Target docs: `impl/py/README.md`, `impl/ts/README.md`, relevant specs/site pages
- [x] Document typed MRTD APIs across `.NET`, MakrellTS, and MakrellPy.
  - Source: typed/object-and-tuple MRTD read/write helpers now exist in all three implementations
  - Target docs: `impl/dotnet/README.md`, `impl/py/README.md`, `impl/ts/README.md`, `makrell.dev/`
