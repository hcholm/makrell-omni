Makrell: Shared Structural Substrates for Code, Data, and Markup
=================================================================

.. rubric:: A technical article on the architecture and design of the Makrell language family.

Abstract
--------

The Makrell language family is built on a single proposition: programming
languages, data notations, and markup systems share enough representational
structure that they can be derived as different semantic interpretations of
one common substrate, rather than developed as independent artefacts with
incompatible grammars and toolchains.

This article describes the architecture that follows from that proposition.
It covers the shared parsing pipeline (MBF), the family members that sit on
top of it (Makrell, MRON, MRML, MRTD), the syntax model and operator system,
the compilation pipelines for each host target, the source-preserving macro
system, pattern matching, and the multi-host implementation strategy across
Python, TypeScript, and .NET. It treats the features present in v0.10.0 as
the baseline and discusses both the contributions and the open questions of
the design.


1. Introduction
---------------

A modern software project routinely depends on several textual notations that
exist in mutual isolation. Application logic lives in one language.
Configuration is expressed in another. Markup for documents or user
interfaces uses a third. Deployment descriptors may introduce a fourth. Each
has its own grammar, parser, escape conventions, and tooling. Moving data
between them requires serialisation libraries, template engines, or string
interpolation --- mechanisms that are inherently fragile because they bridge
syntactically unrelated worlds.

Consider the typical web application stack. JavaScript handles logic. JSON
handles configuration and data interchange. HTML handles document structure.
CSS handles presentation. YAML may handle deployment. Each format has its own
quoting rules, nesting conventions, and error models. Embedding one inside
another --- JavaScript inside HTML, JSON inside JavaScript, template
expressions inside any of them --- is a perennial source of escaping bugs,
injection vulnerabilities, and tooling gaps.

This fragmentation is not the result of deliberate design. It reflects the
historical independence of the communities that produced these formats.
Programming language designers, data format designers, and markup language
designers have traditionally worked in separate intellectual traditions with
separate priorities.

The Makrell project investigates whether this fragmentation is necessary. Its
central hypothesis is that a well-designed structural substrate can support
programming, data notation, and markup as distinct but structurally related
semantic layers. The aim is not a universal language that collapses all
distinctions but a *family architecture* in which distinct members share
enough common structure to benefit from unified tooling, coherent quoting,
and cross-layer transformation.

This article examines that hypothesis through the lens of the implemented
system as of v0.10.0 --- the first release intended to present Makrell as a
coherent family rather than a collection of separate experiments.


2. The Makrell Family at v0.10.0
--------------------------------

The family currently comprises the following members:

**MBF** (Makrell Base Format)
    The shared structural substrate: tokenisation, bracket nesting, and
    operator parsing in a single pipeline.

**Makrell**
    The programmable language layer, with functions, classes, pattern
    matching, pipes, async/await, exception handling, macros, and
    compile-time execution.

**MRON** (Makrell Object Notation)
    A structured data format, comparable in role to JSON or TOML, built
    directly on MBF bracket structure.

**MRML** (Makrell Markup Language)
    A lightweight markup notation, comparable in role to HTML or XML,
    also built on MBF bracket structure.

**MRTD** (Makrell Tabular Data)
    A tabular data format for structured rows and columns, introduced as
    a family-level format in v0.10.0.

Three host-language implementation tracks carry the programming layer:

* **MakrellPy** targets Python and serves as the deepest semantic reference.
* **MakrellTS** targets TypeScript and JavaScript, including browser
  environments, and is the current reference implementation.
* **Makrell#** targets .NET and the CLR, with Roslyn-based compilation,
  CLR interop, and dynamic module loading.

All three tracks share the same MBF parsing pipeline and are subject to
cross-track parity testing. The v0.10.0 release establishes a shared
async/await baseline, compile-time pattern matching across tracks, and a
common set of showcase macros (``pipe``, ``rpn``, ``lisp``) implemented in
all three.


3. MBF: The Shared Parsing Architecture
----------------------------------------

3.1 Three-level pipeline
^^^^^^^^^^^^^^^^^^^^^^^^^

MBF defines a three-level parsing pipeline that is shared across all family
members without modification.

**Level 0: Tokenisation.** A UTF-8 source string is transformed into a
stream of classified tokens: whitespace, comment, identifier, string literal,
number literal, bracket (opening or closing), and operator. Identifiers
begin with a Unicode letter, underscore, or dollar sign, and continue with
letters, digits, underscores, or dollar signs. String and number literals
support optional suffixes that are preserved as part of the token for later
semantic interpretation --- for example, ``"2026-04-01"dt`` for datetime
parsing, ``"ff"hex`` for hexadecimal conversion, or ``2.5M`` for scale
multiplication. Comments use ``#`` for line comments and ``/* ... */`` for
block comments.

**Level 1: Bracket parsing.** The token stream is transformed into a tree
of nested bracket nodes. Three bracket types are recognised: round ``()``,
square ``[]``, and curly ``{}``. Each bracket node contains an ordered
sequence of children, which may be tokens or nested bracket nodes.
Mismatched brackets produce parse errors. Whitespace and comment tokens are
preserved as nodes in the tree; they are not discarded.

**Level 2: Operator parsing.** Within bracket groups, sequences of nodes
are restructured into binary operator trees according to a configurable
precedence table. The parser uses a precedence-climbing algorithm (a variant
of Pratt parsing) that handles both left-associative and right-associative
operators. Unknown operators default to precedence 0, left-associative.

3.2 The operator precedence table
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The default precedence table is central to how Makrell code reads. Higher
precedence means tighter binding:

.. list-table::
   :header-rows: 1
   :widths: 30 20 20

   * - Operator(s)
     - Precedence
     - Associativity
   * - ``.`` (member access)
     - 200
     - left
   * - ``@`` (indexing)
     - 140
     - left
   * - ``**`` (exponentiation)
     - 130
     - right
   * - ``*``, ``/``, ``%``
     - 120
     - left
   * - ``+``, ``-``
     - 110
     - left
   * - ``..`` (range)
     - 90
     - left
   * - ``~=``, ``!~=``, ``==``, ``!=``, ``<``, ``>``, ``<=``, ``>=``
     - 50
     - left
   * - ``&&``, ``||``
     - 45
     - left
   * - ``->`` (lambda)
     - 30
     - right
   * - ``|``, ``|*`` (pipe, map pipe)
     - 20
     - left
   * - ``\\``, ``*\\`` (reverse pipe, reverse map pipe)
     - 20
     - right
   * - ``=`` (assignment)
     - 5
     - right

