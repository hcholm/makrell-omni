Makrell#
========

Makrell# is the `.NET` and CLR-hosted Makrell implementation.

Its direction is to make Makrell useful in the `.NET` ecosystem while staying
close to the family model: shared structure, functional flow, pattern matching,
macros, MRON, MRML, and host interop.

Why use Makrell#
----------------

* CLR and `.NET` library interop
* compilation to `.NET` assemblies
* dynamic compile/load workflows
* a growing macro and meta system
* MRON and MRML support through the same implementation track

Best fit
--------

Makrell# is a good fit when you want:

* direct access to the `.NET` library ecosystem
* a CLI-oriented compile and run workflow
* Makrell forms combined with CLR construction, method calls, and assembly
  loading
* the current `.NET` implementation of MRON and MRML

Recommended reading path
------------------------

If you are new to Makrell#, a practical order is:

1. :doc:`quick-start`
2. :doc:`guide`
3. :doc:`cookbook`
4. :doc:`interop`
5. :doc:`macros-and-meta`

Relationship to the rest of the family
--------------------------------------

Makrell# is the `.NET` implementation track. It keeps the shared Makrell model
while adapting it to CLR interop, compilation, dynamic loading, and `.NET`-
oriented tooling.

Current emphasis
----------------

The current documentation emphasises:

* the compiler and CLI workflow
* `.NET` interop patterns
* the current macro and meta model
* MRON and MRML as part of the same implementation area

.. toctree::
   :maxdepth: 2

   install
   quick-start
   guide
   cookbook
   cookbook-cli
   cookbook-interop
   cookbook-macros
   interop
   macros-and-meta
   tooling
   status
