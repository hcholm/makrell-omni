Macro Recipes
=============

Use this page for small MakrellTS macro patterns and practical habits. For the
broader TypeScript-side model, continue with :doc:`metaprogramming`.

Start with the checked-in showcase
----------------------------------

MakrellTS has a compact public macro example in
``impl/ts/examples/macros/showcase.mrts``.

Run it:

.. code-block:: bash

    makrellts showcase.mrts

That example shows three useful macro shapes:

* ``pipe``
  rewrites a sequence into pipeline style
* ``rpn``
  lowers postfix input into ordinary Makrell AST
* ``lisp``
  hosts a Lisp-like round-bracket notation inside Makrell

This is the fastest way to see that the TS track is not only about typed output
or browser tooling; it also supports real structural compile-time rewriting.

Recipe: write the smallest structural macro first
-------------------------------------------------

.. code-block:: makrell

    {def macro twice [x]
        [{quote $x} {quote $x}]}

    {twice {print "hello"}}

This is still the best first macro shape in MakrellTS:

* receive syntax
* return syntax
* keep the rewrite explicit

If a macro is hard to debug, it is usually worth reducing it back to this kind
of tiny shape before growing it again.

Recipe: normalise incoming nodes with ``regular``
-------------------------------------------------

.. code-block:: makrell

    {def macro second [ns]
        ns = {regular ns}
        {quote {unquote ns@1}}}

    {second 2 3 5}

Many practical macros start exactly like this:

* get the argument list with ``regular``
* read out the pieces you need
* build a new node tree with ``quote``

This is often clearer than trying to work directly with raw input structure.

Recipe: separate syntax work from runtime work
----------------------------------------------

In MakrellTS, macros are best used for syntax-level reshaping, not for hiding a
large runtime subsystem.

As a good rule of thumb:

* use macros when you want to transform structure
* keep browser APIs, JS objects, and runtime state outside the macro when
  possible
* prefer a few small macros over one broad compile-time system

That keeps the compile-time layer easier to inspect and makes the generated JS
more predictable.

Recipe: inspect the generated output
------------------------------------

When a macro behaves unexpectedly, reduce the problem to a small form and then
inspect the generated JS.

A good workflow is:

* simplify the macro input
* confirm the node shape the macro receives
* confirm the transformed structure
* inspect the generated JS if the runtime behaviour still looks wrong

This is especially useful in MakrellTS because the track sits so close to the
browser and editor tooling story.

Recipe: use the showcase as a regression surface
------------------------------------------------

The checked-in ``pipe``, ``rpn``, and ``lisp`` showcase is useful not only as a
learning example, but also as a compact regression surface.

If you are working on macro behaviour in the TS track, it is worth rerunning:

.. code-block:: bash

    makrellts showcase.mrts

That helps catch accidental regressions in:

* structural rewriting
* callable AST construction
* compile-time/runtime interplay

Related pages
-------------

* :doc:`metaprogramming`
* :doc:`../makrellpy/cookbook-macros`
* :doc:`../makrellsharp/macros-and-meta`
