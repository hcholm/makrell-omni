# Consolidation Plan

## Goal

Consolidate the existing Makrell codebase into a coherent, installable,
editor-supported development experience before opening up more large design
tracks.

This means prioritising:

- packaging and release basics
- feature/status clarity
- conformance tests
- API and CLI consistency
- documentation and discoverability
- a stronger VS Code extension

The focus is not to add a lot of new language surface.
The focus is to make the current family feel real and usable.

## Guiding principle

Prefer completing and aligning what already exists over adding new major
features.

In practice:

- specs should describe current behaviour accurately
- implementations should be installable and testable
- the editor experience should reflect the current family, not an older subset
- users should be able to discover the right runtime, CLI, and file type without
  reading the whole repo

## Current problems to solve

### 1. Packaging is uneven

- `impl/py` is package-shaped, but still carries older repo naming and metadata
- `impl/ts` is not yet prepared as a publishable npm package
- `.NET` projects build and test well, but packaging/publishing story is still
  incomplete
- `vscode-makrell` exists, but feels tied to an older MakrellPy/LSP-first view

### 2. The family picture is still implicit

- MakrellPy, MakrellTS, and Makrell# all exist
- MRON, MRML, and MRTD all exist
- but the repo still makes users infer too much about what is stable,
  partial, or current

### 3. Conformance is not yet central enough

- many things are tested
- but shared family behaviour is not yet expressed enough through common
  fixtures and parity suites

### 4. The editor experience does not reflect the actual project

- `vscode-makrell` needs a larger update
- it should support the family as it exists now, not just one older language
  track

## Decision: TypeScript-first tooling direction

For `vscode-makrell`, TypeScript should be the primary implementation language.

Reasoning:

- VS Code extensions are naturally a TypeScript/Node ecosystem problem
- integration with commands, settings, diagnostics, and future LSP work is
  easier in TS
- the extension should be able to speak directly to MakrellTS tooling where
  appropriate
- Python can still be used as an optional backend or helper, but should not be
  the primary extension implementation strategy

This does **not** make MakrellPy less important semantically.
It means the editor front-end should be TS-native.

## Consolidation workstreams

## 1. Packaging and releases

### Objectives

- make each major implementation installable in a standard way
- define what is a library, what is a CLI, and what is still experimental
- make release flow explicit

### Python

Tasks:

- audit `setup.py` and `pyproject.toml`
- modernise metadata
- make repo URL and package description current
- verify `pip install -e .` and wheel/sdist work cleanly
- verify console entry points:
  - `makrell`
  - `makrell-langserver`
- define release steps for PyPI

Deliverables:

- clean build/install path
- `python -m pytest` smoke after install
- short release instructions

### TypeScript

Tasks:

- decide npm package shape for `impl/ts`
- make `package.json` publish-ready
- decide package exports
- include runtime/compiler APIs and CLI story
- verify build artefacts in `dist/`
- add package metadata:
  - repository
  - homepage
  - license
  - keywords
  - files/export map

Deliverables:

- publishable npm package
- `bun run build` smoke
- documented CLI/API install path

### .NET

Tasks:

- decide which projects should become NuGet packages
- decide if CLI should become a packaged .NET tool
- add package metadata to publishable `.csproj` files
- verify pack/publish flow

Likely package candidates:

- `MakrellSharp.Ast`
- `MakrellSharp.BaseFormat`
- `MakrellSharp.Mron`
- `MakrellSharp.Mrml`
- `MakrellSharp.Mrtd`
- `MakrellSharp.Compiler`

CLI candidate:

- `MakrellSharp.Cli` as a `.NET` tool or clearly documented app project

Deliverables:

- `dotnet pack` story
- optional `dotnet tool install` story
- package boundary decisions written down

### VS Code extension

Tasks:

- update extension metadata
- make package/repo links current
- define packaging/publishing flow for VS Code Marketplace
- verify `vsce package`

Deliverables:

- extension package that matches the current repo/project shape

## 2. Family-wide feature matrix

### Objective

Make current support status explicit.

### Scope

Cover at least:

- MBF parsing
- macros/meta
- pattern matching
- MRON
- MRML
- MRTD
- host interop
- CLI
- packaging
- editor support

### Output

One canonical matrix in docs/spec/site, with categories like:

- implemented
- partial
- evolving
- planned

This should distinguish:

- intentional host-specific behaviour
- missing parity
- experimental features

## 3. Conformance and shared fixtures

### Objective

Make the family definition less dependent on reading implementation code.

### Work

Create shared or mirrored fixture sets for:

- MBF
- MRON
- MRML
- MRTD

Use them in:

- MakrellPy tests
- MakrellTS parity/unit tests
- Makrell# tests

### Priority

1. MRON
2. MRML
3. MRTD
4. selected Makrell language semantics

