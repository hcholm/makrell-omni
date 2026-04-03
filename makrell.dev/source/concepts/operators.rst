Operators
=========

Operators are a central part of Makrell's feel.

Across the family, operators help express:

* infix structure
* pipes and reverse pipes
* composition-friendly code
* partial application
* operator-as-function workflows

Typical examples include:

.. code-block:: makrell

    2 + 3
    [2 3 5] | sum
    sum \ [2 3 5]
    2 | {+ 3} | {* 5}

In more advanced implementations, operators can also be extended or treated as
first-class callable values.

Operator behaviour can differ between implementations, so always check the
implementation-specific pages for the exact supported set.

Common operator roles
---------------------

Operators in the Makrell family are not only arithmetic symbols.
They often help express different kinds of structural intent:

* arithmetic and comparison
* data flow through pipes
* function shaping through partial application
* structural matching in pattern contexts
* composition-friendly shorthand

Representative examples
-----------------------

Arithmetic:

.. code-block:: makrell

    2 + 3
    2 * (3 + 5)

Pipes:

.. code-block:: makrell

    [2 3 5] | sum
    sum \ [2 3 5]

Operators as functions:

.. code-block:: makrell

    add3 = {+ 3}
    2 | add3 | {* 5}

Pattern-oriented use:

.. code-block:: makrell

    {match value
        2 | 3
            "small"
        _
            "other"}

Why this matters
----------------

The operator model affects both readability and extensibility.
It lets short expressions stay compact, but it also keeps the family aligned with
transformation-oriented workflows, where operators can participate in parsing,
partial application, and macro-related structure.

Implementation notes
--------------------

**MakrellPy**
    Broad operator support, including user-extensible behaviour.

**MakrellTS**
    Family-aligned direction, with implementation-specific limits depending on the
    current compiler/runtime surface.

**Makrell#**
    Includes arithmetic, pipes, map-pipe forms, operator-as-function support, and a
    growing operator-related runtime surface.
