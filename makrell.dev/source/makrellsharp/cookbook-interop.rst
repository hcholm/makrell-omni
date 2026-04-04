Interop Recipes
===============

This page collects small Makrell# interop examples. The focus is practical use:
importing CLR types, working with collection forms, and combining `.NET` APIs
with ordinary Makrell# syntax.

Recipe: import and use a CLR type
---------------------------------

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder []}
    {sb.Append "Makrell#"}
    {sb.ToString}

This is the basic pattern for many `.NET` interop tasks: import a namespace or
type, construct an object, then call ordinary CLR members.

Recipe: use Makrell-shaped generic forms
----------------------------------------

.. code-block:: makrell

    names = {new (list string) ["Makrell" "Sharp"]}
    counts = {new (dict string int) [["macros" 1] ["interop" 1]]}
    parts = {new (array string) ["Mak" "rell#"]}

Makrell# uses Makrell-shaped type forms such as ``(list string)`` and
``(array string)`` instead of C# generic syntax directly. That keeps the source
closer to the rest of the family while still mapping onto CLR collection types.

Recipe: parse MRON and MRML from the CLI
----------------------------------------

.. code-block:: bash

    makrellsharp parse-mron sample.mron
    makrellsharp parse-mrml sample.mrml

Use these commands when you want to exercise the format parsers directly from
the `.NET` implementation.

Recipe: combine pattern matching with interop
---------------------------------------------

.. code-block:: makrell

    {import System.Text}

    value = [2 5]
    result = {match value
        [x=_ y=_]
            {when x < y
                x + y}
        _
            0}

    sb = {new StringBuilder []}
    {sb.Append "Result: "}
    {sb.Append result}
    {sb.ToString}

This kind of example shows the main shape of Makrell# interop: Makrell forms
handle the control flow and structure, while CLR objects and methods supply the
host-library behaviour.

Practical notes
---------------

When working with `.NET` interop in Makrell#, it usually helps to:

* start with simple CLR construction and method calls
* use emitted C# inspection when behaviour is unclear
* treat Makrell-shaped generic forms as the normal source-level notation
* keep host interop examples small until the surrounding Makrell logic is stable

Related pages
-------------

For more on the `.NET` track, continue with:

* :doc:`interop`
* :doc:`tooling`
* :doc:`cookbook-cli`
* :doc:`macros-and-meta`
