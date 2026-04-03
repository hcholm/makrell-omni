Roadmap
=======

This page collects some of the current directions for MakrellPy. It is not a
formal promise list, but a practical view of what kinds of work still matter in
the Python track.

Implement missing Python features
---------------------------------

Some remaining areas include:

* decorators
* generators
* comprehensions
* type hints
* support for ``*args`` and ``**kwargs``

There are likely to be other smaller gaps as well, but these are some of the
most visible language-shape items.

Enhancements to the current version
-----------------------------------

Current improvement areas include:

* stronger pattern matching
* better error messages
* better handling of illegal syntax
* more complete documentation
* better macro imports
* deeper metaprogramming support for custom operators

Pattern matching in particular is an area where further refinement still pays
off, especially for richer binding, sequence-style patterns, and more
dictionary-oriented cases.

Ideas for future versions
-------------------------

Longer-range directions include:

* destructuring assignment
* a pluggable compiler pipeline
* typing
* compilers and code generators for other languages and platforms
* a composable query language for heterogeneous sources such as databases,
  object structures, and web services
* an online interpreter
* more command-line options

How to read this roadmap
------------------------

This roadmap mixes:

* missing pieces that improve day-to-day usability
* medium-range improvements to the current compiler and macro model
* broader family or tooling ideas that go beyond MakrellPy alone

For the current implemented state, compare this page with :doc:`status`.
