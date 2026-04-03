Cookbook
========

Makrell# is most useful when you combine Makrell syntax with the CLR. This
cookbook gathers short, task-oriented examples for the `.NET` track.

Use this section when you already know roughly what you want to do and need a
working pattern rather than a full conceptual introduction.

Useful recipe areas
-------------------

Typical Makrell# recipe areas include:

* run a ``.mrsh`` file from the CLI
* build an assembly and run it later
* inspect generated C#
* parse MRON and MRML from the CLI
* use CLR types with Makrell-shaped generic forms
* use ``meta``, ``def macro``, and ``importm``
* combine Makrell control flow with `.NET` libraries

Recipe: run and build
---------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- build examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- run-assembly examples/hello.dll

These commands cover the basic source-to-assembly workflow.

Recipe: inspect generated C#
---------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- emit-csharp examples/hello.mrsh

This is useful when you want to understand how a Makrell# form lowers into the
current generated C# module.

Recipe: CLR interop
-------------------

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder []}
    {sb.Append "Makrell#"}
    {sb.ToString}

This is the basic shape of many `.NET` interop tasks: import a type or
namespace, construct an object, call CLR members, and let Makrell forms handle
the surrounding flow.

Recipe: Makrell-shaped generics
-------------------------------

.. code-block:: makrell

    names = {new (list string) ["Makrell" "Sharp"]}
    counts = {new (dict string int) [["macros" 1] ["interop" 1]]}
    parts = {new (array string) ["Mak" "rell#"]}

Makrell# uses Makrell-shaped type forms instead of C# generic notation directly.

Recipe: parse MRON and MRML
---------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- parse-mron examples/sample.mron
    dotnet run --project src/MakrellSharp.Cli -- parse-mrml examples/sample.mrml

Use these commands when you want to exercise the format parsers through the same
implementation track.

Recipe: meta and macros
-----------------------

.. code-block:: makrell

    {meta
        greeting = {quote "Hello"}}

    {def macro hello [ns]
        {quote {String.Join " " [{unquote greeting} "from Makrell#"]}}}

This shows the basic compile-time shape: use ``meta`` for compile-time values
and helpers, and ``def macro`` for syntax transformation.

Recipe: inspect replayable compile-time metadata
------------------------------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- build examples/macros.mrsh
    dotnet run --project src/MakrellSharp.Cli -- meta-sources examples/macros.dll

This is useful when you want to inspect the compile-time sources that have been
embedded for later replay.

Recipe: a generic collection workflow
-------------------------------------

.. code-block:: makrell

    names = {new (list string) ["Makrell" "Sharp"]}
    {String.Join " " names}

Recipe: a simple match plus interop flow
----------------------------------------

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

How to use this cookbook
------------------------

If you are new to Makrell#, read :doc:`quick-start` and :doc:`guide` first.
Then use the cookbook pages as a set of practical patterns you can adapt to your
own `.NET` code.

More Makrell# recipes
---------------------

* :doc:`cookbook-cli`
* :doc:`cookbook-interop`
* :doc:`cookbook-macros`