This arrangement is carefully tuned. The placement of ``->`` below
comparison operators but above pipes means that
``x -> x > 3 | {filter _}`` first constructs the lambda ``x -> (x > 3)``,
then pipes the resulting function. Assignment at the bottom means that
``result = [1 2 3] | sum`` assigns the piped result, not the list. The
``@`` operator for indexing sits high enough that ``items @ 0 + 1`` indexes
first and adds second, matching the natural reading.

The table is extensible. User-defined operators can be registered with
specified precedence and associativity:

.. code-block:: makrell

    {def operator <=> 50 left}

3.3 Why the pipeline matters
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The pipeline is fully shared. The same tokeniser, bracket parser, and
operator parser serve the Makrell programming language, MRON data parsing,
MRML markup parsing, and MRTD tabular parsing. The family members differ
only in the semantic interpretation applied to the resulting tree.

The preservation of whitespace as nodes is a deliberate choice, not an
oversight. MRML relies on text content between elements, which appears as
whitespace-adjacent tokens in the MBF tree. Macros receive input that
includes these nodes and can choose explicitly whether to preserve or discard
them. This opt-in regularisation, rather than mandatory normalisation, is
what makes whitespace-sensitive macros and the MRML interpretation possible.

3.4 Tooling implications
^^^^^^^^^^^^^^^^^^^^^^^^^^

Because parsing is shared, any tool that operates on MBF structure ---
formatters, linters, syntax highlighters, structural validators --- works
across the entire family without per-format adaptation. The v0.10.0 VS Code
extension and the ``makrell-family-lsp`` language server both exploit this:
they provide diagnostics, highlighting, and navigation for all family members
through the same parsing infrastructure.


4. Semantic Layers: Data, Markup, and Tabular Formats
-----------------------------------------------------

The value of a shared substrate lies in what can be built on top of it. Each
family member applies a different semantic reading to the same MBF tree.

4.1 MRON (Makrell Object Notation)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

MRON interprets MBF bracket structure as structured data. The rules are
concise:

* At root or curly-bracket scope, an even number of regularised children
  produces an object (alternating keys and values).
* A single child produces a scalar value.
* Zero children produce null.
* An odd count greater than one is an error.
* Square brackets produce arrays.

String and number suffixes are interpreted as value conversions: ``dt`` for
ISO datetime, ``hex`` for hexadecimal, ``M`` for millions, ``pi`` for
multiplication by pi, and so on.

.. code-block:: makrell

    owner "Rena Holm"
    version "0.10.0"
    features ["macros" "mron" "mrml" "mrtd"]
    async true
    books [
        { title "Book 1" year 1963 author "Author A" }
        { title "Book 2" year 2024 author "Author B" }
    ]

Several things are notable about this format. There are no colons between
keys and values. There are no commas between entries. Curly brackets denote
nested objects, and square brackets denote arrays, following MBF's bracket
conventions. The result is a format that is more visually spare than JSON
while remaining structurally unambiguous.

MRON also supports executable embeds via ``{$ expr}`` when the
``allow_exec`` flag is set, allowing computed values in otherwise static
data. This is disabled by default for security.

MRON is not a separate grammar. It is a semantic reading of MBF bracket
structure. A standard MBF parser produces the tree; only the interpretation
layer is MRON-specific. In the .NET track, MRON parses to
``System.Text.Json.JsonDocument``, allowing direct integration with existing
.NET JSON tooling.

4.2 MRML (Makrell Markup Language)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

MRML interprets curly-bracket forms as markup elements. The first identifier
is the element name. An optional first square-bracket child provides
attributes as key-value pairs. Remaining children are content: nested
elements or text.

.. code-block:: makrell

    {html [lang="en"]
        {head {title "Makrell Documentation"}}
        {body
            {h1 "Welcome"}
            {p "A small example of MRML markup."}
            {ul
                {li "Compact syntax"}
                {li "Familiar structure"}
                {li "Programmable when needed"}}}}

Like MRON, MRML is a semantic interpretation of MBF, not a separate parse.
Adjacent text fragments are concatenated in document order. The output
serialises naturally to XML or HTML. In the .NET track, MRML parses to
``System.Xml.Linq.XDocument``, making it directly usable with existing XML
and document-processing libraries. In MakrellTS, it produces a
DOM-compatible tree.

The ``{$ expr}`` embed syntax is shared with MRON, allowing dynamic content
to be inserted when appropriate. This means MRML can function as a
lightweight template language without requiring a separate templating engine.

4.3 MRTD (Makrell Tabular Data)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

MRTD is the family's tabular data format, introduced as a first-class member
in v0.10.0. It applies a typed row-and-column reading to MBF structure:

.. code-block:: makrell

    sku:string  qty:int  price:float  active:bool
    "A-1"       2        19.5         true
    "B-2"       1        4.0          false

The header row defines column names and types. Data rows follow with
space-separated values aligned to the header. Supported types include
``string``, ``int``, ``float``, and ``bool``. Number suffixes apply as they
do elsewhere in MBF, so ``2k`` in a numeric column means 2000 and ``90deg``
means approximately 1.571 radians.

MRTD has typed read/write helpers across all three implementation tracks and a
shared basic suffix profile for richer scalar values. Its inclusion in v0.10.0 demonstrates that the MBF substrate can
accommodate a fourth semantic layer --- tabular data --- without
modification to the shared parsing pipeline.


5. The Programming Layer: Syntax and Semantics
----------------------------------------------

The Makrell programming language is expression-oriented. All constructs
produce values, including conditionals, loops, match expressions, and block
forms.

5.1 Function application and reserved forms
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Function application uses curly brackets: ``{f a b c}`` calls ``f`` with
arguments ``a``, ``b``, and ``c``. This is the backbone of the syntax. Its
regularity is an asset: every curly form is either a function call or a
reserved form, and reserved forms are syntactically identical to calls.
The grammar does not differentiate; only the compiler does, after parsing.

