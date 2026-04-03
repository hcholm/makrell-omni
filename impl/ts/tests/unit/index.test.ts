import { describe, expect, test } from "bun:test";
import {
  clearPatternHooks,
  compile,
  compileToDts,
  compileToTs,
  InProcessMetaRuntimeAdapter,
  parse,
  parseMrtd,
  registerPatternHook,
  readMrtdRecords,
  readMrtdTuples,
  run,
  SubprocessMetaRuntimeAdapter,
  writeMrtdRecords,
  writeMrtdTuples,
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

  test("macro showcase supports pipe, rpn, and lisp", () => {
    const src = `
      {def macro pipe [ns]
        ns = {regular ns}
        p = ns@0
        i = 1
        {while i < {len ns}
          p = {quote {unquote p} | {unquote ns@i}}
          i = i + 1
        }
        p
      }

      {def macro rpn [nodes]
        nodes = {regular nodes}
        {fun transform [ns]
          stack = []
          {for n ns
            handled = false
            {when {isinstance n Operator}
              b = {stack.pop}
              a = {stack.pop}
              {stack.push {BinOp a n.value b}}
              handled = true
            }
            {when handled == false
              {when {isinstance n RoundBrackets}
                func = {stack.pop}
                args = {stack.pop}
                callNodes = [func]
                {for arg args
                  {callNodes.push arg}
                }
                {stack.push {CurlyBrackets callNodes}}
                handled = true
              }
            }
            {when handled == false
              {stack.push n}
            }
          }
          stack
        }
        {transform nodes}@0
      }

      {def macro lisp [nodes]
        nodes = {regular nodes}
        sourceNode = nodes@0
        source = sourceNode.value
        parsed = {parse source}
        {fun transform [n]
          {when {isinstance n RoundBrackets}
            ns = {regular n.nodes}
            head = ns@0

            {when {isinstance head Operator}
              a = {transform ns@1}
              i = 2
              {while i < {len ns}
                b = {transform ns@i}
                a = {BinOp a head.value b}
                i = i + 1
              }
              {return a}
            }

            args = []
            i = 1
            {while i < {len ns}
              {args.push {transform ns@i}}
              i = i + 1
            }
            callNodes = [{transform head}]
            {for arg args
              {callNodes.push arg}
            }
            {return {CurlyBrackets callNodes}}
          }

          {when {isinstance n SquareBrackets}
            tns = []
            {for child n.nodes
              {tns.push {transform child}}
            }
            {return {SquareBrackets tns}}
          }

          n
        }

        {transform parsed@0}
      }

      double = [x] -> x * 2
      bump = [x] -> x + 3
      square = [x] -> x * x

      pipeResult = {pipe 5 bump square}
      rpnResult = {rpn 2 3 * 5 7 * +}
      rpnAdd = {rpn [x y] x y + ->}
      rpnAddResult = {rpnAdd 4 9}
      lispAdd = [x y z] -> x + y + z
      lispSquare = [x] -> x * x
      lispResult = {lisp "(lispAdd 6 35 11)"}
      lispSumSquares = {lisp "(lispAdd (lispSquare 2) (lispSquare 3) (lispSquare 5))"}

      [pipeResult rpnResult rpnAddResult lispResult lispSumSquares]
    `;
    expect(run(src)).toEqual([64, 107, 13, 52, 38]);
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

  test("runtime import and import-from", () => {
    const scope = {
      __mr_modules: {
        math: {
          sqrt: (x: number) => Math.sqrt(x),
        },
      },
    };
    expect(run(`
      {import math}
      {math.sqrt 9}
    `, { scope })).toBe(3);

    expect(run(`
      {import math@[sqrt]}
      {sqrt 16}
    `, { scope })).toBe(4);
  });

  test("compile-time importm macro import", () => {
    const body = parse(`
      n = {regular ns}@0
      {quote {$ n} + 1}
    `);
    const scope = {
      __mr_modules: {
        tools: {
          __mr_meta__: [
            {
              name: "inc",
              params: ["ns"],
              body,
            },
          ],
        },
      },
    };
    expect(run(`
      {importm tools@[inc]}
      {inc 41}
    `, { scope })).toBe(42);
  });

  test("typed output: ts emit keeps annotations", () => {
    const src = `
      {fun add [x:int y:int]
        x + y
      }
      out:int = {add 2 3}
      out
    `;
    const tsOut = compileToTs(src);
    expect(tsOut).toContain("x: number");
    expect(tsOut).toContain("y: number");
    expect(tsOut).toContain("var out: number =");
  });

  test("typed output: d.ts emit creates declarations", () => {
    const src = `
      {fun add [x:int y:int]
        x + y
      }
      out:int = {add 2 3}
    `;
    const dts = compileToDts(src);
    expect(dts).toContain("export function add(x: number, y: number): unknown;");
    expect(dts).toContain("export let out: number;");
  });

  test("parseMrtd reads simple tabular data", () => {
    const document = parseMrtd(`
      name:string age:int active:bool
      Ada 32 true
      "Rena Holm" 29 false
    `);

    expect(document.columns).toEqual([
      { name: "name", type: "string" },
      { name: "age", type: "int" },
      { name: "active", type: "bool" },
    ]);
    expect(document.records[1]).toEqual({
      name: "Rena Holm",
      age: 29,
      active: false,
    });
  });

  test("readMrtdRecords maps rows to class instances", () => {
    class Person {
      name = "";
      age = 0;
      active = false;
    }

    const rows = readMrtdRecords(`
      name:string age:int active:bool
      Ada 32 true
      Ben 41 false
    `, Person);

    expect(rows[0]).toBeInstanceOf(Person);
    expect(rows[0].name).toBe("Ada");
    expect(rows[1].age).toBe(41);
  });

  test("readMrtdTuples maps rows to tuple-shaped arrays", () => {
    const rows = readMrtdTuples<[number, string, number]>(`
      id:int name:string score:float
      1 Ada 13.5
      2 Ben 9.25
    `);

    expect(rows).toEqual([
      [1, "Ada", 13.5],
      [2, "Ben", 9.25],
    ]);
  });

  test("parseMrtd supports multiline rows", () => {
    const document = parseMrtd(`
      name:string note:string score:float
      ( "Rena Holm"
        "line wrapped"
        13.5 )
    `);

    expect(document.records).toEqual([
      {
        name: "Rena Holm",
        note: "line wrapped",
        score: 13.5,
      },
    ]);
  });

  test("writeMrtdRecords writes typed header and rows", () => {
    const text = writeMrtdRecords([
      { name: "Ada", age: 32, active: true },
      { name: "Rena Holm", age: 29, active: false },
    ]);

    expect(text).toContain("name:string age:int active:bool");
    expect(text).toContain("Ada 32 true");
    expect(text).toContain("\"Rena Holm\" 29 false");
  });

  test("writeMrtdTuples writes tuple rows with default headers", () => {
    const text = writeMrtdTuples([
      [1, "Ada", 13.5],
      [2, "Ben", 9.25],
    ]);

    expect(text).toContain("c1:int c2:string c3:float");
    expect(text).toContain("1 Ada 13.5");
  });

  test("parseMrtd rejects profile suffixes in core mode", () => {
    expect(() => parseMrtd(`
      when:string
      "2026-04-03"dt
    `)).toThrow(/extended-scalars/);
  });

  test("parseMrtd accepts extended scalar profile suffixes", () => {
    const document = parseMrtd(`
      when bonus:float
      "2026-04-03"dt 3k
    `, { profiles: ["extended-scalars"] });

    expect(document.records[0].when).toBeInstanceOf(Date);
    expect(document.records[0].bonus).toBe(3000);
  });

  test("writeMrtdRecords writes Date values with extended scalar profile", () => {
    const text = writeMrtdRecords([
      { when: new Date("2026-04-03T00:00:00.000Z"), active: true },
    ], { profiles: ["extended-scalars"] });

    expect(text).toContain('when active:bool');
    expect(text).toContain('"2026-04-03T00:00:00.000Z"dt true');
  });
});
