Pattern Matching
================

Pattern matching is one of the most expressive parts of the Makrell family.

Common ideas include:

* literal patterns
* wildcard ``_``
* structural patterns
* type-oriented patterns
* regular patterns such as ``{$r ...}``
* capture bindings
* user-extensible matching

Pattern systems can vary significantly across implementations.
MakrellPy currently provides the broadest reference point, while Makrell# is
building up a growing subset with .NET-oriented behaviour.

When reading the docs, use this page for the conceptual picture and the
implementation pages for actual supported syntax.

Core pattern ideas
------------------

Many Makrell-family pattern systems revolve around a small set of recurring ideas:

* matching literal values directly
* using ``_`` as a wildcard
* matching by structure rather than by manual indexing
* binding names as part of the match
* matching by type
* expressing repeated or regular structure

Representative examples
-----------------------

Literal and wildcard patterns:

.. code-block:: makrell

    {match a
        2
            "two"
        _
            "other"}

Structural list pattern:

.. code-block:: makrell

    {match [2 5]
        [x=_ y=_]
            x + y
        _
            0}

Type-oriented pattern:

.. code-block:: makrell

    {match value
        _:str
            "string"
        _
            "other"}

Regular pattern:

.. code-block:: makrell

    {match [2 3 5]
        {$r 2 _ 5}
            true
        _
            false}

Why this matters
----------------

Pattern matching changes how programs are written.
Instead of repeatedly pulling values apart with explicit conditionals and indexing,
the structure you expect can be written directly in the match.

That tends to make:

* data-dependent control flow clearer
* destructuring more direct
* structural mini-languages easier to work with
* macro and AST-oriented code more readable

Implementation notes
--------------------

**MakrellPy**
    The broadest current reference point for pattern-matching expressiveness.

**MakrellTS**
    The long-term expectation is family alignment, but support depth can differ.

**Makrell#**
    Already supports a meaningful subset including literals, lists, captures,
    guards, type patterns, and regular-pattern forms.
