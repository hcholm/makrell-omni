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
