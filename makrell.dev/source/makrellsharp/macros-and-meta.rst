Macros and Meta
===============

Makrell# is building a substantial compile-time system in the `.NET`
ecosystem. This page explains the current shape of that system at a user level:
what the main forms are, what they are for, and how they relate to the rest of
the Makrell family.

Important themes
----------------

The current Makrell# compile-time model revolves around:

* ``quote`` and ``unquote``
* compile-time ``meta`` execution
* Makrell-defined macros
* replayable compile-time metadata via ``importm``
* whitespace-preserving macro input when needed

Representative macro example
----------------------------

.. code-block:: makrell

    {meta
        greeting = {quote "Hello from meta"}}

    {def macro hello [ns]
        {quote {String.Join " " [{unquote greeting} "and macros"]}}}

This example shows the basic split:

* ``meta`` defines compile-time values
* ``def macro`` transforms syntax
* ``quote`` and ``unquote`` control what is treated as syntax and what is
  evaluated during expansion

Current model
-------------

Makrell# already supports a meaningful compile-time model built around:

* ``quote`` and ``unquote``
* top-level ``meta`` execution
* Makrell-defined macros
* replayable compile-time metadata for ``importm``-style workflows

That means the `.NET` track is not only compiling ordinary runtime expressions.
It is also carrying a genuine compile-time layer that participates in the
compile and dynamic-load workflow.

How to think about ``meta``
---------------------------

Use ``meta`` when you want compile-time definitions or helper logic that should
run during compilation rather than at runtime. In practice, that often means:

* preparing quoted syntax
* defining compile-time helper values
* sharing compile-time state across macro definitions

The important distinction is that ``meta`` is not ordinary runtime code placed
early in the file. It belongs to the compile-time phase.

How to think about macros
-------------------------

Macros in Makrell# receive syntax and produce syntax. A practical way to work
with them is:

* keep them structurally explicit
* return quoted syntax rather than hiding too much work behind one form
* keep compile-time logic in ``meta`` helpers when that makes the macro itself
  easier to read

Small macros are usually easier to inspect and debug than large,
multi-responsibility macros.

Why whitespace preservation matters
-----------------------------------

One practical requirement in the Makrell family is that some macro consumers
need access to original source-shaped nodes, including whitespace-sensitive
structure.

That matters for:

* embedded sublanguages
* MRML-like forms
* macros that must decide for themselves whether to regularise input

So the macro system is not only a convenience feature. It is part of how
Makrell# supports language extension in a structured way.

``importm`` and replayable metadata
-----------------------------------

Makrell# can embed replayable compile-time sources in built assemblies. That is
what later enables ``importm``-style workflows: compile-time definitions can be
reloaded and replayed in another compilation step.

At a practical level, this means the `.NET` implementation treats compile-time
behaviour as part of the module story, not as an entirely separate external
tooling step.

How to approach this section
----------------------------

If you are new to Makrell# macros and meta:

#. read this page for the overall model
#. use :doc:`cookbook-macros` for smaller practical patterns
#. use the CLI workflow pages when you want to inspect emitted code or embedded
   compile-time metadata

Useful related pages
--------------------

* :doc:`../concepts/macros-and-meta`
* :doc:`cookbook-macros`
* :doc:`cookbook-cli`
* :doc:`interop`
* :doc:`tooling`
