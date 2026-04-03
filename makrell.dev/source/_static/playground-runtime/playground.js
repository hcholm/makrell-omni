// @bun
// src/generated/playground_examples.ts
var makrellPlaygroundExamples = [
  {
    id: "hello",
    title: "Hello and basics",
    summary: "A compact MakrellTS file showing functions, macros, debug output, and pattern matching.",
    entryPath: "examples/hello.mrts",
    runtime: "cli",
    tags: [
      "intro",
      "core",
      "macro"
    ],
    source: `{def macro inc [ns]
  n = {regular ns}@0
  {quote {$ n} + 1}
}

{def macro dbg [ns]
  ns = {regular ns}
  label = ns@0
  expr = ns@1
  {quote
    {print "[dbg]" + {$ label}}
    tmp = {$ expr}
    {print "  ->" tmp}
    tmp
  }
}

{def macro repeat_add [ns]
  ns = {regular ns}
  val = ns@0
  count = ns@1
  count = {int count.value}
  i = 0
  expr = val
  {while i < count
    expr = {quote {inc {$ expr}}}
    i = i + 1
  }
  expr
}

{print "== MakrellJs demo starting =="}

x = 2
{print "x =" x}

y = {dbg "inc x" {inc x}}
z = {dbg "repeat_add x 3" {repeat_add x 3}}
{print "y =" y ", z =" z}

point = ["Point" 3 5]
{print "point =" point}

classification = {match [y z point]
  [3 5 ["Point" _ _]]
    "shape pipeline matched"
  [3 _ _]
    "only first value matched"
  _
    "fallback"
}

{print "classification =" classification}

verdict = {match z
  $ > 10
    "z is big"
  $ > 4 & $ < 10
    "z is medium"
  _
    "z is small"
}

{print "verdict =" verdict}
{print "== MakrellJs demo done =="}

classification + " / " + verdict
`
  },
  {
    id: "macros-showcase",
    title: "Shared macro showcase",
    summary: "The v0.10.0 showcase trio: pipe, rpn, and lisp in the MakrellTS track.",
    entryPath: "examples/macros/showcase.mrts",
    runtime: "cli",
    tags: [
      "macro",
      "pipe",
      "rpn",
      "lisp"
    ],
    source: `{def macro pipe [ns]
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

{print "== MakrellTS macro showcase =="}

double = [x] -> x * 2
bump = [x] -> x + 3
square = [x] -> x * x

pipeResult = {pipe 5 bump square}
{print "pipeResult =" pipeResult}

rpnResult = {rpn 2 3 * 5 7 * +}
{print "rpnResult =" rpnResult}

rpnAdd = {rpn [x y] x y + ->}
rpnAddResult = {rpnAdd 4 9}
{print "rpnAddResult =" rpnAddResult}

lispAdd = [x y z] -> x + y + z
lispSquare = [x] -> x * x

lispResult = {lisp "(lispAdd 6 35 11)"}
{print "lispResult =" lispResult}

lispSumSquares = {lisp "(lispAdd (lispSquare 2) (lispSquare 3) (lispSquare 5))"}
{print "lispSumSquares =" lispSumSquares}

[pipeResult rpnResult rpnAddResult lispResult lispSumSquares]
`
  },
  {
    id: "nbody-browser",
    title: "N-body browser simulation",
    summary: "A larger browser-facing MakrellTS example with animation state, physics, and canvas drawing.",
    entryPath: "examples/nbody-browser/app.mrts",
    runtime: "browser",
    tags: [
      "browser",
      "simulation",
      "canvas"
    ],
    source: `{fun resetSim []
    state.bodies = []
    state.i = 0
    {while state.i < params.bodyCount
        {state.bodies.push {makeBody centerX centerY params.spawnRadius params.velocity}}
        state.i = state.i + 1
    }
    state.lastMerged = 0
    true
}

{fun integrate []
    state.n = state.bodies.length
    state.dt = params.dt
    state.G = params.gravity
    state.soft2 = (params.softening * params.softening) + 0.000000001

    state.i = 0
    {while state.i < state.n
        state.bi = {state.bodies.at state.i}
        state.ax = 0
        state.ay = 0
        state.j = 0
        {while state.j < state.n
            {when state.i != state.j
                state.bj = {state.bodies.at state.j}
                state.dx = state.bj.x - state.bi.x
                state.dy = state.bj.y - state.bi.y
                state.d2 = (state.dx * state.dx) + (state.dy * state.dy) + state.soft2
                state.invD = 1 / {Math.sqrt state.d2}
                state.invD3 = state.invD * state.invD * state.invD
                state.f = state.G * state.bj.mass * state.invD3
                state.ax = state.ax + (state.dx * state.f)
                state.ay = state.ay + (state.dy * state.f)
            }
            state.j = state.j + 1
        }
        state.bi.vx = state.bi.vx + (state.ax * state.dt)
        state.bi.vy = state.bi.vy + (state.ay * state.dt)
        state.i = state.i + 1
    }

    state.i = 0
    {while state.i < state.n
        state.b = {state.bodies.at state.i}
        state.b.x = state.b.x + (state.b.vx * state.dt)
        state.b.y = state.b.y + (state.b.vy * state.dt)
        state.i = state.i + 1
    }
    null
}

{fun mergeCollisions []
    state.merged = 0
    state.i = 0
    {while state.i < state.bodies.length
        state.a = {state.bodies.at state.i}
        state.j = state.i + 1
        {while state.j < state.bodies.length
            state.b = {state.bodies.at state.j}
            state.dx = state.b.x - state.a.x
            state.dy = state.b.y - state.a.y
            state.rr = ({bodyRadius state.a.mass}) + ({bodyRadius state.b.mass})
            {when ((state.dx * state.dx) + (state.dy * state.dy)) <= (state.rr * state.rr)
                state.m = state.a.mass + state.b.mass
                state.a.x = ((state.a.x * state.a.mass) + (state.b.x * state.b.mass)) / state.m
                state.a.y = ((state.a.y * state.a.mass) + (state.b.y * state.b.mass)) / state.m
                state.a.vx = ((state.a.vx * state.a.mass) + (state.b.vx * state.b.mass)) / state.m
                state.a.vy = ((state.a.vy * state.a.mass) + (state.b.vy * state.b.mass)) / state.m
                state.a.mass = state.m
                state.a.hue = ((state.a.hue * (state.a.mass - state.b.mass)) + (state.b.hue * state.b.mass)) / state.m
                {state.bodies.splice state.j 1}
                state.merged = state.merged + 1
                state.j = state.j - 1
            }
            state.j = state.j + 1
        }
        state.i = state.i + 1
    }
    state.lastMerged = state.merged
    state.merged
}

{fun drawFrame []
    ctx.fillStyle = "rgba(6, 10, 16, " + {str params.trail} + ")"
    {ctx.fillRect 0 0 canvasWidth canvasHeight}

    {for b state.bodies
        r = {bodyRadius b.mass}
        color = "hsla(" + {str b.hue} + ", 100%, 78%, 0.9)"
        {circle b.x b.y r color}
    }
    null
}

{fun stepSim []
    {integrate}
    {mergeCollisions}
    {drawFrame}
    null
}

{fun getStats []
    state.totalMass = 0
    state.i = 0
    {while state.i < state.bodies.length
        state.totalMass = state.totalMass + {state.bodies.at state.i}.mass
        state.i = state.i + 1
    }
    [state.bodies.length state.totalMass state.lastMerged]
}

[stepSim resetSim getStats]\r
`
  }
];

// src/playground.ts
function getMakrellPlaygroundExample(id) {
  return makrellPlaygroundExamples.find((example) => example.id === id);
}
export {
  makrellPlaygroundExamples,
  getMakrellPlaygroundExample
};

//# debugId=1DE6BC7ABAB0FA8164756E2164756E21
//# sourceMappingURL=playground.js.map