Reserved forms include:

* ``{if cond then_val else_val}`` --- conditional expression
* ``{when cond body}`` --- conditional with implicit null else
* ``{while cond body}`` --- loop
* ``{for item iterable body}`` --- iteration
* ``{fun name [args] body}`` --- named function
* ``{fun [args] body}`` --- anonymous function
* ``{class Name [bases] methods...}`` --- class definition
* ``{dataclass Name field:type...}`` --- data class (Python track)
* ``{match value pattern1 result1 ...}`` --- pattern matching
* ``{do stmts... expr}`` --- scoped block with implicit return
* ``{meta code}`` --- compile-time execution
* ``{quote expr}`` / ``{unquote expr}`` --- quotation
* ``{try body {catch ...} {finally ...}}`` --- exception handling
* ``{async fun ...}`` / ``{await expr}`` --- asynchronous operations
* ``{import ...}`` / ``{importm ...}`` --- module and macro import
* ``{def macro ...}`` / ``{def operator ...}`` --- definitions

5.2 Functions and lambdas
^^^^^^^^^^^^^^^^^^^^^^^^^^

Functions can be defined in named or anonymous form:

.. code-block:: makrell

    # Named function
    {fun add [x y]
        x + y}

    # Anonymous function
    {fun [x y] x + y}

    # Lambda with arrow operator
    x -> x * 2
    [x y] -> x + y

    # Partial application with _ placeholder
    add3 = {add 3 _}
    double = {mul 2 _}

The ``_`` placeholder deserves attention. When it appears inside a curly
call, the compiler transforms the entire call into a lambda whose parameters
replace the placeholders. ``{add 2 _}`` becomes a function of one argument
that adds 2 to it. Multiple ``_`` placeholders create multiple parameters.
This mechanism avoids the need for a separate partial-application syntax and
integrates naturally with pipes.

5.3 Compositional operators
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Several operators support a compositional, data-flow programming style:

.. code-block:: makrell

    # Pipe: left-to-right data flow
    [1 2 3 4 5] | {filter {< _ 4}} | {map {* _ 2}} | sum

    # Map pipe: apply function to each element
    [1 2 3] |* double

    # Reverse pipe: right-to-left application
    sum \\ [1 2 3]

    # Lambdas compose naturally with pipes
    users | {filter u -> u.active} | {map u -> u.name} | {sort _}

The pipe operator ``|`` rewrites ``a | f`` to ``{f a}``, threading a value
through a chain of transformations left to right. The map pipe ``|*``
applies a function to each element of a collection. The reverse pipe ``\\``
rewrites ``f \\ a`` to ``{f a}``, useful when a right-to-left reading is
more natural.

These operators interact well because their precedence levels are carefully
arranged. The arrow ``->`` binds more tightly than pipes, so
``x -> x * 2 | f`` first constructs the lambda and then pipes the resulting
function. Pipes bind more loosely than arithmetic and comparison, so
``a + b | f`` pipes the sum. Assignment binds most loosely of all, so
``result = [1 2 3] | sum`` assigns 6 to ``result``.

5.4 Control flow
^^^^^^^^^^^^^^^^^

Conditionals are expressions that return values:

.. code-block:: makrell

    # If/else expression
    status = {if x > 0 "positive" "non-positive"}

    # Chained conditions
    label = {if x > 100 "high"
                x > 50  "medium"
                         "low"}

    # When (returns null if condition is false)
    {when debug {print "trace:" value}}

Loops are straightforward:

.. code-block:: makrell

    # While loop
    {while i < 10
        i = i + 1}

    # For loop
    {for item items
        {process item}}

The ``{do ...}`` form creates an explicit scope and returns the value of its
last expression:

.. code-block:: makrell

    result = {do
        x = 5
        y = 10
        z = x * y
        z + 3}

This compiles to an immediately-invoked function expression (IIFE) in all
three tracks, isolating the inner variables from the surrounding scope.

5.5 Classes and data classes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Class definitions follow the same curly-bracket form:

.. code-block:: makrell

    {class Point
        {fun __init__ [self x y]
            self.x = x
            self.y = y}
        {fun distance [self]
            {Math.sqrt (self.x ** 2 + self.y ** 2)}}}

    # Inheritance
    {class Point3D [Point]
        {fun __init__ [self x y z]
            {{super}.__init__ x y}
            self.z = z}}

In the Python track, ``{dataclass ...}`` provides a concise form for data
classes:

.. code-block:: makrell

    {dataclass User
        name:str
        age:int
        email:str}

This compiles to a Python ``@dataclass``-decorated class with the annotated
fields, automatically generating ``__init__``, ``__repr__``, and comparison
methods.

5.6 Exception handling
^^^^^^^^^^^^^^^^^^^^^^^

The ``{try ...}`` form supports structured exception handling:

.. code-block:: makrell

    {try
        risky_operation
        another_operation
        {catch e:ValueError
            {print "Bad value:" e}}
        {catch TypeError
            {print "Type error"}}
        {else
            {print "No error"}}
        {finally
            {print "Cleanup"}}}

Catch clauses support optional type filtering and optional binding.
The ``{else}`` clause runs if no exception was raised. The ``{finally}``
clause runs unconditionally.

5.7 Async/await
^^^^^^^^^^^^^^^^

As of v0.10.0, async/await has a shared baseline across all three tracks:

.. code-block:: makrell

    {async fun fetch_data [url]
        response = {await {http.get url}}
        response.body}

    # Async for (Python track)
    {async for item items
        {await {process item}}}

5.8 The suffix system
^^^^^^^^^^^^^^^^^^^^^^

MBF literals support optional suffixes that are interpreted by the semantic
layer. This eliminates the need for explicit conversion calls in many common
cases.

**Built-in string suffixes:**

* ``dt`` --- parse as ISO datetime: ``"2026-04-01"dt``
* ``hex`` --- parse as hexadecimal integer: ``"ff"hex`` (yields 255)
* ``bin`` --- parse as binary integer: ``"1010"bin`` (yields 10)
* ``oct`` --- parse as octal integer: ``"77"oct`` (yields 63)
* ``regex`` --- compile as regular expression: ``"[a-z]+"regex``
* ``e`` --- interpolated expression string: ``"Hello {name}"e``

