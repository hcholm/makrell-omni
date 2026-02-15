# MakrellTS Reference Implementation Plan

## Goal

Make `impl/ts` the primary reference implementation of Makrell, with behavior as close to MakrellPy as practical while adopting TypeScript/JavaScript runtime semantics.

Core requirements:
- Compile Makrell source to JavaScript.
- Run in Node.js (Bun preferred) and in browser.
- Execute meta/macro code in a separate JavaScript context.
- Include a browser example app: interactive N-body simulator with merge-on-collision.
- Support TypeScript-compatible typing in Makrell source and in compiler output.

## Guiding Principles

- Parity-first with MakrellPy syntax/features, then TS-specific idioms.
- MBF syntax remains the common front-end format.
- Deterministic compile pipeline and explicit phase boundaries.
- Same test corpus shape as MakrellPy where possible.
- No Node-only assumptions in core compiler pipeline.

## Semantics Baseline

MakrellTS should mirror MakrellPy features unless listed in a divergence table.

Planned intentional TS/JS semantics:
- Class instantiation uses explicit `new` form:
  - `{new Point [2 3]}`
  - Optional keyword/object args may be represented as `{new Point [2 3] [z=5]}`
- Truthiness follows JS semantics.
- Numeric operations and edge cases follow JS (`number`, `bigint` where explicitly supported).
- Type checks map to JS/TS constructors/prototypes rather than Python classes.

Typing requirements:
- No new AST node kinds for typing. Typing must be represented using existing node forms (`Identifier`, `BinOp`, `Round/Square/CurlyBrackets`, etc.).
- Makrell source should support TS-compatible type annotations for:
  - variables/const bindings
  - function parameters and return types
  - class fields and method signatures
  - generic type parameters where practical
- Compiler output should support typed targets:
  - JS output (`.js`) for runtime execution
  - TS output (`.ts`) and/or declaration output (`.d.ts`) preserving source type information
- Type information must remain available across macro expansion boundaries where feasible.

Typing encoding examples using existing nodes:
- Union type: `"option1" | "option2"`
- Generic-like application: `Result[T]`
- Function type sketch: `[A B] -> C`
- Mapped/object-like type sketch (surface): `{$dict [K in Keys] : boolean}`
- `in` is not an operator token in core syntax; parser/lowering should rewrite mapped forms to existing operator-based/core-node representations (or discard `in` when redundant).

## Architecture

## 1. Front-end (shared)

- Tokeniser and MBF parser (`Identifier`, `String`, `Number`, bracket nodes, operators).
- Operator-precedence parser compatible with MakrellPy precedence table.
- AST node model stable across compile and meta phases.

## 2. MakrellTS compiler

- Lowering from MBF AST to JS AST (or direct JS emitter).
- Parallel typed lowering path for TS emit/declaration emit.
- Reserved forms (`if`, `fun`, `class`, `match`, `def macro`, `quote`, `meta`, etc.).
- Extension points:
  - user operators
  - suffix transforms
  - user-defined patterns

## 3. Runtime library

- Pattern-match runtime helpers (`$r`, `$type`, etc.).
- Interop helpers for JS ecosystem.
- Standard library primitives used by macro/meta evaluator.

## 4. Meta execution isolation

Meta code must run out-of-context from host compile process.

Node/Bun target:
- Primary: isolated worker-based context (or Bun worker API).
- Fallback: Node `vm` context with hard boundary APIs.

Browser target:
- Web Worker-based meta runtime.
- Message-passing API for quote/unquote nodes and diagnostics.

Common constraints:
- Structured clone/message protocol only.
- No direct host global mutation.
- Explicit capability injection (allowlist APIs only).

## 5. Targets

- CLI: compile and run Makrell on Bun/Node.
- Library API:
  - `compile(src, options) -> { code, map?, diagnostics, typings? }`
  - `eval/exec` equivalents for dev/test
- Browser bundle:
  - compiler + runtime + worker-based meta engine

## Milestones

## M0. Repo readiness

- Normalize `impl/ts` layout (`src/`, `examples/`, `tests/`, `bench/` optional).
- Add scripts:
  - `build`, `test`, `lint`, `typecheck`, `test:browser`.
- Define compatibility matrix (Bun version, Node version, major browsers).

Exit criteria:
- Clean CI job for `build + test + typecheck`.

## M1. MBF + core compile parity

