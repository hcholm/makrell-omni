Common Recipes
==============

These are family-shaped recipes that make sense across more than one implementation.

Partial application
-------------------

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    {add3 5}

Pipes
-----

.. code-block:: makrell

    [2 5 8] | sum
    sum \ [2 5 8]

Operators as functions
----------------------

.. code-block:: makrell

    2 | {+ 3} | {* 5}

Pattern matching
----------------

.. code-block:: makrell

    {match 2
        2
            "two"
        _
            "other"}

Quote and macros
----------------

.. code-block:: makrell

    {def macro twice [x]
        [{quote $x} {quote $x}]}
