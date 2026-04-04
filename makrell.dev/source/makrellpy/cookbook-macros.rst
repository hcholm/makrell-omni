Macro Recipes
=============

Use this page for small MakrellPy macro patterns that you can adapt directly.
For the broader model behind ``meta`` and macros, continue with
:doc:`metaprogramming`.

Start with the checked-in showcase
----------------------------------

MakrellPy already has a compact public macro example in
``impl/py/examples/macros/showcase.mr``.

Run it:

.. code-block:: bash

    makrell showcase.mr

That example is worth reading because it shows three different kinds of macro:

* ``pipe``
  rewrites a sequence of forms into pipeline style
* ``rpn``
  reads postfix input and builds ordinary Makrell syntax
* ``lisp``
  hosts a Lisp-like round-bracket notation inside Makrell

If you only read one macro example first, make it that one.

Recipe: duplicate an expression
-------------------------------

.. code-block:: makrell

    {def macro twice [x]
        [{quote $x} {quote $x}]}

    {twice {print "hello"}}

This is the smallest useful macro shape:

* receive syntax
* return syntax
* keep the transformation obvious

It is a good first macro because you can inspect what it receives and what it
returns without much surrounding machinery.

Recipe: reshape a whole form with ``regular``
---------------------------------------------

.. code-block:: makrell

    {def macro second [ns]
        ns = {regular ns}
        {quote {unquote ns@1}}}

    {second 2 3 5}

Use ``regular`` when you want the macro arguments as a more ordinary list of
nodes rather than relying on raw spacing or other structure details.

This is the pattern behind many practical macros:

* normalise the incoming nodes
* pick out the parts you need
* build a new expression with ``quote`` and ``unquote``

Recipe: keep helper logic in ``meta``
-------------------------------------

.. code-block:: makrell

    {meta
        {fun wrap_print [label expr]
            {quote
                {print {unquote label}}
                {unquote expr}}}}

    {def macro announce [ns]
        ns = {regular ns}
        {wrap_print ns@0 ns@1}}

Keeping helper logic in ``meta`` is usually easier to read than packing all the
logic into one large ``def macro`` body.

This split is often a good default:

* ``meta`` for compile-time helper functions and values
* ``def macro`` for the syntax transformation entry point

Recipe: wrap a block with setup and teardown
--------------------------------------------

.. code-block:: makrell

    {def macro timeit [ns]
        [
            {quote {import time}}
            {quote start = {time.time}}
        ] + ns + [
            {quote {print "Time taken:" {time.time} - start}}
        ]}

This kind of macro is useful when you want to inject repeated structure around
a user-provided block.

It is a good pattern for:

* instrumentation
* tracing
* repeated setup
* repeated cleanup

Recipe: build a tiny language, not just a shortcut
--------------------------------------------------

The checked-in ``pipe``, ``rpn``, and ``lisp`` examples are useful because they
show three different macro ambitions:

* ergonomic rewriting
* alternative notation
* embedded language surface

That is usually where Makrell macros become most interesting: not only saving a
few characters, but making a different structural style possible.

Practical advice
----------------

When a macro becomes hard to understand:

* shrink it to the smallest failing example
* inspect the incoming nodes first
* move helper logic into ``meta``
* keep generated structure explicit with ``quote``

Also remember that macros can introduce bindings. Generated names may still
collide with user code, so readability and restraint matter.

Related pages
-------------

* :doc:`metaprogramming`
* :doc:`../concepts/macros-and-meta`
* :doc:`cookbook`