### Deliverables

- common examples with expected results
- test coverage that makes drift visible
- a clearer path toward future conformance suites

## 4. API and CLI consistency

### Objective

Reduce accidental inconsistency between the three implementation tracks.

### Focus areas

- parse/load/run/build naming
- MRON/MRML/MRTD helper names
- CLI command naming
- examples that match actual commands

### Non-goal

Do not force identical APIs everywhere.

Instead:

- align names where there is no good reason to differ
- keep host-native idioms where they help
- document genuine differences

## 5. Documentation and discoverability

### Objective

Make the current family usable without repo archaeology.

### Repo docs

Tasks:

- keep root `README.md` focused and current
- make implementation READMEs practical and install-oriented
- keep specs aligned with what actually exists
- ensure `documentation-todo.md` is used for deferred work

### Site docs

Tasks:

- keep `makrell.dev` aligned with current installable artefacts
- ensure MRTD is integrated properly
- make implementation pages show current CLI/API entry points
- add a “developer workflow” angle, not only conceptual docs

### Deliverables

- a more complete “how to start” path
- better visibility into what is real today

## 6. VS Code extension refresh

This is a major workstream, not a side note.

The extension should become the front door to the current Makrell family.

### Target outcome

A stronger `vscode-makrell` that gives a good, reasonably complete developer
experience for the functionality that already exists.

### Priority features

#### 1. Family-aware language support

Support current file types clearly:

- `.mr`
- `.mrpy`
- `.mrts`
- `.mrsh`
- `.mron`
- `.mrml`
- `.mrtd`

Tasks:

- language ids
- file associations
- icons
- grammar scope decisions

#### 2. Better syntax highlighting

Improve highlighting by structural role, not just raw token class.

Examples:

- calls vs list-like forms
- operators
- macro/meta heads
- MRON key/value structure
- MRML head/tag-like forms
- MRTD typed headers and suffixes

#### 3. Snippets

Add snippets for:

- `fun`
- `if`
- `match`
- `def macro`
- MRON object/list
- MRML page/component
- MRTD header + rows
- Makrell# interop
- MakrellTS runtime/browser examples

#### 4. Commands

Add command palette support for current workflows.

Examples:

- run current file
- build current file
- parse MRON
- parse MRML
- parse MRTD
- emit C# from `.mrsh`

These can begin as thin wrappers around existing CLIs.

#### 5. Diagnostics

Even before a full language server refresh, add useful editor checks if
possible:

- unmatched brackets
- obvious parse failures
- wrong language mode hints
- maybe later MRTD row-width or obvious shape validation

#### 6. Formatting strategy

Decide what “formatting support” means now:

- full formatter later
- but indentation/bracket/comment behaviour should already be good

### TS-first architecture

Recommended structure:

- extension front-end in TypeScript
- use existing TS-side knowledge where practical
- call Python or other subprocesses only when they provide unique value

### Test/fixture strategy

Use repo examples as editor fixtures:

- sample Makrell files
- sample MRON/MRML/MRTD files
- grammar fixture tests if possible

## 7. Repo hygiene and structure

### Objective

Make the repo easier to navigate and maintain.

Tasks:

- clarify which docs are normative, operational, or exploratory
- reduce overlap between plan notes and implementation docs
- make packaging/release docs easy to locate
- keep extension/docs/specs aligned

## Suggested execution order

## Phase 1: packaging baseline

- Python packaging audit
- npm package shaping for TS
- NuGet/.NET tool decisions
- VS Code extension packaging audit

## Phase 2: status clarity

- feature matrix
- packaging status table
- update README/site pages to match

## Phase 3: conformance

- shared fixture work for MRON/MRML/MRTD
- parity checks where possible

## Phase 4: editor refresh

- `vscode-makrell` file support and grammar refresh
- snippets
- commands
- diagnostics baseline

## Phase 5: docs and workflow polish

- site/documentation update
- “developer workflow” pages
- release instructions

## Immediate next actions

1. Audit current publishability of:
   - `impl/py`
   - `impl/ts`
   - `impl/dotnet`
   - `vscode-makrell`

2. Write a feature/status matrix that includes:
   - runtimes
   - formats
   - CLI
   - packaging
   - editor support

3. Refresh `vscode-makrell/package.json` and language support scope to match the
   current family

4. Create/expand shared MRON/MRML/MRTD fixtures for parity and conformance

5. Update docs to reflect current install/use paths

## Definition of success

This consolidation pass is successful when:

- each major implementation can be installed and smoke-tested
- the current family support picture is explicit
- editor support no longer lags obviously behind the codebase
- common format behaviour is backed by shared fixtures
- docs tell the truth about what exists today

At that point, larger new design work such as `mx-path` will sit on a much
firmer base.
