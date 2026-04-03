# Makrell Portability Model (Draft)

This note records a cross-cutting design principle for the Makrell project:

**not every valid Makrell construct needs to have the same portability level.**

The project should distinguish clearly between:

- family-wide core constructs
- profile specific constructs
- application-specific constructs used in controlled environments

This applies not only to scalar suffixes, but also to other language and format
features such as operators, macros, schema/profile features, query adapters, and
embedded DSL hooks.

## Portability layers

### 1. Core

Core constructs are intended to be portable across the Makrell family.

Examples:

- MBF structural rules
- shared scalar conventions explicitly defined for the family
- format or language features that are expected to work across implementations

Core constructs should be:

- specified centrally
- safe for shared tools and conformance work
- the default basis for portable documents and code

### 2. Profile specific

These constructs belong to one language, format, module family, or named profile.

Examples:

- a suffix defined for MRON but not for MRTD
- a pattern form defined for MakrellPy and Makrell# but not yet for MakrellTS
- a query adapter defined for one host ecosystem

These constructs should be:

- explicitly documented in the relevant spec
- treated as valid only in that profile context
- clearly marked as non-core unless promoted later

### 3. Application specific

These constructs are valid only in a controlled environment.

Examples:

- custom suffixes for internal datasets
- application-defined operators
- local macro libraries that introduce house syntax
- project-specific data or schema conventions

These constructs can be useful and should not be ruled out, but they are not
portable by default.

They should be understood as:

- local extensions
- acceptable in controlled environments
- non-portable unless a profile or language spec adopts them

## Why this matters

This model helps avoid a false binary between:

- "part of Makrell"
- "not part of Makrell"

Instead, a feature can belong to the Makrell ecosystem while still being explicit
about its portability level.

That is useful for:

- data formats such as MRON and MRTD
- host-language implementations
- macros and DSL experiments
- tooling, validation, and conformance testing

## Example: suffixes

Suffixes are a clear case for this model.

- some suffixes may be defined as core family suffixes
- others may belong to a language or format profile
- others may be application-specific in controlled environments

The same general model should be available for other constructs as well.

## Working rule

When a new construct is introduced, the project should ask:

1. Is this a core family construct?
2. Is it specific to one language, format, or profile?
3. Is it an application-specific extension?

The answer should be written down explicitly in the relevant spec or docs.
