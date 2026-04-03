MakrellPy
=========

MakrellPy is the Python-hosted Makrell implementation. It remains one of the
richest and most practical implementations in the family, especially for
metaprogramming, pattern matching, and Python interoperability.

Why use MakrellPy?
------------------

* expressive functional style
* strong metaprogramming story
* two-way Python interoperability
* pattern matching and user-extensible syntax
* practical host language access without losing Makrell identity

Best fit
--------

MakrellPy is a good fit when you want:

* a broad language experience rather than only a format or narrow host bridge
* Python library access
* strong macro and pattern-matching examples
* a practical entry point into the shared Makrell model

Relationship to the rest of the family
--------------------------------------

MakrellPy is no longer the sole centre of the project, but it is still an
important reference point:

* it contains a large amount of mature language behaviour
* it is a strong practical reference point for macros and matching
* it remains highly relevant for Python-heavy workflows

Recommended reading path
------------------------

If you are learning MakrellPy for the first time, a practical order is:

1. :doc:`quick-start`
2. :doc:`basics`
3. :doc:`functional`
4. :doc:`interop`
5. :doc:`metaprogramming`
6. the cookbook pages

Current emphasis
----------------

The current MakrellPy section places most emphasis on:

* core language flow and functional style
* Python interop
* macros and metaprogramming
* pattern-oriented ways of working with structured data and syntax

If you are comparing implementations, MakrellPy is often the best place to see
the broader language model in action before mapping those ideas onto the TS or
`.NET` tracks.

.. toctree::
   :maxdepth: 2

   install
   quick-start
   basics
   flow
   functional
   classes
   interop
   metaprogramming
   cookbook
   cookbook-functional
   cookbook-interop
   cookbook-macros
   tooling
   status
   roadmap
