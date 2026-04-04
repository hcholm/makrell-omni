# Makrell Language Documentation Guide

This note is the working guide for documenting the Makrell family.

It is meant to keep the docs:

- less repetitive
- more substantial
- more example-driven
- easier to navigate
- clearer about what is family-level versus implementation-level

The best general model to follow is **Diataxis**, adapted for language
documentation.

## Core rule

Do not write pages that try to do all of these at once:

- teach
- explain design
- define exact syntax
- describe implementation status

Split those jobs on purpose.

## The four documentation modes

Every substantial docs area should fit mainly into one of these modes.

## 1. Tutorials

Use tutorials for:

- first contact
- guided learning
- short, linear progress

Tutorials should:

- assume little
- use complete runnable examples
- avoid branching into many options
- favour momentum over completeness

Tutorials should not:

- try to define every edge case
- carry large status discussions
- read like reference material

Good tutorial question:

- "Can I get something working quickly and understand the basic shape?"

## 2. How-to guides

Use how-to guides for:

- concrete tasks
- applied workflows
- "how do I do X?"

Examples:

- how to write a macro
- how to parse MRTD records
- how to call CLR methods from Makrell#
- how to run MakrellTS in the browser

How-to guides should:

- start from the task
- show the shortest working path
- include copy-runnable code
- mention common pitfalls briefly

Good how-to question:

- "I know roughly what this is; how do I accomplish a specific task?"

## 3. Reference

Use reference for:

- exact syntax
- operators
- forms
- semantics
- APIs
- CLI commands

Reference should:

- be precise
- be skimmable
- be low on narrative
- answer exact questions quickly

Reference should always include:

- the exact form
- short examples
- important edge cases
- links to explanation or how-to pages when needed

Good reference question:

- "What exactly does this form mean?"

## 4. Explanation

Use explanation for:

- rationale
- mental models
- design tradeoffs
- implementation differences

Examples:

- why meta should share the parser/compiler path
- how Makrell relates to MBF
- why truthiness may differ by host

Explanation should:

- make design choices legible
- compare alternatives when useful
- stay honest about rough edges

Good explanation question:

- "Why is it like this?"

## Makrell-specific rules

## Start with code

Every language feature page should begin with a runnable or nearly-runnable code
example.

That example should show the feature before the prose starts explaining it.

Bad:

- three paragraphs of abstraction before the reader sees the syntax

Better:

```makrell
{match [2 3]
    [_ _]
        "two"
    _
        "other"}
```

Then explain:

- what the syntax is
- what it returns
- what else to know

## Prefer one small example and one real example

For important language features, aim for:

- one tiny example
- one more realistic example

That usually gives enough substance without flooding the page.

## Keep family docs separate from implementation docs

Use family-level pages for:

- shared syntax
- shared semantics
- shared mental model

Use implementation pages for:

- installation
- host interop
- packaging
- current limitations
- implementation-specific examples

Do not let implementation quirks dominate the family language pages.

## Keep status talk out of feature pages where possible

User-facing feature pages should not be full of release-planning language.

Avoid repeating things like:

- "for v0.10.0"
- "this is part of consolidation"
- "this is a release-level concern"

That material belongs in:

- release notes
- plans
- status pages
- implementation notes

Feature pages should mostly answer:

- what it is
- how it works
- how to use it

## Reduce repetition by choosing a canonical page

For each concept, choose one main page.

Examples:

- pattern matching
- macros
- async/await
- MRTD

Other pages should:

- summarise briefly
- link to the canonical page
- avoid re-explaining the same thing at length

## Prefer fewer pages with more substance

A thin page that says little is usually worse than:

- one stronger page
- with examples
- precise structure
- links out to related material

Before creating a new page, ask:

- does this need its own page?
- or should it be a section in an existing stronger page?

## Use explicit labels for host-shaped differences

When semantics differ by implementation, say so directly.

Example:

- truthiness is host-shaped in some tracks
- interop is host-specific
- some compile-time details still differ

But do this briefly and explicitly. Do not let every page turn into a status
matrix.

## A good page shape

For most language pages, this shape works well:

1. short statement of purpose
2. small runnable example
3. exact syntax or form
4. explanation of behaviour
5. realistic example
6. edge cases or implementation notes
7. links to related pages

## What to avoid

Avoid pages that are mostly:

- roadmap language
- repeated release framing
- vague claims without examples
- lists of future intentions
- many headings with very little content under each

Avoid examples that are:

- too toy-like to teach anything
- not runnable anywhere
- disconnected from the actual checked-in examples

## Documentation checklist

Use this when reviewing a page.

- Is the page clearly a tutorial, how-to, reference, or explanation?
- Does it start with a meaningful example?
- Can a reader find the exact syntax quickly?
- Is the concept explained once, not three times in different places?
- Is implementation-specific status clearly separated from language semantics?
- Is there at least one realistic example?
- Is the page substantial enough to justify existing?

## Suggested Makrell docs structure

At a high level, the strongest long-term shape is:

- `Getting started`
- `Learn`
- `How-to`
- `Reference`
- `Explanation`
- implementation sections:
  - MakrellPy
  - MakrellTS
  - Makrell#
  - MRON
  - MRML
  - MRTD

Within that structure:

- tutorials should be short and concrete
- cookbook pages should be task-oriented
- reference pages should be exact
- planning notes should stay out of the public learning flow

## Immediate rewrite priorities

The highest-value pages to tighten first are usually:

- homepage / getting started
- macros/meta docs
- pattern-matching docs
- implementation install/tooling pages
- any page that repeats release-plan language instead of teaching the feature
