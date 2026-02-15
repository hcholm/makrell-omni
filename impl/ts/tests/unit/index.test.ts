import { describe, expect, test } from "bun:test";
import { run } from "../../src/index";

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
});
