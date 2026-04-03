Macro Recipes
=============

This page collects small MakrellTS-oriented macro examples and usage notes. The
current aim is to show how the shared family model appears in the TypeScript
track, not to provide a complete macro reference.

Showcase: ``pipe``, ``rpn``, and ``lisp``
-----------------------------------------

MakrellTS now also has a compact macro showcase in
``impl/ts/examples/macros/showcase.mrts`` built around the same three examples
used for the family-wide `v0.10.0` macro story:

* ``pipe``
  rewrites a sequence of forms into pipeline style
* ``rpn``
  turns postfix input into ordinary Makrell AST
* ``lisp``
  hosts a Lisp-like round-bracket notation inside Makrell

In the TS track, these examples are useful not only as macro examples, but also
as a reminder that the reference implementation can still host structural
rewriting and language-embedding ideas rather than only focusing on typed
output or browser tooling.

The current TS ``lisp`` example is slightly more explicit than the MakrellPy
version: it parses a Lisp-like source string and then transforms that parsed
structure. That still shows the same family idea while staying within the
current TS parser surface.

The current TS ``rpn`` example is also worth reading with one caveat in mind:
it is part of the shared public showcase, but it does not yet reproduce the
exact MakrellPy / Makrell# result in every case. For ``v0.10.0``, that is a
documented compile-time parity gap rather than a hidden difference.

Recipe: duplicate an expression
-------------------------------

.. code-block:: makrell

    {def macro twice [x]
      [{quote $x} {quote $x}]}

    {twice {print "hello"}}

This kind of example is useful because it stays close to the structural model:
receive nodes, produce nodes, and keep the transformation explicit.

Recipe: keep macros small
-------------------------

In MakrellTS, small structural macros are usually easier to understand and
maintain than large compile-time systems hidden behind one form.

As a practical rule:

* use macros for syntax-level reshaping
* keep host-language setup and runtime behaviour outside the macro when possible
* prefer a few simple macros over one very broad macro

Recipe: compare with other tracks
---------------------------------

If you are learning MakrellTS macros, it is often helpful to compare:

* :doc:`../makrellpy/cookbook-macros`
* :doc:`../makrellsharp/macros-and-meta`

That makes the shared family model easier to see while also showing where the
TypeScript track has its own tooling and host-language constraints.

Recipe: inspect generated structure
-----------------------------------

When a macro behaves unexpectedly, it often helps to simplify the form and work
with quoted structure first. For example, reduce a failing case to a small
quoted node shape, confirm what the macro receives, and only then rebuild the
larger example.

This approach is especially helpful when a macro crosses the boundary between
Makrell structure and JavaScript or TypeScript behaviour.

How to use this page
--------------------

Use this page for small patterns and practical habits. For broader explanation
of the TypeScript-side macro story, continue with :doc:`metaprogramming`.
