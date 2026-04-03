JSON-Like Data Recipes
======================

MRON can express the same broad kinds of tree-shaped data people often use JSON
for, but in a syntax that stays closer to the Makrell family.

Recipe: nested objects
----------------------

.. code-block:: makrell

    project {
        name "Makrell"
        homepage "https://makrell.dev"
        maintainers [
            {
                name "Hans-Christian Holm"
                role "author"
            }
        ]
    }

This shows the most common object-style pattern: nested key/value groups with
lists inside them.

Recipe: arrays of records
-------------------------

.. code-block:: makrell

    books [
        {
            title "That Time of the Year Again"
            year 1963
            author "Norton Max"
        }
        {
            title "One for the Team"
            year 2024
            author "Felicia X"
        }
    ]

Recipe: booleans, numbers, and strings together
-----------------------------------------------

.. code-block:: makrell

    stats {
        active true
        users 1250
        ratio 0.84
        note "Example document"
    }

How to think about it
---------------------

If you already know JSON, the easiest mental model is:

* object members become key/value lines
* arrays become square-bracket lists
* nested objects become nested Makrell-shaped blocks

That gives you most of the benefit immediately.

Typical use cases
-----------------

These recipes are useful when you want:

* JSON-like configuration or data files
* human-readable nested records
* lists of similarly shaped objects

Related pages
-------------

For configuration-oriented use, continue with:

* :doc:`cookbook-configuration`
* :doc:`../mron/syntax`
* :doc:`../tutorials/mron-configuration`