**Built-in number suffixes:**

* ``k``, ``M``, ``G``, ``T``, ``P``, ``E`` --- scale by powers of 10\ :sup:`3`
  (``2.5M`` = 2,500,000)
* ``pi`` --- multiply by pi (``2pi`` = 6.283...)
* ``tau`` --- multiply by tau (``1tau`` = 6.283...)
* ``deg`` --- degrees to radians (``90deg`` = 1.571...)
* ``e`` --- multiply by Euler's number (``2e`` = 5.436...)
* ``i`` --- imaginary component (``3i`` for complex numbers)

Suffixes are extensible. User-defined suffixes can be registered for strings,
integers, and floats:

.. code-block:: makrell

    {def strsuffix json
        [s] -> {json.loads s}}

    data = "{\"x\": 1}"json

**Interpolated expression strings** (the ``e`` suffix) deserve special
mention. The string ``"Hello {name}, you are {age}"e`` is parsed into a
concatenation of string segments and embedded expressions. Embedded
``{...}`` segments are compiled as Makrell expressions and coerced to
strings at runtime. This provides string interpolation without requiring a
separate template syntax.


6. Pattern Matching
-------------------

The pattern matching system merits extended discussion because it goes
beyond what most mainstream languages offer and because it demonstrates
how MBF's structural uniformity benefits a complex language feature.

6.1 Pattern forms
^^^^^^^^^^^^^^^^^^

The ``{match ...}`` form evaluates an expression against a series of
pattern-result pairs:

.. code-block:: makrell

    {match value
        pattern1  result1
        pattern2  result2
        _         default_result}

The pattern language includes:

* **Literal patterns**: numbers, strings, booleans, null. Match by value
  equality.

* **Wildcard**: ``_`` matches anything and binds nothing.

* **Binding**: ``name = pattern`` binds the matched value to ``name`` if
  the inner pattern succeeds.

* **Alternatives**: ``p1 | p2`` succeeds if either pattern matches.

* **List patterns**: ``[a b c]`` matches a three-element list, binding each
  position.

* **Type/constructor patterns**: ``{$type T [positional] [keyword]}``
  destructures by constructor shape. Supports positional arguments, keyword
  arguments, and mixed forms. In the Python track, positional matching uses
  the ``__match_args__`` attribute or dataclass field order.

* **Regular sequence patterns**: ``[$r ...]`` with quantifiers (see below).

The ``~=`` and ``!~=`` operators provide pattern matching as a boolean
expression outside of ``{match ...}``:

.. code-block:: makrell

    {if value ~= [_ _ _]
        "three-element list"
        "something else"}

6.2 Regular sequence patterns
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The regular sequence patterns are the most distinctive feature of Makrell's
pattern matching. They bring a regex-like matching expressiveness to list
structures:

.. code-block:: makrell

    {match items
        [$r 1 (any _) 3]         "starts with 1, ends with 3"
        [$r (some 0)]             "one or more zeros"
        [$r (maybe "header") $rest]  "optional header, then rest"
        [$r 1 (3* _) 5]          "1, exactly three items, then 5"
        [$r (2..5)* "x"]         "two to five x's"
        _                         "other"}

Available quantifiers:

* ``maybe`` (0--1 occurrences)
* ``some`` (1 or more)
* ``any`` (0 or more)
* ``3*`` (exactly 3)
* ``(2..5)*`` (between 2 and 5)

The ``$rest`` marker captures the remaining unmatched tail of a sequence.

This is uncommon among programming languages. Most languages that offer
pattern matching provide only fixed-length list destructuring. Makrell's
regular patterns allow matching against variable-length sequences with
structural constraints, which is valuable for applications that process
protocol messages, AST fragments, command pipelines, event streams, or
structured data that follows semi-regular patterns.

6.3 Type and constructor patterns
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Constructor patterns support three forms of destructuring:

.. code-block:: makrell

    # Positional only
    {match point
        {$type Point [2 3]}  "at origin-adjacent"
        {$type Point [x y]}  "at ({x}, {y})"e}

    # Keyword only
    {match point
        {$type Point [x=0 y=0]}  "at origin"}

    # Mixed positional and keyword
    {match point
        {$type Point [x] [y=0]}  "on x-axis at {x}"e}

Type-only checking (without destructuring) uses the bare form:

.. code-block:: makrell

    {match value
        _:str  "a string"
        _:int  "an integer"
        _      "other"}


7. Macros, Meta-Execution, and Source Preservation
--------------------------------------------------

The macro and meta-programming system is where Makrell most clearly
distinguishes itself from both mainstream languages and from prior
Lisp-derived macro systems.

7.1 The macro model
^^^^^^^^^^^^^^^^^^^^

Macros are defined with ``{def macro name [params] body}`` and expanded
during compilation. When the compiler encounters a curly form whose head
matches a registered macro, it invokes the macro with the remaining nodes as
arguments. The body executes in the compile-time environment and returns
replacement nodes that are spliced into the AST.

The defining property of Makrell macros is that input nodes may include
whitespace and comments. The macro author explicitly calls ``regular`` to
obtain a whitespace-stripped version when desired. This opt-in
regularisation is what enables whitespace-sensitive macros and, by extension,
the MRML interpretation itself --- MRML is, at a structural level, a
particular way of reading MBF nodes in which whitespace between elements
carries meaning as text content.

7.2 Quotation and unquotation
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

``{quote ...}`` returns its argument as an unevaluated MBF node.
``{unquote ...}`` inside a quote evaluates its argument and splices the
result. Nested quotation tracks depth so that inner unquotes are preserved
until the appropriate level is evaluated.

.. code-block:: makrell

    q = {quote 2}              # Returns a Number node
    q = {quote [a b c]}        # Returns a SquareBrackets node

    # Unquote inside quote
    x = 42
    q = {quote {unquote x}}    # Splices evaluated x into the quoted form

    # Nested quotes preserve inner unquote
    q = {quote {quote {unquote x}}}  # Inner unquote preserved

This is a well-established mechanism in macro-system design, but its
integration with MBF's node-preserving architecture gives it additional
reach. Quoted nodes carry enough structure to represent code, data, and
markup forms equally, so the same quoting mechanism can generate MRON
structures, MRML fragments, or Makrell expressions.

