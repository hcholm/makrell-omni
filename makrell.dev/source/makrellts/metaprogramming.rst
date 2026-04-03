Metaprogramming
===============

MakrellTS belongs in the same family-wide macro and quoting story, but the
details have to be described honestly in host-specific terms.

This page should eventually cover:

* quote and unquote support
* macro support level
* compile-time and serialisation strategy
* differences from MakrellPy and Makrell#

Representative example
----------------------

.. code-block:: makrell

    {def macro twice [x]
      [{quote $x} {quote $x}]}

    {twice {print "hello"}}

How to read this page
---------------------

MakrellTS belongs to the same family-wide macro story, but the important
questions in this track are often practical and host-specific:

* how compile-time definitions are represented
* how macros interact with emitted JavaScript
* how browser-oriented execution affects compile-time behaviour
* what remains aligned with MakrellPy and Makrell#

Family alignment and differences
--------------------------------

The family-level ideas are still recognisable:

* code can be treated as structure
* quoting and unquoting matter
* macros can transform forms before runtime

But the implementation strategy can differ because the JS/TS host has different
runtime, packaging, and browser constraints than Python or `.NET`.

How to use this page
--------------------

Use this page as an orientation page for the TypeScript-side compile-time model.
For concrete smaller patterns, the cookbook macro page is often the faster
companion.

Useful related pages
--------------------

* :doc:`../concepts/macros-and-meta`
* :doc:`cookbook-macros`
* :doc:`interop`
* :doc:`tooling`
