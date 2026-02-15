# MakrellTS Import Model (M4)

This document defines current import/interoperability behavior in `impl/ts`.

## Runtime import forms

- `{import mod}`:
  - resolves module `mod`
  - binds module object to symbol `mod` (or last segment for dotted names)
- `{import mod@[a b c]}`:
  - resolves module `mod`
  - binds named exports/properties `a`, `b`, `c` directly

## Compile-time meta import

- `{importm mod}`:
  - resolves module `mod`
  - loads Makrell macro definitions from `mod.__mr_meta__`
- `{importm mod@[name1 name2]}`:
  - same, but only selected macro names are loaded

`__mr_meta__` format:
- array of serialized Makrell macro definitions
- each entry: `{ name: string, params: string[], body: Node[] }`

## Resolution strategy

Resolution order at runtime:
1. `scope.__mr_modules[moduleName]` (recommended for browser/tests)
2. `globalThis.require(moduleName)` when available (Node/Bun CJS-style environments)

Custom resolvers:
- `RunOptions.moduleResolver`
- `RunOptions.metaModuleResolver`

## ESM/CJS notes

- Current default runtime loading is CJS-oriented (`require`) when `__mr_modules` is not provided.
- ESM-first deployments should provide `moduleResolver` explicitly.
- Browser usage should provide `scope.__mr_modules` (or custom resolver), since `require` is not available.

## Browser module strategy

Recommended:
- pre-populate `scope.__mr_modules` with module objects before calling `run`.
- for dynamic loading, provide a custom resolver wrapper that manages module registry/state.