7.3 Compile-time execution
^^^^^^^^^^^^^^^^^^^^^^^^^^^

The ``{meta ...}`` form introduces a compile-time execution scope. Code
within a meta block runs during compilation and can define variables, helper
functions, and macros; compute values that feed into the compilation via
unquote; and perform iteration and control flow.

The meta environment is isolated from runtime. In MakrellPy, it uses a
separate namespace. In MakrellTS, it can use a worker thread or subprocess.
In Makrell#, it uses Roslyn's scripting API. This isolation prevents
compile-time side effects from leaking into runtime.

.. code-block:: makrell

    {meta base = 2}

    {def macro adda [ns]
        ns = {regular ns}
        {quote {unquote ns@0} + {unquote base}}}

    {adda 5}   # expands to 5 + 2 at compile time

The compile-time environment has access to meta context functions that
support AST manipulation:

* ``regular(nodes)`` --- remove whitespace and comments from a node list
* ``parse(src)`` --- parse a string into MBF nodes
* ``operatorParse(nodes)`` --- apply operator parsing to a node sequence

These functions give macro authors the tools to construct, decompose, and
reassemble syntax programmatically.

7.4 The showcase macros
^^^^^^^^^^^^^^^^^^^^^^^^

The v0.10.0 release includes a set of showcase macros implemented in all
three tracks, demonstrating what the macro system can do.

**The pipe macro** takes a sequence of forms and chains them with the
pipe operator:

.. code-block:: makrell

    {def macro pipe [ns]
        ns = {regular ns}
        p = ns@0
        i = 1
        {while i < {len ns}
            p = {quote {unquote p} | {unquote ns@i}}
            i = i + 1}
        p}

    # Usage:
    {pipe 5 bump square}   # expands to 5 | bump | square

**The rpn macro** implements reverse Polish notation using a stack-based
algorithm. Operators pop two values and push the result:

.. code-block:: makrell

    # Usage:
    {rpn 2 3 * 5 7 * +}   # evaluates as (2*3) + (5*7) = 41

The implementation uses the node type system --- checking whether each node
is an ``Operator``, a ``RoundBrackets``, or a value --- to decide how to
transform it. This is a concrete example of macros operating on MBF's
structural representation rather than on evaluated values.

**The lisp macro** transforms S-expression-style syntax into Makrell calls:

.. code-block:: makrell

    # Usage:
    {lisp (+ 2 3)}          # becomes {+ 2 3} → 5
    {lisp (map (+ _ 1) xs)} # becomes {map {+ _ 1} xs}

The implementation recursively walks round-bracket forms, treating the first
element as the operator or function and the rest as arguments.

These three macros are not utilities for production use. They are
demonstrations that the macro system is expressive enough to implement
alternative evaluation strategies (pipe chaining, postfix notation,
S-expressions) through pure compile-time AST transformation.

7.5 Cross-module macro persistence
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In the Makrell# track, compiled assemblies can embed their meta source. When
another module uses ``{importm assembly@[macro_name]}``, the embedded source
is replayed in the importing module's compile-time environment. This solves
a practical problem that many research macro systems leave unaddressed: how
to share macros across module boundaries without re-executing the full
original compilation.


8. Compilation Pipelines
------------------------

Each implementation track compiles Makrell through a different backend,
targeting the idioms of its host ecosystem. Understanding these pipelines
clarifies both the design's portability and its host-specific adaptations.

8.1 MakrellPy: compilation to Python AST
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

MakrellPy compiles Makrell source directly to Python ``ast`` module nodes,
which are then compiled to bytecode by CPython's standard compiler.

The pipeline:

1. MBF tokenisation → bracket parsing → operator parsing
2. Reserved-form compilation (``{if ...}`` → ``ast.IfExp``,
   ``{fun ...}`` → ``ast.FunctionDef``, ``{class ...}`` → ``ast.ClassDef``,
   etc.)
3. Binary operator compilation (``|`` desugared to function call,
   ``->`` to lambda, ``@`` to subscript, etc.)
4. Suffix application (``dt`` → ``datetime.fromisoformat()``,
   ``e`` → string concatenation of segments, etc.)
5. Python ``compile()`` and ``exec()``

Because the output is native Python AST, MakrellPy code interoperates
seamlessly with Python libraries. Import forms resolve through Python's
standard module system. Classes produce real Python classes. Dataclasses
emit the ``@dataclass`` decorator. Exception handling maps directly to
Python's ``try``/``except``/``else``/``finally``.

MakrellPy also supports features specific to the Python ecosystem:
generators (``{yield ...}``), context managers (``{with ...}``), async
generators, and decorators.

8.2 MakrellTS: compilation to JavaScript and TypeScript
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

MakrellTS emits JavaScript or TypeScript source text.

The pipeline:

1. MBF tokenisation → bracket parsing
2. Macro expansion (user-defined macros applied before operator parsing)
3. Operator parsing
4. Code emission to JavaScript or TypeScript strings
5. Execution via Node.js, Bun, or browser runtime

Key emission patterns:

* ``{fun add [x y] x + y}`` →
  ``(function add(x, y) {return x + y})``
* ``{fun [x y] x + y}`` →
  ``((x, y) => {return x + y})``
* ``{if cond val1 val2}`` →
  ``(cond ? val1 : val2)``
* ``{do stmt1 stmt2 result}`` →
  ``(() => {stmt1; stmt2; return result;})()``
* ``{class Point ...}`` → standard JavaScript ``class`` declaration

When targeting TypeScript, type annotations from ``:`` operators are
preserved in the emitted code. A separate declaration-file mode can emit
``.d.ts`` files for type checking.

MakrellTS also supports browser execution. The v0.10.0 playground at
``makrell.dev/playground/`` uses the same compiler running in the browser,
with meta execution isolated in a Web Worker.

8.3 Makrell#: compilation through C# to .NET bytecode
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Makrell# has the most elaborate pipeline because it targets a statically
typed runtime.

The pipeline:

1. MBF tokenisation → bracket parsing
2. Meta processing (``{meta ...}`` blocks executed via Roslyn scripting)
3. Macro expansion
4. Operator parsing
5. C# source emission
6. Roslyn compilation to .NET bytecode

