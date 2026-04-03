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
- [ ] Write down the `v0.10.0` compile-time parity goal across MakrellPy, MakrellTS, and Makrell#.
  - Source: release direction that compile-time Makrell should use substantially more of the normal language/runtime surface
  - Target docs: release notes, `docs/v0.10.0-release-plan.md`, implementation docs, `makrell.dev/`
- [ ] Audit MakrellTS compile-time capability against the shared macro showcase and broader language surface.
  - Source: MakrellTS should not lag obviously behind MakrellPy in public macro examples
  - Target docs: `impl/ts/README.md`, `makrell.dev/`, release notes, possible implementation status note
- [ ] Plan the Makrell# transition away from a narrow bespoke meta evaluator toward broader compile-time language reuse.
  - Source: current `MetaProcessor` is good bootstrap infrastructure but not the desired long-term `v0.10.0+` model
  - Target docs: `docs/`, `specs/makrellsharp-spec.md`, possible architecture note
- [ ] Write down the stronger `v0.10.0` rule that meta should use the same parser and compiler path where practical.
  - Source: release direction for near-full language experience in compile-time code
  - Target docs: `docs/v0.10.0-release-plan.md`, `docs/consolidation-plan.md`, possible architecture note
- [ ] Plan the MakrellTS web playground for `v0.10.0` once the design profile exists.
  - Source: desired browser-based playground with examples, docs, REPL, and editor
  - Target docs: `docs/`, release notes, `makrell.dev/`, possible dedicated plan note
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
- [x] Extract shared `vscode-makrell` language/editor assets for reuse by future web tooling.
  - Source: playground and VS Code extension should share grammar/snippets/language metadata rather than duplicate them
  - Target docs: `docs/consolidation-plan.md`, `docs/v0.10.0-release-plan.md`, `vscode-makrell/README.md`, possible architecture note