- Tokenize/parse parity with existing MBF behavior.
- Core expressions, calls, lambdas, assignment, classes/functions.
- JS emitter with source positions for diagnostics.
- Type annotation AST support for TS-compatible source typing.

Exit criteria:
- Core subset tests green (ported from MakrellPy simple/core suites).

## M2. Macro/meta system with isolated context

- Implement `{meta ...}`, `{def macro ...}`, `quote/unquote`.
- Run meta in separate JS context (worker/vm adapter layer).
- Deterministic serialization for AST nodes crossing boundary.

Exit criteria:
- Macro/meta parity tests green in Bun and browser-worker harness.

## M3. Pattern matching parity

- Implement built-ins:
  - `_`, `$`, literals
  - list patterns
  - `|`, `&`, binop-with-`$`
  - type patterns (`_:Type`)
  - `{$r ...}`
  - `{$type ...}`
- Add user-defined pattern hooks.

Exit criteria:
- Ported pattern test suite passes in `impl/ts`.

## M4. Import/interoperability model

- Runtime `{import ...}` against JS modules.
- Compile-time meta import equivalent to `{importm ...}`.
- Define ESM/CJS behavior and browser module loading strategy.

Exit criteria:
- Interop tests pass in Bun and Node.

## M5. Browser-first packaging

- Publish browser bundle for compiler/runtime.
- Worker package for meta execution.
- Docs and examples for in-browser compile/execute.

Exit criteria:
- Browser integration tests pass in Chromium + Firefox.

## M5.1 Typed output completeness

- Implement TS emit mode and/or `.d.ts` generation mode.
- Add fixture tests that compare expected type signatures in output.
- Document typing feature support and unsupported TS features.

Exit criteria:
- Typed output tests pass and generated types are consumable by `tsc`.

## M6. Example app: N-body simulator

- Example path: `impl/ts/examples/nbody-browser/`.
- Must be runnable from repository source without a separate build step.
- Keep runnable browser output artifacts checked in (or otherwise directly executable source form) so a fresh clone can run the demo immediately.
- Features:
  - 2D simulation with gravitational attraction.
  - Collision detection and merge-on-collision.
  - Interactive controls:
    - body count
    - gravity constant
    - timestep
    - softening
    - spawn radius/velocity range
    - pause/reset
  - Optional trails and FPS counter.
- Use MakrellTS for simulation/control logic where practical.

Exit criteria:
- Runs in browser with smooth interaction and deterministic reset behavior.
- `examples/nbody-browser` can be launched directly from source (no pre-run build required).

## M7. Reference transition

- Update top-level docs to state MakrellTS as reference implementation.
- Keep MakrellPy as compatibility implementation until parity threshold met.
- Publish parity report and known divergences.

Exit criteria:
- Approved parity matrix and documentation update merged.

## Parity and Test Strategy

- Create `impl/ts/tests/parity/` mirroring MakrellPy scenario files.
- Categorize each MakrellPy test as:
  - `portable`
  - `portable-with-ts-adaptation`
  - `python-specific` (documented exclusion)
- Add golden tests for compiled JS output for key constructs.
- Add browser-worker tests for meta isolation behavior.

## Documentation Deliverables

- `impl/ts/README.md`: runtime targets, usage, constraints.
- `specs/makrellpy-spec.md` and/or TS-specific supplement:
  - explicit divergence list (TS semantics vs Python semantics)
  - `new` instantiation semantics
  - meta isolation model
  - TS typing syntax and output guarantees

## Risks and Mitigations

- Risk: meta isolation differences across Bun/Node/browser.
  - Mitigation: adapter interface + shared conformance tests.
- Risk: import/meta-import behavior divergence.
  - Mitigation: strict module loading contract and early interop tests.
- Risk: performance regression in browser compile.
  - Mitigation: cache parsed AST and incremental compile later.

## Immediate Next Actions

1. Write MakrellTS parity matrix doc (`portable`, `adapt`, `exclude`) against current MakrellPy tests.
2. Implement and document meta-runtime adapter interface (`NodeVmAdapter`, `WorkerAdapter`).
3. Define MakrellTS typing syntax subset using existing AST node forms only.
4. Add `new` reserved form + tests (`{new Point [2 3]}` baseline).
5. Scaffold `examples/nbody-browser` with controls and merge-on-collision physics.