The emitted C# wraps module code in a static class:

.. code-block:: csharp

    public static class __MakrellModule
    {
        public static dynamic Run()
        {
            // Module body
            return lastValue;
        }
    }

Functions are emitted as delegate assignments:

.. code-block:: csharp

    // {fun factorial [n] {if (== n 0) 1 (* n {factorial (- n 1)})}}
    dynamic factorial = ((Func<dynamic, dynamic>)((dynamic n) =>
    {
        return (n == 0 ? 1 : (n * factorial((n - 1))));
    }));

All Makrell values are typed as ``dynamic``, deferring type resolution to
the CLR's Dynamic Language Runtime (DLR). This is pragmatic for an early
implementation but means the language cannot yet leverage the CLR's static
type system for compile-time checking or IDE assistance.

The ``{do ...}`` block compiles to a C# IIFE following the same pattern:

.. code-block:: csharp

    ((Func<dynamic>)(() =>
    {
        dynamic x = 5;
        dynamic y = 10;
        return (x + y);
    }))()

Variables are auto-declared on first assignment with ``dynamic`` type.
The emitter tracks which variables have been declared to avoid duplicate
declarations.


9. Multi-Host Implementation as Methodology
--------------------------------------------

9.1 Rationale
^^^^^^^^^^^^^^

Implementing the same language family across three host ecosystems is
expensive. Makrell does it because the multi-host strategy serves a
methodological purpose beyond practical reach.

Each host imposes different constraints: Python's dynamic object model,
JavaScript's prototype-based inheritance and event loop, the CLR's static
type system with reified generics. A language construct that compiles
naturally to all three provides stronger evidence of design portability than
one tested against a single target.

The strategy also reveals host-specific adaptation boundaries. Makrell#'s
``{new (list string) [...]}`` syntax for generic types exists because the
CLR has reified generics. MakrellPy and MakrellTS do not need this form.
The divergence locates a boundary between the portable core and
host-specific adaptation.

Similarly, the ``{dataclass ...}`` form is currently specific to the Python
track because it maps to Python's ``@dataclass`` decorator. Whether an
analogous feature should exist in the other tracks --- and whether it
belongs to the portable core --- is a design question that the multi-host
approach makes visible.

9.2 Current implementation picture
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. list-table::
   :header-rows: 1
   :widths: 22 26 26 26

   * - Aspect
     - MakrellPy
     - MakrellTS
     - Makrell#
   * - Target output
     - Python AST
     - JavaScript / TypeScript
     - C# source via Roslyn
   * - Type system
     - Dynamic (Python)
     - Dynamic (JS) / Optional (TS)
     - ``dynamic`` (CLR DLR)
   * - Meta isolation
     - Separate namespace
     - Worker thread / subprocess
     - Roslyn scripting API
   * - Module system
     - Python imports
     - ESM / CJS
     - .NET assemblies
   * - Async/await
     - Yes
     - Yes
     - Yes
   * - Pattern matching
     - Complete
     - Complete
     - Complete in meta; growing at runtime
   * - File extension
     - ``.mrpy``
     - ``.mrts`` / ``.mrjs``
     - ``.mrsh``
   * - Role
     - Deepest semantic reference
     - Reference implementation
     - CLR interop and tooling track

9.3 Parity testing
^^^^^^^^^^^^^^^^^^^

The project employs cross-track parity tests to verify that the same Makrell
source produces equivalent results across implementations. This practice
functions as specification by example: the test suite becomes a concrete
definition of the portable language core. Failures signal either
implementation bugs or specification gaps that need resolution.

The v0.10.0 release includes a common set of showcase macros (``pipe``,
``rpn``, ``lisp``) implemented and tested across all three tracks,
providing a concrete cross-track parity checkpoint for the macro system.


10. Interoperability
--------------------

Makrell is designed to integrate with host ecosystems, not to replace them.
Each track provides native interop with its host's conventions and
libraries.

10.1 MakrellPy interop
^^^^^^^^^^^^^^^^^^^^^^^^

In MakrellPy, standard Python modules are imported and used with the same
``{f args}`` syntax as Makrell functions:

.. code-block:: makrell

    {import json}
    {import os.path}

    data = {json.loads "{\"x\": 1}"}
    exists = {os.path.exists "/tmp/file.txt"}

Python classes, functions, and objects are first-class citizens. Makrell code
can define classes that inherit from Python classes, use Python decorators,
and call Python methods with keyword arguments.

10.2 MakrellTS interop
^^^^^^^^^^^^^^^^^^^^^^^^

In MakrellTS, JavaScript and TypeScript modules participate through ESM
and CJS conventions:

.. code-block:: makrell

    {import fs "node:fs"}
    {import path "node:path"}

    content = {fs.readFileSync "file.txt" "utf-8"}

Browser APIs, DOM manipulation, and Node.js built-ins are all accessible
through the same syntax.

10.3 Makrell# interop
^^^^^^^^^^^^^^^^^^^^^^^

Makrell# provides the richest interop surface because the CLR's type system
is the richest:

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder ["Mak"]}
    {sb.Append "rell#"}
    {sb.ToString}

    # Generic type references in Makrell syntax
    items = {new (list string) ["a" "b" "c"]}
    lookup = {new (dict string int) [["a" 1] ["b" 2]]}

    # Static method calls
    joined = {String.Join ", " items}

    # Indexer access
    first = items @ 0

Makrell# maps built-in type names to CLR types:

* ``string`` → ``System.String``
* ``int`` → ``System.Int64``
* ``float`` → ``System.Double``
* ``bool`` → ``System.Boolean``
* ``list`` → ``System.Collections.Generic.List``
* ``dict`` → ``System.Collections.Generic.Dictionary``
* ``array`` → array types

Generic types use Makrell-shaped syntax rather than C# angle brackets:
``(list string)`` for ``List<string>``,
``(dict string int)`` for ``Dictionary<string, int>``,
``(array string)`` for ``string[]``. Fully qualified generic types are also
supported: ``(System.Collections.Generic.Dictionary string int)``.

The v0.10.0 release improves generic CLR interop ergonomics, including
common inferred generic static calls, bringing the interop story closer to
what a .NET developer would expect.


11. Tooling and Developer Experience
-------------------------------------

