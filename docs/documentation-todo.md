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
- [ ] Document the expanded Makrell# meta helper surface used by the macro showcase.
  - Source: `MetaProcessor` now supports member access, list `append`/`push`/`pop`, AST constructors, and `isinstance`-style node checks in compile-time code
  - Target docs: `impl/dotnet/README.md`, `specs/makrellsharp-spec.md`, `makrell.dev/` Makrell# macro/meta docs
- [ ] Plan the Makrell# transition away from a narrow bespoke meta evaluator toward broader compile-time language reuse.
  - Source: current `MetaProcessor` is good bootstrap infrastructure but not the desired long-term `v0.10.0+` model
  - Target docs: `docs/`, `specs/makrellsharp-spec.md`, possible architecture note
- [ ] Write down the stronger Makrell# rule that meta must not be a separate implementation of Makrell#.
  - Source: compile-time parity direction for `v0.10.0+`
  - Target docs: `docs/consolidation-plan.md`, `docs/v0.10.0-release-plan.md`, `specs/makrellsharp-spec.md`, Makrell# architecture notes
- [ ] Write down the stronger `v0.10.0` rule that meta should use the same parser and compiler path where practical.
  - Source: release direction for near-full language experience in compile-time code
  - Target docs: `docs/v0.10.0-release-plan.md`, `docs/consolidation-plan.md`, possible architecture note
- [ ] Pick and package the MakrellTS `v0.10.0` showcase examples.
  - Source: `impl/ts/examples/hello.mrts`, `impl/ts/examples/nbody-browser/`, `impl/ts/examples/browser-compile/`
  - Target docs: release notes, `impl/ts/README.md`, `makrell.dev/`, possible examples/showcase directory
- [ ] Pick and package the Makrell# `v0.10.0` showcase examples.
  - Source: `impl/dotnet/examples/interop.mrsh`, `impl/dotnet/examples/macros.mrsh`, existing pattern-matching examples in `impl/dotnet/README.md`
  - Target docs: release notes, `impl/dotnet/README.md`, `makrell.dev/`, possible examples/showcase directory
- [ ] Write a concrete TS family language-server plan for Makrell, MakrellPy, MakrellTS, Makrell#, MRON, MRML, and MRTD.
  - Source: `v0.10.0` direction toward one TS-based editor/tooling stack with first-class data-format support
  - Target docs: `docs/`, `vscode-makrell/`, possible dedicated plan note, release/consolidation docs
- [ ] Define and document `run current file` support for MakrellPy, MakrellTS, and Makrell# in `v0.10.0`.
  - Source: extension should give the three main language tracks a credible run/build/check workflow
  - Target docs: `vscode-makrell/`, implementation READMEs, `docs/v0.10.0-release-plan.md`, possible workflow docs
- [ ] Add editor-visible diagnostics/code markings for MakrellPy, MakrellTS, Makrell#, MRON, MRML, and MRTD.
  - Source: `v0.10.0` should provide compiler/format errors with in-editor markings across the three language tracks plus the three family data formats
  - Target docs: `vscode-makrell/`, `docs/editor-support-audit.md`, implementation docs, possible TS tooling plan
- [ ] Apply the language documentation guide to the highest-traffic Makrell docs pages.
  - Source: current docs are too repetitive and too light on substantive runnable examples
  - Target docs: `makrell.dev/` homepage/getting-started/language pages, implementation README pages, `docs/language-documentation-guide.md`
## Completed

- [x] Write down the current debug-information/source-mapping story for MakrellPy, MakrellTS, and Makrell#.
  - Source: `v0.10.0` should state clearly what exists today (PDBs, host sourcemaps, traceback filenames) and what is still missing (Makrell-aware source maps)
  - Target docs: `docs/debug-information-and-source-mapping.md`, `docs/v0.10.0-release-plan.md`, release notes
- [x] Plan and implement the MakrellTS web playground for `v0.10.0`.
  - Source: desired browser-based playground with examples, docs, REPL, and editor
  - Target docs: standalone playground app under `playground/`, release notes, `makrell.dev/`, retained notes in `docs/playground-notes/`

- [x] Write down the current format-conformance and release-smoke picture for `v0.10.0`.
  - Source: release checklist still needed an honest MRON/MRML/MRTD review plus a compact smoke suite
  - Target docs: `docs/conformance-review.md`, `docs/release-smoke-suite.md`, `docs/v0.10.0-release-plan.md`
- [x] Review `makrell.dev` for current install and use paths.
  - Source: site install/tooling pages still had stale repo/tool assumptions after the packaging/editor consolidation work
  - Target docs: `makrell.dev/source/makrellpy/install.rst`, `makrell.dev/source/makrellts/install.rst`, `makrell.dev/source/makrellsharp/install.rst`, `makrell.dev/source/makrellsharp/tooling.rst`

- [x] Implement and document baseline MakrellTS `async fun` / `await` support.
  - Source: `v0.10.0` requirement that async/await be a real family feature using Makrell-shaped forms
  - Target docs: `impl/ts/README.md`, `specs/async-model.md`, parity notes, checked-in async example
- [x] Implement and document baseline Makrell# `async fun` / `await` support.
  - Source: `v0.10.0` requirement that async/await be a real family feature using Makrell-shaped forms
  - Target docs: `impl/dotnet/README.md`, `specs/async-model.md`, compiler/CLI tests, checked-in async example
- [x] Add public async/await examples for MakrellPy, MakrellTS, and Makrell#.
  - Source: async/await is now a release requirement rather than an implementation-specific extra
  - Target docs: implementation READMEs, release notes, `makrell.dev/`, examples directories
