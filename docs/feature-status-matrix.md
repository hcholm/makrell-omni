# Makrell Feature Status Matrix

## Purpose

This matrix is the release-oriented snapshot for `v0.10.0`.

It is meant to answer:

- what exists today
- what is strong vs partial
- where the family still has visible gaps

## Status words

- **strongest**: the deepest current reference point in the family
- **active**: real, usable, and under active development
- **partial**: meaningful support exists, but users should expect gaps
- **evolving**: direction is clear, but surface or packaging is still moving
- **planned**: part of the current direction, but not yet a finished feature

## Implementation tracks

| Area | MakrellPy | MakrellTS | Makrell# |
|---|---|---|---|
| Core language | strongest | active reference | active and growing |
| Macros / meta | strongest | active, but still being audited for parity | active and growing |
| Compile-time parity | strongest | improving | improving |
| Pattern matching | strongest | partial | active subset |
| Async / await | active | active | active |
| Host interop | Python | JS / TS | .NET / CLR |
| CLI story | established | active | active |
| Dynamic loading | import-oriented | evolving | compile/load active |
| Typing story | planned / exploratory | active typed surface | discussion / exploratory |
| Packaging | package-shaped | package-ready direction | library packaging decided, CLI tool deferred |
| Editor support | active via repo tooling | active via shared assets | active via shared assets |
| Browser story | limited | active and central | none |

## Family formats and tooling

| Area | Current status | Notes |
|---|---|---|
| MBF | active | shared structural base across the family |
| MRON | active | available in Py and .NET, evolving in TS |
| MRML | active | available in Py and .NET, evolving in TS |
| MRTD | active | available across Py, TS, and .NET |
| MRTD profiles | evolving | `extended-scalars` is the first shared profile experiment |
| VS Code extension | active | being refreshed for the current family |
| Shared editor assets | active | shared grammar/snippets/language config now exist |
| MakrellTS playground | evolving | live direction and browser-host groundwork exist |
| Feature/status docs | active | now part of the `v0.10.0` release material |

## v0.10.0 takeaways

- MakrellPy is still the broadest semantic reference.
- MakrellTS is the most important browser/tooling track and the best place to
  anchor shared future tooling.
- Makrell# is now clearly beyond placeholder status and has real language,
  interop, async, and compile-time capability.
- MRTD is no longer just a speculative format idea; it is a family feature.
- Compile-time parity is improving, but still one of the most important open
  release-quality concerns.