The v0.10.0 release treats tooling as part of the product rather than an
afterthought. This is a deliberate shift from earlier releases where
language features took priority over developer experience.

11.1 VS Code extension
^^^^^^^^^^^^^^^^^^^^^^^^

The ``vscode-makrell`` extension provides:

* Syntax highlighting for all family members
* Snippets and language configuration
* Run/check workflows for MakrellPy, MakrellTS, and Makrell#
* File support for ``.mr``, ``.mrpy``, ``.mrts``, ``.mrsh``, ``.mron``,
  ``.mrml``, and ``.mrtd``

The extension draws on shared editor assets --- language metadata, syntax
grammars, snippets, and configuration --- that are maintained as a common
asset base. This prevents the common problem of editor tooling drifting out
of sync with language changes.

11.2 Language server
^^^^^^^^^^^^^^^^^^^^^

The ``makrell-family-lsp`` is a TypeScript-based language server introduced
in v0.10.0. It provides:

* Diagnostics for all family members via the real packaged CLIs
* Shared snippet completions from the common editor assets
* Basic hover, symbols, definitions, references, and rename

Diagnostics are produced by invoking the actual compilers, ensuring
consistency between what the editor reports and what the command-line tools
produce.

11.3 Browser playground
^^^^^^^^^^^^^^^^^^^^^^^^

A standalone MakrellTS playground at ``makrell.dev/playground/`` provides:

* A real MakrellTS compile/run path in the browser
* Editable code and HTML panes
* Output, browser preview, generated JavaScript, and issues tabs
* Hosted examples including an N-body physics simulator

The playground uses the same shared editor assets as the VS Code extension,
and meta execution is isolated in a Web Worker.


12. Discussion
--------------

12.1 Contributions
^^^^^^^^^^^^^^^^^^^

**Shared-substrate family architecture.** The demonstration that a single
parsing pipeline can support programming, data notation, markup, and tabular
data without modification is the project's most distinctive contribution.
This is not merely a theoretical claim; it is validated by working
implementations across three host ecosystems and four semantic layers.

**Opt-in regularisation for macros.** Giving macros access to original
nodes including whitespace, with regularisation available on demand, expands
the design space of compile-time transformations. It enables
whitespace-sensitive embedded sublanguages that conventional macro systems
cannot support. The fact that MRML itself is built on this capability
provides a concrete, non-trivial validation of the approach.

