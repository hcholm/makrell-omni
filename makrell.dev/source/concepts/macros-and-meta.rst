Macros and Meta
===============

Metaprogramming is one of the main parts of the Makrell design.

The family aims to support:

* quoting and unquoting
* compile-time execution
* source-preserving AST workflows
* embedded mini-languages
* macros that may be whitespace-sensitive when needed

This matters because Makrell is not only intended as a language to write code in,
but also as a language to shape languages with.

Implementation differences matter here:

* MakrellPy is the strongest current reference point
* Makrell# is developing an increasingly substantial compile-time system
* MakrellTS has its own host-specific tradeoffs

Use the implementation-specific metaprogramming pages for exact semantics.

Core mental model
-----------------

The basic idea is that Makrell code can be treated as structured data during
compilation, transformed, and then lowered again into executable code.

That enables:

* syntactic extension without abandoning the family structure
* embedded mini-languages
* compile-time helpers and code generation
* structural manipulation that can preserve original source details when needed

Representative macro shape
--------------------------

.. code-block:: makrell

    {def macro twice [x]
        [{quote $x} {quote $x}]}

    {twice {print "hello"}}

Representative meta shape
-------------------------

.. code-block:: makrell

    {meta
        greeting = {quote "Hello"}}

    {def macro hello [ns]
        {quote {print {unquote greeting}}}}

Whitespace-sensitive expansion
------------------------------

One of the more notable ideas in the Makrell family is that macro expansion may
need access to the original source-shaped nodes, including whitespace-sensitive
structure.

That matters for:

* embedded sublanguages
* MRML-like document syntax
* macros that need to choose for themselves whether to regularise input

So the macro system is not just about replacing syntax trees mechanically. It is
also about preserving enough source structure to make richer language extension
possible.
