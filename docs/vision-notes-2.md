# Makrell as a Language Workbench and Miniformat Family

## Overview

Makrell should be understood not only as a programming language, and not only as
a family of host-language implementations, but as a broader structural system
for building little languages that fit together.

The central idea is:

**Makrell is a language workbench and miniformat family built on one shared
structural foundation.**

That foundation is MBF. MBF makes it possible for code, data, markup, macros,
embedded DSLs, and future family members to feel related rather than accidental.

In this view:

- MakrellPy, MakrellTS, and Makrell# are host-language tracks
- MRON and MRML are family miniformats
- future formats and DSLs are natural extensions, not side projects

This gives the project a clearer identity than “one language in multiple
hosts”. It also points toward a more interesting long-term outcome: Makrell as a
toolkit for inventing and composing structurally related languages.

## Why this framing matters

If Makrell is treated only as a general-purpose language, it competes directly
with established host ecosystems on their strongest ground. That is a difficult
position.

If Makrell is treated as a language workbench and miniformat family, it has a
more distinctive role:

- a shared syntax and AST model across multiple domains
- a practical way to embed mini-languages
- source-preserving macros and transforms
- multiple runtimes without losing the family identity
- data and markup formats that belong to the same world as the programming
  languages

This is more original, more defensible, and more aligned with what the project
already shows through MBF, MRON, MRML, macros, and the multiple implementation
tracks.

## The core proposition

The strongest version of Makrell is not:

- “Makrell, one language with several ports”

It is:

- “Makrell is a structural family for programming languages, data formats,
  markup formats, and embedded DSLs.”

That proposition depends on three things:

1. a common structural base
2. a family of formats and language layers built on top of it
3. host-language implementations that prove the model is portable

MBF already gives the first of these.
MRON and MRML already begin to demonstrate the second.
MakrellPy, MakrellTS, and Makrell# already begin to demonstrate the third.

## Language workbench direction

In practical terms, “language workbench” means Makrell should become good at:

- defining mini-languages quickly
- embedding them safely
- preserving source structure for macros and tools
- transforming between related structural representations
- targeting more than one runtime without losing the common model

This does not require Makrell to become a huge monolithic system.
It requires Makrell to become excellent at a few connected things:

- parsing and structural representation
- macros and compile-time transforms
- conformance across implementations
- reusable libraries for patterns, queries, rules, and DSL definition

If those pieces are done well, new family members become easier to build and
justify.

## Miniformat family direction

MRON and MRML should be treated as the beginning of a miniformat family, not as
isolated experiments.

That family can grow in directions where existing formats are either too weak or
too disconnected from programming-language tooling. Promising candidates
include:

- tabular data
- structural queries and paths
- document and site DSLs
- rules and reactive graphs
- domain DSLs such as state machines

In each case, the important question is not whether Makrell can imitate an
existing format, but whether it can produce a structurally coherent alternative
that composes well with the rest of the family.

## Structural queries and navigation

One especially promising direction is a query layer for traversing family
structures consistently.

If MBF, MRON, MRML, and Makrell ASTs can all be navigated through related
selectors or path forms, Makrell becomes more than a syntax family. It becomes a
structural navigation system.

This would support:

- querying ASTs
- traversing MRON data
- traversing MRML trees
- adapting to external data sources later

That kind of shared query model would be one of the strongest pieces of evidence
that the “family” idea is real rather than rhetorical.

## Documents and markup as a showcase

MRML has strategic value beyond its syntax.
It is a visible way to demonstrate that the Makrell model applies outside
general-purpose code.

Using MRML for real documentation, components, templates, and site generation
would help Makrell show:

- structural reuse
- code/data/markup alignment
- practical value in a real project
- integration between formats, macros, and host implementations

This is also a good dogfooding path because it creates visible output and forces
the design to become clearer.

## Rules, reactivity, and live systems

Another distinctive direction is to use Makrell’s structural and macro strengths
for rules, matching, and reactive systems.

Makrell already has several relevant ingredients:

- patterns
- macros
- structural ASTs
- host integration

Taken together, these make a rules/reactive layer plausible.
That would move Makrell beyond “syntax plus macros” and toward a system for
describing live structure and behaviour.

This is not necessarily core-language work first.
It may begin more naturally as libraries and DSLs built on top of the current
language layers.

## Recommended strategic structure

The project is easiest to understand if it is organised into three tiers.

### 1. Core

The shared foundation:

- MBF
- common structural model
- operator and parsing rules
- source-preserving transforms
- conformance tests

### 2. Family formats and language tracks

The visible family members:

- MakrellPy
- MakrellTS
- Makrell#
- MRON
- MRML
- future miniformats such as a tabular format

### 3. Workbench modules

The system-building layer:

- query/path tools
- grammar and parser DSLs
- rule engines
- reactive modules
- showcase DSLs

This framing helps distinguish between:

- what is core
- what is a family member
- what is a higher-level module or DSL

## What success would look like

The strongest medium-term outcome is not “many partial ports”.
It is something more coherent:

- one clearly specified structural core
- several useful family members
- multiple host implementations with shared tests
- at least one or two genuinely distinctive workbench-style modules
- one or two showcase DSLs that make the value of the approach obvious

If that happens, Makrell becomes interesting not only as a language design, but
as an environment for language creation.

## Near-term implications

This vision suggests a practical near-term focus:

1. keep tightening the shared conceptual story
2. treat MRON and MRML as first-class family members
3. add one more serious miniformat
4. build one structural query layer
5. use MRML and related tools in real documentation/site workflows
6. build one showcase DSL that proves the workbench direction

This is a more coherent path than trying to expand every implementation track in
every direction at once.

## Final statement

Makrell should aim to be:

**a family for building composable miniformats and embedded DSLs, with one
shared structural base and multiple host runtimes.**

That is a stronger and more distinctive vision than Makrell as a
general-purpose language alone.
