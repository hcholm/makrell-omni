MBF
===

MBF is the Makrell Base Format.

It is the shared structural layer that makes the Makrell family feel like one
family rather than a loose collection of unrelated notations.

Why MBF matters
---------------

MBF is important because it gives the family a common structural language. It
is the reason Makrell code, MRON documents, MRML trees, and macro-oriented
transforms can all be discussed in related terms rather than as entirely
separate systems.

In practical terms, MBF helps support:

* a shared parsing model
* related AST structures
* operator-oriented forms
* embedded sublanguages
* source-preserving workflows for macros and whitespace-sensitive cases

What this section is for
------------------------

The MBF section is the right place to learn the shared structural foundation
without committing to one host implementation first.

Use it when you want to understand:

* what kinds of nodes and bracket forms exist
* how operators fit into the structural model
* how the parser sees source before language-specific compilation or evaluation

Reading path
------------

If you are new to MBF, a good order is:

1. :doc:`quick-start`
2. :doc:`syntax`
3. :doc:`parsing-model`

Related family pages
--------------------

For a broader family view, also see:

* :doc:`../concepts/mbf`
* :doc:`../concepts/overview`
* :doc:`../reference/glossary`

.. toctree::
   :maxdepth: 2

   quick-start
   syntax
   parsing-model
