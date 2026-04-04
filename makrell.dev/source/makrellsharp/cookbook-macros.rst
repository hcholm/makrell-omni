Macro and Meta Recipes
======================

Use this page for practical Makrell# compile-time patterns. For the broader
model behind ``meta`` and macros in the `.NET` track, continue with
:doc:`macros-and-meta`.

Start with the checked-in showcase
----------------------------------

Makrell# has a compact public macro example in
``impl/dotnet/examples/showcase.mrsh``.

Run it:

.. code-block:: bash

    makrellsharp showcase.mrsh

That example shows the current Makrell# compile-time surface through four
small outputs:

* ``pipeResult``
* ``rpnResult``
* ``rpnAddResult``
* ``lispResult`` / ``lispSumSquares``

Taken together, those examples show:

* syntax reshaping
* postfix-to-AST lowering
* callable AST construction
* embedded language notation

Recipe: start with a ``meta`` helper
------------------------------------

.. code-block:: makrell

    {meta
        greeting = {quote "Hello"}}

Use ``meta`` when you want compile-time values or helper functions that should
exist during expansion rather than at runtime.

In Makrell#, this usually makes macro code easier to read, because you can keep
the compile-time support logic separate from the macro entry point.

Recipe: define a small structural macro
---------------------------------------

.. code-block:: makrell

    {def macro hello [ns]
        {quote {String.Join " " [{unquote greeting} "from Makrell#"]}}}

Good Makrell# macros usually keep the same basic shape as in the other tracks:

* receive syntax
* inspect or normalise it
* return syntax explicitly

That is almost always easier to reason about than one large compile-time block
that mixes helper logic, control flow, and returned structure.

Recipe: normalise arguments with ``regular``
--------------------------------------------

.. code-block:: makrell

    {def macro second [ns]
        ns = {regular ns}
        {quote {unquote ns@1}}}

    {second 2 3 5}

This is one of the most common useful patterns in Makrell# macro code:

* call ``regular``
* work with the resulting node list
* build a new expression with ``quote``

Recipe: keep compile-time and runtime roles separate
----------------------------------------------------

In Makrell#, it helps to keep these roles explicit:

* ``meta`` for compile-time helpers and values
* ``def macro`` for syntax transformation
* ordinary code for runtime behaviour

That separation is especially useful in the `.NET` track, where runtime interop
and compile-time behaviour can otherwise become hard to distinguish.

Recipe: inspect replayable compile-time sources
-----------------------------------------------

Makrell# embeds replayable compile-time sources into compiled output so they can
be used later through ``importm``.

Inspect them with:

.. code-block:: bash

    makrellsharp build macros.mrsh
    makrellsharp meta-sources macros.dll

This is useful when:

* ``importm`` does not behave as expected
* you want to confirm what compile-time code was embedded
* you are debugging macro-heavy modules

Recipe: use the public showcase as a smoke test
-----------------------------------------------

The checked-in showcase is also a good compact regression surface for Makrell#
macro behaviour.

When changing compile-time behaviour, rerun:

.. code-block:: bash

    makrellsharp showcase.mrsh

That keeps the most visible public macro story healthy while larger
compile-time work continues.

Related pages
-------------

* :doc:`macros-and-meta`
* :doc:`../makrellpy/cookbook-macros`
* :doc:`../makrellts/cookbook-macros`
