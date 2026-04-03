Guide
=====

The Makrell# guide should grow into the main practical documentation for:

* expressions, calls, and operators
* functional flow
* pattern matching
* CLR interop
* compile/load workflows
* MRON and MRML usage from the .NET implementation

Current implemented slice
-------------------------

Makrell# already includes:

* MBF parsing with optional whitespace preservation
* MRON parsing to ``JsonDocument``
* MRML parsing to ``XDocument``
* compile-time ``meta`` and Makrell-defined macros
* CLR interop through imports, constructors, member calls, and generic call forms
* dynamic compile/load and replayable compile-time metadata

Everyday Makrell# shape
-----------------------

Makrell# works best when ordinary Makrell code and CLR-facing code feel like
parts of the same language rather than two disconnected modes.

Core example:

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

That gives you a familiar Makrell functional style before you even get to .NET-specific
features.

Pattern matching and flow
-------------------------

Makrell# already includes a meaningful pattern-matching slice, which is important
because it gives the implementation a recognisable Makrell feel instead of being
only an interop layer over C#.

Example:

.. code-block:: makrell

    {match [2 5]
        [x=_ y=_]
            {when x < y
                x + y}
        _
            0}

CLR interop as a first-class use case
-------------------------------------

An important part of the Makrell# design is that .NET access is treated as part of the core
experience.

Example:

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder []}
    {sb.Append "Makrell#"}
    {sb.ToString}

Makrell-shaped generic type forms such as ``(list string)``, ``(dict string int)``,
and ``(array string)`` are part of the same idea: stay close to Makrell structure
while still fitting the CLR world.

Compile/load workflow
---------------------

Makrell# also matters because it is not only interpreted source-to-runtime
plumbing. It already has a real compilation and loading story:

* emit C#
* compile assemblies
* load compiled modules
* inspect replayable compile-time metadata

That makes the .NET track especially relevant for tooling, packaging, and larger
runtime integration stories.

Practical next pages
--------------------

After this guide page, the most useful follow-ups are:

* :doc:`quick-start`
* :doc:`cookbook`
* :doc:`interop`
* :doc:`macros-and-meta`
