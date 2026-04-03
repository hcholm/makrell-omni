Family Overview
===============

The Makrell family brings several ideas together:

* one structural base format for multiple language layers
* compact, readable syntax based on bracket forms and binary operators
* a strong bias toward composition, transformation, and embedding
* support for metaprogramming and user-extensible syntax
* multiple host ecosystems without abandoning a common identity

The most important idea is that Makrell is a **family**, not just a single language.
That means the docs should be read on two levels:

* **family-wide concepts**
* **implementation-specific behaviour**

The family currently contains:

* MakrellPy
* MakrellTS
* Makrell#
* MRON
* MRML
* MBF

Each one uses the shared structural vocabulary differently, but they are meant to
feel related rather than accidental.

What makes the family distinctive?
----------------------------------

Makrell is most interesting when the family relationship matters, not only the
surface syntax of one language.

The distinctive combination is:

* one structural core used for languages, data, and markup
* a syntax model that stays compact while remaining highly structured
* metaprogramming that treats source structure seriously
* a bias toward embedding and extension
* multiple host ecosystems that still feel recognisably related

How the pieces fit together
---------------------------

**MBF**
    The structural substrate.

**MakrellPy, MakrellTS, Makrell#**
    Host-language implementations of Makrell as a programming language family.

**MRON**
    A data notation using the same family shape.

**MRML**
    A markup notation using the same family shape.

That is why Makrell can be more than a single implementation language. It can also
be a design space for tools, formats, and embedded mini-languages.
