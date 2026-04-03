Quick Start
===========

Makrell# is designed to feel familiar to Makrell users while fitting naturally
into the `.NET` world.

How to use this page
--------------------

This page gives a short tour of the main shapes you are likely to encounter
first:

* ordinary function and pipeline syntax
* `.NET` interop
* pattern matching
* the baseline async/await surface

For setup details, see :doc:`install`. For broader usage patterns, continue to
:doc:`guide` and :doc:`cookbook`.

Representative example
----------------------

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

This shows the compact functional flow that Makrell# shares with the rest of
the family.

Representative interop example
------------------------------

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder []}
    {sb.Append "Makrell#"}
    {sb.ToString}

This shows the basic `.NET` pattern: import a CLR namespace or type, construct
an object, then call members through ordinary Makrell syntax.

Pattern-matching example
------------------------

.. code-block:: makrell

    {match [2 5]
        [x=_ y=_]
            {when x < y
                x + y}
        _
            0}

This shows that Makrell# is not only about CLR interop. It also carries shared
family language features such as structural matching.

Async example
-------------

.. code-block:: makrell

    {async fun fetchValue [value]
        value}

    {async fun addLater [x y]
        left = {await {fetchValue x}}
        right = {await {fetchValue y}}
        left + right}

    {await {addLater 20 22}}

Makrell# now supports the shared family baseline of ``{async fun ...}`` and
``{await ...}`` in addition to the more established sync/core surface.

Practical next steps
--------------------

After working through these examples, a useful next route is:

#. read :doc:`guide` for the main language model in the `.NET` track
#. use :doc:`cookbook` for concrete tasks
#. continue with :doc:`interop` if `.NET` libraries are your main interest
#. continue with :doc:`macros-and-meta` if compile-time behaviour is your main
   interest

See also the implementation docs in the repo under ``impl/dotnet/``.