- [x] Surface Makrell# async/await on `makrell.dev`.
  - Source: Makrell# now has baseline `{async fun ...}` and `{await ...}` support with a checked-in example
  - Target docs: `makrell.dev/` Makrell# pages, release notes
- [x] Write down the cross-language async/await direction for the Makrell family.
  - Source: `v0.10.0` now requires a shared async/await surface that follows Makrell syntactic conventions
  - Target docs: `specs/async-model.md`, `specs/main-spec.md`, release/consolidation plans
- [x] Expose a MakrellTS playground launch-example manifest generated from real checked-in sources.
  - Source: `impl/ts` now syncs curated `.mrts` examples into `src/generated/playground_examples.ts` and exports them from `makrellts/playground`
  - Target docs: `impl/ts/README.md`, `makrell.dev/` playground architecture/implementation notes
- [x] Expose synced shared editor assets from MakrellTS for browser/playground reuse.
  - Source: `impl/ts` now syncs `shared/makrell-editor-assets/` into local package files and exports them from `makrellts/editor-assets`
  - Target docs: `impl/ts/README.md`, `makrell.dev/` playground architecture/implementation notes
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
- [x] Add NuGet package readmes for the Makrell# library packages.
  - Source: `dotnet pack` succeeded for the library projects, but NuGet warned that package readmes were missing
  - Target docs: `.NET` package metadata, `impl/dotnet/README.md`, package readme asset
- [x] Record the current Python LSP capabilities, limits, and `v0.10.0` editor-support direction.
  - Source: `vscode-makrell` no longer has a hard Python-extension dependency, but current optional LSP/tooling reality still needs to be visible
  - Target docs: `docs/editor-support-audit.md`, `docs/v0.10.0-release-plan.md`
- [x] Add a basic Makrell# diagnostics/check path for editor integration.
  - Source: `v0.10.0` should give Makrell# compiler diagnostics an interim tooling path before the TS family language server exists
  - Target docs: `impl/dotnet/README.md`, `docs/editor-support-audit.md`, `vscode-makrell/`, possible CLI/tooling docs
- [x] Add basic MakrellTS diagnostics/check support for editor integration.
  - Source: `makrellts check --json` now provides editor-facing diagnostics with ranges for common compile failures
  - Target docs: `impl/ts/README.md`, `vscode-makrell/`, `docs/editor-support-audit.md`, release-plan tracking
- [x] Add basic MakrellPy diagnostics/check support for editor integration.
  - Source: `makrell check --json` now provides a non-LSP diagnostics path for `.mr`, `.mrx`, and `.mrpy`
  - Target docs: `impl/py/README.md`, `vscode-makrell/`, `docs/editor-support-audit.md`, release-plan tracking
- [x] Wire `vscode-makrell` diagnostics/code markings across MakrellPy, MakrellTS, Makrell#, MRON, MRML, and MRTD.
  - Source: `v0.10.0` editor requirement for the three main language tracks plus the three family data formats
  - Target docs: `vscode-makrell/README.md`, `docs/v0.10.0-release-plan.md`, `docs/editor-support-audit.md`
- [x] Add a proper `makrell.dev` page for `vscode-makrell`.
  - Source: extension README and repo capabilities are ahead of the site docs
  - Target docs: `makrell.dev/`, homepage/getting-started/reference links
- [x] Surface `vscode-makrell` earlier in `makrell.dev` with a real editor screenshot.
  - Source: `v0.10.0` should treat editor support as part of the front-door experience rather than only reference material
  - Target docs: `makrell.dev/source/index.rst`, `makrell.dev/source/getting-started.rst`, `makrell.dev/source/reference/vscode-makrell.rst`, related CSS/assets
- [x] Surface signature showcase examples for MakrellPy, MakrellTS, and Makrell# as part of `v0.10.0`.
  - Source: existing interesting examples, tests, and implementation capabilities
  - Target docs: release notes, implementation READMEs, `makrell.dev/`, possible examples/showcase directories
- [x] Surface the MakrellPy `pipe`, `rpn`, and `lisp` macros as the MakrellPy showcase set for `v0.10.0`.
  - Source: `impl/py/tests/makrellpy/test_meta.mr`
  - Target docs: release notes, `impl/py/README.md`, `makrell.dev/` MakrellPy docs, possible examples directory
- [x] Add public `pipe`, `rpn`, and `lisp` showcase examples for MakrellTS.
  - Source: `v0.10.0` shared macro showcase goal
  - Target docs: `impl/ts/README.md`, `makrell.dev/`, examples/showcase directory, release notes
- [x] Add public `pipe`, `rpn`, and `lisp` showcase examples for Makrell#.
  - Source: `v0.10.0` shared macro showcase goal
  - Target docs: `impl/dotnet/README.md`, `makrell.dev/`, examples/showcase directory, release notes
- [x] Write down the `v0.10.0` compile-time parity goal across MakrellPy, MakrellTS, and Makrell#.
  - Source: release direction that compile-time Makrell should use substantially more of the normal language/runtime surface
  - Target docs: release notes, `docs/v0.10.0-release-plan.md`, implementation docs, `makrell.dev/`
- [x] Audit MakrellTS compile-time capability against the shared macro showcase and broader language surface.
  - Source: MakrellTS should not lag obviously behind MakrellPy in public macro examples
  - Target docs: `impl/ts/README.md`, `makrell.dev/`, release notes, possible implementation status note
