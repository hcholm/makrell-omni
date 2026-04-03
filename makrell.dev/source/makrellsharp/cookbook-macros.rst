Macro and Meta Recipes
======================

This page collects small Makrell# compile-time examples. The aim is to show the
current ``meta`` and macro workflow in the `.NET` implementation rather than to
serve as a complete language reference.

Recipe: use a ``meta`` block
----------------------------

.. code-block:: makrell

    {meta
        greeting = {quote "Hello"}}

Use ``meta`` when you want compile-time definitions or helper values that are
available during expansion rather than at runtime.

Recipe: define a small macro
----------------------------

.. code-block:: makrell

    {def macro hello [ns]
        {quote {String.Join " " [{unquote greeting} "from Makrell#"]}}}

Small structural macros are usually easier to understand than broad compile-time
systems. A good first step is to define macros that receive syntax, reshape it,
and return syntax explicitly.

Recipe: inspect replayable compile-time sources
-----------------------------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- build examples/macros.mrsh
    dotnet run --project src/MakrellSharp.Cli -- meta-sources examples/macros.dll

This is useful when you want to confirm what compile-time definitions have been
embedded for later replay through ``importm``.

Recipe: keep runtime and compile-time roles separate
----------------------------------------------------

In Makrell#, it helps to keep these roles clear:

* use ``meta`` for compile-time helpers and values
* use ``def macro`` for syntax transformation
* use ordinary code for runtime behaviour

That separation makes macro-heavy modules easier to inspect and debug.

Recipe: compare with other tracks
---------------------------------

For cross-family context, also see:

* :doc:`../makrellpy/cookbook-macros`
* :doc:`../makrellts/cookbook-macros`

The three implementation tracks share a family model, but their tooling and
host-language integration differ enough that side-by-side reading is often
useful.
