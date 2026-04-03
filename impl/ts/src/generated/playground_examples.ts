export interface MakrellPlaygroundExample {
  id: string;
  title: string;
  summary: string;
  entryPath: string;
  runtime: "cli" | "browser";
  tags: string[];
  source: string;
}

export const makrellPlaygroundExamples: MakrellPlaygroundExample[] = [
  {
    "id": "hello",
    "title": "Hello and basics",
    "summary": "A compact MakrellTS file showing functions, macros, debug output, and pattern matching.",
    "entryPath": "examples/hello.mrts",
    "runtime": "cli",
    "tags": [
      "intro",
      "core",
      "macro"
    ],
    "source": "{def macro inc [ns]\n  n = {regular ns}@0\n  {quote {$ n} + 1}\n}\n\n{def macro dbg [ns]\n  ns = {regular ns}\n  label = ns@0\n  expr = ns@1\n  {quote\n    {print \"[dbg]\" + {$ label}}\n    tmp = {$ expr}\n    {print \"  ->\" tmp}\n    tmp\n  }\n}\n\n{def macro repeat_add [ns]\n  ns = {regular ns}\n  val = ns@0\n  count = ns@1\n  count = {int count.value}\n  i = 0\n  expr = val\n  {while i < count\n    expr = {quote {inc {$ expr}}}\n    i = i + 1\n  }\n  expr\n}\n\n{print \"== MakrellJs demo starting ==\"}\n\nx = 2\n{print \"x =\" x}\n\ny = {dbg \"inc x\" {inc x}}\nz = {dbg \"repeat_add x 3\" {repeat_add x 3}}\n{print \"y =\" y \", z =\" z}\n\npoint = [\"Point\" 3 5]\n{print \"point =\" point}\n\nclassification = {match [y z point]\n  [3 5 [\"Point\" _ _]]\n    \"shape pipeline matched\"\n  [3 _ _]\n    \"only first value matched\"\n  _\n    \"fallback\"\n}\n\n{print \"classification =\" classification}\n\nverdict = {match z\n  $ > 10\n    \"z is big\"\n  $ > 4 & $ < 10\n    \"z is medium\"\n  _\n    \"z is small\"\n}\n\n{print \"verdict =\" verdict}\n{print \"== MakrellJs demo done ==\"}\n\nclassification + \" / \" + verdict\n"
  },
  {
    "id": "macros-showcase",
    "title": "Shared macro showcase",
    "summary": "The v0.10.0 showcase trio: pipe, rpn, and lisp in the MakrellTS track.",
    "entryPath": "examples/macros/showcase.mrts",
    "runtime": "cli",
    "tags": [
      "macro",
      "pipe",
      "rpn",
      "lisp"
    ],
    "source": "{def macro pipe [ns]\n    ns = {regular ns}\n    p = ns@0\n    i = 1\n    {while i < {len ns}\n        p = {quote {unquote p} | {unquote ns@i}}\n        i = i + 1\n    }\n    p\n}\n\n{def macro rpn [nodes]\n    nodes = {regular nodes}\n    {fun transform [ns]\n        stack = []\n        {for n ns\n            handled = false\n            {when {isinstance n Operator}\n                b = {stack.pop}\n                a = {stack.pop}\n                {stack.push {BinOp a n.value b}}\n                handled = true\n            }\n            {when handled == false\n                {when {isinstance n RoundBrackets}\n                    func = {stack.pop}\n                    args = {stack.pop}\n                    callNodes = [func]\n                    {for arg args\n                        {callNodes.push arg}\n                    }\n                    {stack.push {CurlyBrackets callNodes}}\n                    handled = true\n                }\n            }\n            {when handled == false\n                {stack.push n}\n            }\n        }\n    }\n        stack\n    }\n    {transform nodes}@0\n}\n\n{def macro lisp [nodes]\n    nodes = {regular nodes}\n    sourceNode = nodes@0\n    source = sourceNode.value\n    parsed = {parse source}\n    {fun transform [n]\n        {when {isinstance n RoundBrackets}\n            ns = {regular n.nodes}\n            head = ns@0\n\n            {when {isinstance head Operator}\n                a = {transform ns@1}\n                i = 2\n                {while i < {len ns}\n                    b = {transform ns@i}\n                    a = {BinOp a head.value b}\n                    i = i + 1\n                }\n                {return a}\n            }\n\n            args = []\n            i = 1\n            {while i < {len ns}\n                {args.push {transform ns@i}}\n                i = i + 1\n            }\n            callNodes = [{transform head}]\n            {for arg args\n                {callNodes.push arg}\n            }\n            {return {CurlyBrackets callNodes}}\n        }\n\n        {when {isinstance n SquareBrackets}\n            tns = []\n            {for child n.nodes\n                {tns.push {transform child}}\n            }\n            {return {SquareBrackets tns}}\n        }\n\n        n\n    }\n\n    {transform parsed@0}\n}\n\n{print \"== MakrellTS macro showcase ==\"}\n\ndouble = [x] -> x * 2\nbump = [x] -> x + 3\nsquare = [x] -> x * x\n\npipeResult = {pipe 5 bump square}\n{print \"pipeResult =\" pipeResult}\n\nrpnResult = {rpn 2 3 * 5 7 * +}\n{print \"rpnResult =\" rpnResult}\n\nrpnAdd = {rpn [x y] x y + ->}\nrpnAddResult = {rpnAdd 4 9}\n{print \"rpnAddResult =\" rpnAddResult}\n\nlispAdd = [x y z] -> x + y + z\nlispSquare = [x] -> x * x\n\nlispResult = {lisp \"(lispAdd 6 35 11)\"}\n{print \"lispResult =\" lispResult}\n\nlispSumSquares = {lisp \"(lispAdd (lispSquare 2) (lispSquare 3) (lispSquare 5))\"}\n{print \"lispSumSquares =\" lispSumSquares}\n\n[pipeResult rpnResult rpnAddResult lispResult lispSumSquares]\n"
  },
  {
    "id": "nbody-browser",
    "title": "N-body browser simulation",
    "summary": "A larger browser-facing MakrellTS example with animation state, physics, and canvas drawing.",
    "entryPath": "examples/nbody-browser/app.mrts",
    "runtime": "browser",
    "tags": [
      "browser",
      "simulation",
      "canvas"
    ],
    "source": "{fun resetSim []\n    state.bodies = []\n    state.i = 0\n    {while state.i < params.bodyCount\n        {state.bodies.push {makeBody centerX centerY params.spawnRadius params.velocity}}\n        state.i = state.i + 1\n    }\n    state.lastMerged = 0\n    true\n}\n\n{fun integrate []\n    state.n = state.bodies.length\n    state.dt = params.dt\n    state.G = params.gravity\n    state.soft2 = (params.softening * params.softening) + 0.000000001\n\n    state.i = 0\n    {while state.i < state.n\n        state.bi = {state.bodies.at state.i}\n        state.ax = 0\n        state.ay = 0\n        state.j = 0\n        {while state.j < state.n\n            {when state.i != state.j\n                state.bj = {state.bodies.at state.j}\n                state.dx = state.bj.x - state.bi.x\n                state.dy = state.bj.y - state.bi.y\n                state.d2 = (state.dx * state.dx) + (state.dy * state.dy) + state.soft2\n                state.invD = 1 / {Math.sqrt state.d2}\n                state.invD3 = state.invD * state.invD * state.invD\n                state.f = state.G * state.bj.mass * state.invD3\n                state.ax = state.ax + (state.dx * state.f)\n                state.ay = state.ay + (state.dy * state.f)\n            }\n            state.j = state.j + 1\n        }\n        state.bi.vx = state.bi.vx + (state.ax * state.dt)\n        state.bi.vy = state.bi.vy + (state.ay * state.dt)\n        state.i = state.i + 1\n    }\n\n    state.i = 0\n    {while state.i < state.n\n        state.b = {state.bodies.at state.i}\n        state.b.x = state.b.x + (state.b.vx * state.dt)\n        state.b.y = state.b.y + (state.b.vy * state.dt)\n        state.i = state.i + 1\n    }\n    null\n}\n\n{fun mergeCollisions []\n    state.merged = 0\n    state.i = 0\n    {while state.i < state.bodies.length\n        state.a = {state.bodies.at state.i}\n        state.j = state.i + 1\n        {while state.j < state.bodies.length\n            state.b = {state.bodies.at state.j}\n            state.dx = state.b.x - state.a.x\n            state.dy = state.b.y - state.a.y\n            state.rr = ({bodyRadius state.a.mass}) + ({bodyRadius state.b.mass})\n            {when ((state.dx * state.dx) + (state.dy * state.dy)) <= (state.rr * state.rr)\n                state.m = state.a.mass + state.b.mass\n                state.a.x = ((state.a.x * state.a.mass) + (state.b.x * state.b.mass)) / state.m\n                state.a.y = ((state.a.y * state.a.mass) + (state.b.y * state.b.mass)) / state.m\n                state.a.vx = ((state.a.vx * state.a.mass) + (state.b.vx * state.b.mass)) / state.m\n                state.a.vy = ((state.a.vy * state.a.mass) + (state.b.vy * state.b.mass)) / state.m\n                state.a.mass = state.m\n                state.a.hue = ((state.a.hue * (state.a.mass - state.b.mass)) + (state.b.hue * state.b.mass)) / state.m\n                {state.bodies.splice state.j 1}\n                state.merged = state.merged + 1\n                state.j = state.j - 1\n            }\n            state.j = state.j + 1\n        }\n        state.i = state.i + 1\n    }\n    state.lastMerged = state.merged\n    state.merged\n}\n\n{fun drawFrame []\n    ctx.fillStyle = \"rgba(6, 10, 16, \" + {str params.trail} + \")\"\n    {ctx.fillRect 0 0 canvasWidth canvasHeight}\n\n    {for b state.bodies\n        r = {bodyRadius b.mass}\n        color = \"hsla(\" + {str b.hue} + \", 100%, 78%, 0.9)\"\n        {circle b.x b.y r color}\n    }\n    null\n}\n\n{fun stepSim []\n    {integrate}\n    {mergeCollisions}\n    {drawFrame}\n    null\n}\n\n{fun getStats []\n    state.totalMass = 0\n    state.i = 0\n    {while state.i < state.bodies.length\n        state.totalMass = state.totalMass + {state.bodies.at state.i}.mass\n        state.i = state.i + 1\n    }\n    [state.bodies.length state.totalMass state.lastMerged]\n}\n\n[stepSim resetSim getStats]\r\n"
  }
];
