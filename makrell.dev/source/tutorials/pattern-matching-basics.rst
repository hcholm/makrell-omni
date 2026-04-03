Pattern Matching Basics
=======================

Pattern matching is one of the clearer ways to see the Makrell family as a structured
language design rather than only a compact syntax.

Step 1: match a literal
-----------------------

.. code-block:: makrell

    {match value
        2
            "two"
        _
            "other"}

This is the smallest useful pattern shape:

* a literal case
* a wildcard fallback

Step 2: match structure
-----------------------

.. code-block:: makrell

    {match [2 5]
        [x=_ y=_]
            x + y
        _
            0}

Now the match is doing more than checking equality. It is also pulling structure
apart and binding names.

Step 3: match by type
---------------------

.. code-block:: makrell

    {match value
        _:str
            "string"
        _
            "other"}

Step 4: match regular sequence shape
------------------------------------

.. code-block:: makrell

    {match [2 3 5]
        {$r 2 _ 5}
            true
        _
            false}

Why this matters
----------------

Pattern matching lets you write expected structure directly.
That often makes control flow easier to read than separate tests, indexing, and
unpacking code.

Where to go next
----------------

* :doc:`../concepts/pattern-matching`
* :doc:`../makrellpy/metaprogramming`
* :doc:`../makrellsharp/guide`
