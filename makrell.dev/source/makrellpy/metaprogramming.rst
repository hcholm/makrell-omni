Metaprogramming
===============

MakrellPy treats code as structured data at compile time.

That lets you:

* reshape syntax before runtime
* define small embedded languages
* move repetitive structure into one place
* keep compile-time helper logic separate from runtime logic

If you want small practical patterns first, start with :doc:`cookbook-macros`.
This page is the broader explanation-and-usage page.

Start with the checked-in showcase
----------------------------------

The fastest way to see MakrellPy metaprogramming in practice is the checked-in
macro showcase:

``impl/py/examples/macros/showcase.mr``

Run it:

.. code-block:: bash

    makrell showcase.mr

That example is worth reading because it shows three different compile-time
ideas in one place:

* ``pipe`` for ergonomic rewriting
* ``rpn`` for postfix-to-AST lowering
* ``lisp`` for a nested language surface inside Makrell

What a macro is
---------------

A macro receives syntax nodes and returns syntax nodes.

In practice, that often looks like this:

.. code-block:: makrell

    {def macro twice [x]
        [{quote $x} {quote $x}]}

    {twice {print "hello"}}

This is the smallest useful macro shape:

* input is syntax
* output is syntax
* the rewrite is explicit

This is the right place to start. If a macro idea is hard to explain in this
small form, it is usually worth simplifying before building a larger system.

Quoting and unquoting
---------------------

Most macro code is built around:

* ``quote`` to construct syntax
* ``unquote`` to splice existing syntax into new syntax

Example:

.. code-block:: makrell

    {def macro incr [ns]
        ns = {regular ns}
        {quote {unquote ns@0} + 1}}

    {incr 4}

Here the macro:

* reads the argument list with ``regular``
* takes the first node
* builds a new expression that adds ``1``

Why ``regular`` matters
-----------------------

Makrell macros may receive source-shaped input that still reflects details of
the original structure.

In many practical macros, the first step is to normalise that input:

.. code-block:: makrell

    {def macro second [ns]
        ns = {regular ns}
        {quote {unquote ns@1}}}

    {second 2 3 5}

``regular`` is often the difference between:

* working with a clean list of nodes
* working with source-shaped structure directly

Both matter, but most everyday macros want the regularised form.

The role of ``meta``
--------------------

``meta`` runs at compile time.

Use it when you want:

* helper functions for macros
* compile-time constants
* compile-time setup that does not belong in the runtime program

Example:

.. code-block:: makrell

    {meta
        {fun wrap_print [label expr]
            {quote
                {print {unquote label}}
                {unquote expr}}}}

    {def macro announce [ns]
        ns = {regular ns}
        {wrap_print ns@0 ns@1}}

This split is usually clearer than trying to put all helper logic inside a
single ``def macro`` body.

A good rule of thumb is:

* ``meta`` for compile-time helper logic
* ``def macro`` for the transformation entry point

Compile-time versus runtime
---------------------------

One of the easiest ways to make macro code confusing is to mix compile-time and
runtime roles carelessly.

Try to keep these separate:

* compile-time helpers in ``meta``
* syntax rewriting in macros
* ordinary behaviour in runtime functions

That separation makes macro-heavy code easier to test and much easier to read.

Example: wrap a block
---------------------

This is a useful pattern when you want to add repeated structure around a
user-provided block.

.. code-block:: makrell

    {def macro timeit [ns]
        [
            {quote {import time}}
            {quote start = {time.time}}
        ] + ns + [
            {quote {print "Time taken:" {time.time} - start}}
        ]}

This kind of macro is good for:

* instrumentation
* tracing
* repeated setup
* repeated teardown-like structure

Macro hygiene
-------------

Macros that introduce bindings can still collide with user code.

For example, a macro that generates ``start`` or ``tmp`` may clash with names
already present in the user program.

So even in powerful compile-time systems, restraint still matters:

* keep generated structure easy to inspect
* prefer helper functions over huge macros
* be careful about introduced names

MakrellPy can support stronger hygiene patterns, but the first practical habit
is simply to write macros that are small and deliberate.

Nested languages
----------------

Makrell macros become especially interesting when they do more than save a few
characters.

The checked-in showcase demonstrates three broader uses:

* ergonomic rewriting with ``pipe``
* alternative notation with ``rpn``
* embedded language structure with ``lisp``

That is one of the strongest reasons to learn Makrell metaprogramming at all:
it lets you shape a language surface while staying inside the Makrell
structural model.

How to debug macros
-------------------

When macro behaviour gets confusing:

* shrink the input to the smallest failing example
* inspect the incoming nodes first
* move helper logic into ``meta``
* rebuild the generated syntax with ``quote`` step by step

This approach is usually more effective than debugging the fully grown macro all
at once.

Related pages
-------------

* :doc:`cookbook-macros`
* :doc:`../concepts/macros-and-meta`
* :doc:`cookbook`