**Multi-host validation.** Using multiple implementation tracks as a
specification-discovery mechanism provides a practical answer to the question
"is this design portable or host-contingent?" without requiring formal
verification. The identification of host-specific features (generic type
syntax in Makrell#, dataclasses in MakrellPy) through implementation
experience is a concrete outcome of this methodology.

**Cross-module macro persistence.** The ability to embed and replay
compile-time definitions across module boundaries addresses a limitation
that many macro systems leave unresolved. Without this feature, macros are
confined to single-file scope and cannot participate in a module system,
which limits their practical utility in larger codebases.

**Regular sequence patterns.** The ``[$r ...]`` pattern matching form with
quantifiers extends destructuring to variable-length sequences, a capability
that most pattern-matching systems lack and that is practically useful for
a range of structured-data processing tasks.

12.2 Limitations and open questions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**Semantic density.** The operator vocabulary includes over a dozen symbols
with distinct semantics. Combined with macros, user-defined operators,
custom suffixes, and three host-specific interop models, the total learning
surface is large. The project acknowledges this with its emphasis on
documentation in v0.10.0, but empirical evaluation of learnability has not
yet been conducted.

**Type system integration.** The current approach of compiling everything as
``dynamic`` in Makrell# means the language cannot yet leverage the CLR for
static checking or IDE assistance. The interaction between macro expansion
(which operates on untyped MBF nodes) and type checking (which requires type
information) is an open design question. MakrellTS's optional TypeScript
output provides one avenue for exploration, but the broader question of how
typing interacts with staging remains unresolved.

**Substrate limits.** MBF currently supports four semantic layers (code,
data, markup, tabular). Whether additional layers can be added without the
shared structure becoming a constraint rather than an enabler is untested.
The success of MRTD as a fourth layer is encouraging, but each new layer
adds to the combinatorial interaction surface.

**Macro hygiene.** Conventional macro hygiene concerns (capture avoidance,
scope management) are well-studied for single-language macro systems. How
they manifest when macros can generate code, data, and markup forms
simultaneously is less explored. Makrell does not currently enforce hygiene;
this is left to macro authors.

**Adoption pathways.** The hypothesis that users can enter the family through
MRON or MRML and gradually adopt the programming layer is plausible and
structurally supported, but unvalidated by empirical observation. The
v0.10.0 playground and documentation structure are designed to support
multiple entry points, but whether this actually lowers the barrier to
adoption remains to be seen.

**Error reporting depth.** While v0.10.0 introduces diagnostics through the
language server, source-mapped error reporting through macro expansion and
compile-time debugging remain areas where significant investment is needed.
The value of a macro system is bounded by the quality of its diagnostics.


13. Related Work
----------------

Makrell belongs to a broad design tradition concerned with code
representation, metaprogramming, and language extensibility.

13.1 Lisp and descendants
^^^^^^^^^^^^^^^^^^^^^^^^^^^

The S-expression tradition (McCarthy, 1960) established the idea that code
and data should share a representation. Common Lisp's macro system
demonstrated the power of compile-time code transformation over a
homoiconic representation. Scheme's ``syntax-rules`` and ``syntax-case``
(Dybvig, Hieb, and Bruggeman, 1993) introduced hygienic macros that avoid
accidental variable capture.

Clojure (Hickey, 2008) brought Lisp ideas to the JVM with an emphasis on
immutable data, concurrency, and practical interop with Java libraries. Its
macro system operates over a richer set of data literals (vectors, maps,
sets) than traditional Lisp, which Makrell's bracket-type distinction
echoes.

Racket (Flatt, 2012) is perhaps the closest precedent for Makrell's
ambitions. Racket is explicitly designed as a language for creating
languages, with a macro system powerful enough to support entirely new
syntactic forms. Makrell shares this language-oriented programming
aspiration but takes a different approach: where Racket extends a single
host (the Racket runtime), Makrell distributes across multiple hosts and
includes data and markup as first-class family members.

13.2 Host-integrated macro systems
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Hy provides a Lisp syntax layer over Python, compiling to Python AST. Janet
offers a compact, embeddable Lisp-like language with its own C-based
runtime. Both demonstrate the appeal of macros and homoiconicity, but both
are tightly coupled to a single host. Makrell's multi-host strategy and
multi-layer family architecture are broader in scope.

Template Haskell (Sheard and Peyton Jones, 2002) provides compile-time
metaprogramming within Haskell's type system. Its staging is type-safe but
confined to a single language. Makrell's meta system is more dynamic but
also more portable across hosts.

13.3 Elixir and the BEAM ecosystem
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Elixir (Valim, 2012) demonstrates what happens when powerful metaprogramming
is paired with strong tooling, conventions, and ecosystem discipline. Elixir
macros operate over a quoted representation of Elixir code and are used
extensively in the standard library and in frameworks like Phoenix.

Makrell shares Elixir's commitment to macros as a first-class language
feature, but the two projects differ in scope. Elixir targets a single
runtime (the BEAM VM) and does not include data or markup notations as
family members. Elixir's ecosystem maturity --- its documentation culture,
its ``mix`` build tool, its testing conventions --- illustrates the level of
operational polish that a macro-heavy language eventually requires.

13.4 Staged computation
^^^^^^^^^^^^^^^^^^^^^^^^^

MetaML and MetaOCaml (Taha and Sheard, 2000) provide theoretical frameworks
for type-safe compile-time code generation. Multi-stage programming
separates code generation from execution through explicit staging
annotations and ensures that generated code is well-typed.

Makrell's ``{meta ...}`` blocks are closer to practical staged computation
than to textual macro expansion. Code runs at compile time, produces values
and AST fragments, and feeds them into the compilation. However, Makrell
does not provide MetaML's type-safety guarantees. The interaction between
staging and typing in a multi-host, dynamically typed context is an open
research question.

13.5 Data notation and markup integration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Attempts to unify code and data formats have a long history. YAML began as
a data serialisation format and gradually accumulated executable features.
XSLT and XQuery approached the problem from the markup side, adding
programming capabilities to XML. JSX embedded markup syntax inside
JavaScript.

Makrell's approach is distinctive because the unification happens at the
structural level (MBF), not at the surface syntax level. MRON does not look
like Makrell code with different keywords; it is a different semantic
interpretation of the same structural tree. This is a deeper form of
unification than syntactic embedding.


14. Future Directions
---------------------

Several directions follow from the current state of the project:

* **Formalisation of the MBF core.** A small formal calculus capturing the
  essential semantics of MBF interpretation across layers would provide a
  rigorous foundation for cross-host equivalence claims.

* **Diagnostic infrastructure.** Source-mapped error messages through macro
  expansion, macro expansion tracing, and compile-time debugging would
  significantly improve practical usability.

* **Type integration.** Exploring how optional type annotations in the
  TypeScript and .NET tracks can inform compilation without breaking the
  macro system's node-level abstraction.

* **Macro hygiene.** Investigating whether a hygiene discipline can be
  introduced that works across code, data, and markup generation.

* **Empirical evaluation.** User studies comparing Makrell's learnability
  and productivity against conventional multi-notation setups would provide
  evidence for or against the shared-substrate hypothesis.

* **Editor tooling depth.** Richer language-server features (semantic
  highlighting, type-aware completions, macro expansion preview) would
  validate the tooling-reuse claim and improve the development experience.

* **Additional semantic layers.** Whether MBF can support further domain
  interpretations --- query languages, schema definitions, protocol
  descriptions --- without modification to the shared pipeline.


15. Conclusion
--------------

The Makrell language family is an experiment in language architecture. Its
core proposition --- that programming, data notation, markup, and tabular
data can share a structural substrate without collapsing into a single
monolithic language --- is supported by working implementations across three
host ecosystems as of v0.10.0.

The macro system, with its emphasis on source preservation and opt-in
regularisation, extends the design space of compile-time transformation in a
direction that is both principled and practically motivated. The multi-host
strategy turns implementation into a form of semantic discovery, revealing
which language ideas are genuinely portable and which are host-specific
adaptations. The regular sequence patterns extend pattern matching into
territory that most languages do not cover.

The v0.10.0 release marks a transition from language experimentation to
family consolidation. With shared async/await across tracks, a common macro
showcase, a new tabular format, a language server, a browser playground, and
shared editor assets, the project has begun to address the developer
experience concerns that determine whether a promising language design
becomes a usable tool.

Whether the design scales to broader adoption depends on work that is less
architecturally novel but no less important: documentation depth, diagnostic
quality, community conventions, and the steady accumulation of practical
trust that comes from a system behaving predictably over time. The
structural foundation is sound. The question now is whether the layers built
on top of it can earn the same confidence.


References
----------

* Dybvig, R.K., Hieb, R., and Bruggeman, C. (1993). "Syntactic Abstraction
  in Scheme." *Lisp and Symbolic Computation*, 5(4), 295--326.
* Flatt, M. (2012). "Creating Languages in Racket." *Communications of the
  ACM*, 55(1), 48--56.
* Hickey, R. (2008). "The Clojure Programming Language." *Proc. DLS '08*.
* McCarthy, J. (1960). "Recursive Functions of Symbolic Expressions and
  Their Computation by Machine, Part I." *Communications of the ACM*, 3(4),
  184--195.
* Pratt, V.R. (1973). "Top Down Operator Precedence." *Proc. POPL '73*,
  41--51.
* Sheard, T. and Peyton Jones, S. (2002). "Template Meta-programming for
  Haskell." *Proc. Haskell Workshop '02*, 1--16.
* Taha, W. and Sheard, T. (2000). "MetaML and Multi-Stage Programming with
  Explicit Annotations." *Theoretical Computer Science*, 248(1--2), 211--242.
* Valim, J. (2012). "Elixir: A Functional, Meta-programming Aware Language."
  Keynote at *Erlang Factory*.
* Makrell specifications: ``specs/mbf-spec.md``, ``specs/mron-spec.md``,
  ``specs/mrml-spec.md``, ``specs/makrellpy-spec.md``,
  ``specs/makrellsharp-spec.md``.
