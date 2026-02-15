import { describe, expect, test } from "bun:test";
import {
  clearPatternHooks,
  compile,
  InProcessMetaRuntimeAdapter,
  registerPatternHook,
  run,
  SubprocessMetaRuntimeAdapter,
} from "../../src/index";

describe("MakrellTs MVP", () => {
  test("implicit return in fun", () => {
    const src = `
      {fun add [x y]
        x + y
      }
      {add 2 3}
    `;
    expect(run(src)).toBe(5);
  });

  test("pattern match", () => {
    const src = `
      {match [2 3]
        [_ 3]
          "ok"
        _
          "no"
      }
    `;
    expect(run(src)).toBe("ok");
  });

  test("MakrellTs macro via def macro", () => {
    const src = `
      {def macro inc [ns]
        n = {regular ns}@0
        {quote {$ n} + 1}
      }

      x = 7
      {inc x}
    `;
    expect(run(src)).toBe(8);
  });

  test("macro quote supports multiple top-level nodes", () => {
    const src = `
      {def macro twostmts [ns]
        {quote
          a = 2
          a = a + 3
        }
      }

      {twostmts}
      a
    `;
    expect(run(src)).toBe(5);
  });

  test("macro evaluator supports array methods and loop state updates", () => {
    const src = `
      {def macro calc [ns]
        stack = []
        {stack.push {Number "2"}}
        {stack.push {Number "3"}}
        a = {stack.pop}
        b = {stack.pop}
        total = 0
        {for n [1 2 3]
          total = total + n
        }
        {quote {$ b} + {$ a} + {$ total}}
      }

      {calc}
    `;
    expect(run(src)).toBe(11);
  });

  test("class + new with TS-style semantics baseline", () => {
    const src = `
      {class Point []
        {fun __init__ [self x y]
          self.x = x
          self.y = y
        }
        {fun sum [self]
          self.x + self.y
        }
      }
      p = {new Point [2 3]}
      {p.sum}
    `;
    expect(run(src)).toBe(5);
  });

  test("typed syntax via existing nodes compiles", () => {
    const src = `
      {fun add [x:int y:int]
        x + y
      }
      total:int = {add 2 3}
      total
    `;
    expect(run(src)).toBe(5);
  });

  test("compile diagnostics include source position", () => {
    const src = `
      a =
    `;
    expect(() => compile(src)).toThrow(/line 2, col 7|line 3, col 1|line 2/);
  });

  test("makrell macro execution can be routed through runtime adapter", () => {
    const src = `
      {def macro inc [ns]
        n = {regular ns}@0
        {quote {$ n} + 1}
      }
      {inc 41}
    `;
    expect(run(src, { metaRuntime: new InProcessMetaRuntimeAdapter() })).toBe(42);
    expect(run(src, { metaRuntime: new SubprocessMetaRuntimeAdapter() })).toBe(42);
  });

  test("match short form returns bool", () => {
    expect(run(`{match 2 2}`)).toBe(true);
    expect(run(`{match 2 3}`)).toBe(false);
  });

  test("$r regular patterns", () => {
    const src = `
      {match [2 3 3 5]
        {$r 2 (2..3)*3 5}
          "ok"
        _
          "no"
      }
    `;
    expect(run(src)).toBe("ok");
  });

  test("$type constructor patterns", () => {
    const src = `
      {class Point []
        {fun __init__ [self x y]
          self.x = x
          self.y = y
        }
      }
      {match {new Point [2 3]}
        {$type Point [x=2 y=3]}
          "ok"
        _
          "no"
      }
    `;
    expect(run(src)).toBe("ok");
  });

  test("user-defined pattern hook API", () => {
    clearPatternHooks();
    registerPatternHook({
      name: "even",
      canHandle: (p) => p.kind === "curly" && p.nodes[0]?.kind === "identifier" && p.nodes[0].value === "$even",
      match: (v, _p, env) => (typeof v === "number" && v % 2 === 0 ? env : null),
    });
    expect(run(`{match 6 {$even} "yes" _ "no"}`)).toBe("yes");
    clearPatternHooks();
  });
});
