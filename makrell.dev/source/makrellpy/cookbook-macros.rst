Macro Recipes
=============

This page collects a few small MakrellPy macro patterns. The point is not to
cover every macro feature, but to show the kinds of compile-time transformations
that are practical in day-to-day use.

Showcase: ``pipe``, ``rpn``, and ``lisp``
-----------------------------------------

MakrellPy already has a compact macro showcase in
``impl/py/examples/macros/showcase.mr`` built around three examples:

* ``pipe``
  rewrites a sequence of forms into pipeline style
* ``rpn``
  interprets postfix input and builds ordinary Makrell syntax from it
* ``lisp``
  hosts a Lisp-like round-bracket notation inside Makrell

Taken together, these are a good summary of why Makrell macros are interesting:
they can improve surface ergonomics, introduce alternative notation styles, and
embed small languages without leaving the normal Makrell structure model.

The examples are intentionally small. They are useful because each one shows a
different kind of compile-time transformation clearly.

Recipe: duplicate an expression
-------------------------------

.. code-block:: makrell

    {def macro twice [x]
        [{quote $x} {quote $x}]}

This is a minimal structural macro: receive syntax, return syntax, and keep the
transformation easy to inspect.

Recipe: wrap a block
--------------------

.. code-block:: makrell

    {def macro timeit [ns]
        [
            {quote {import time}}
            {quote start = {time.time}}
        ] + ns + [
            {quote {print "Time taken:" {time.time} - start}}
        ]}

This kind of macro is useful when you want to inject repeated structural setup
around a user-provided block.

Recipe: use a meta helper
-------------------------

.. code-block:: makrell

    {meta
        {fun twice_fn [x]
            [{quote $x} {quote $x}]}}

    {def macro twice [x]
        {twice_fn x}}

This shows the split between compile-time helper logic and the macro form
itself. Keeping helper logic in ``meta`` often makes macro code easier to read.

Recipe: think about hygiene
---------------------------

When macros introduce bindings, remember that generated names may collide with
user code. MakrellPy's macro facilities are powerful, but hygiene and
readability still matter in real projects.

When to use these patterns
--------------------------

These recipes are most useful when you want:

* structural code generation
* repeated syntax patterns factored into one place
* compile-time helpers that keep runtime code smaller and clearer

Related pages
-------------

For broader explanation, continue with:

* :doc:`metaprogramming`
* :doc:`../concepts/macros-and-meta`
* :doc:`cookbook`
