Common Recipes
==============

These are family-shaped recipes that make sense across more than one implementation.

The goal here is not completeness.
It is to collect small patterns that appear repeatedly across the family.

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

MRON-style data
---------------

.. code-block:: makrell

    owner "Rena Holm"
    active true
    items [
        "MakrellPy"
        "MakrellTS"
        "Makrell#"
    ]

MRML-style structure
--------------------

.. code-block:: makrell

    {section
        {h2 Makrell}
        {p One family for code, data, and markup.}}

Where to go next
----------------

For more specific recipes, continue with:

* :doc:`../makrellpy/cookbook`
* :doc:`../makrellts/cookbook`
* :doc:`../makrellsharp/cookbook`
* :doc:`../mron/cookbook`
* :doc:`../mrml/cookbook`
