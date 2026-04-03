Syntax
======

MRON is designed around key/value-oriented Makrell structure rather than JSON
punctuation.

Common ingredients:

* plain scalar values
* lists
* nested object-like structures
* close alignment with MBF

Representative example
----------------------

.. code-block:: makrell

    owner "Rena Holm"
    last_update "2026-04-03"

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

The corresponding model is object-like, but the surface syntax stays Makrell-shaped
instead of JSON-shaped.

Basic shapes
------------

In practice, MRON documents are usually built from just a few shapes:

* scalar values such as strings, numbers, booleans, and null-like values
* key/value object entries
* square-bracket lists
* nested object-like blocks

Example:

.. code-block:: makrell

    project "Makrell"
    active true
    count 3
    tags ["docs" "formats" "languages"]

Nested structure
----------------

Nested objects and lists work by composition rather than by extra punctuation rules.

.. code-block:: makrell

    site {
        title "makrell.dev"
        sections [
            {
                name "concepts"
                public true
            }
            {
                name "tutorials"
                public true
            }
        ]
    }

How to read MRON
----------------

If you already know JSON, a practical reading strategy is:

* each top-level line resembles an object member
* square brackets still indicate lists
* nested braces still indicate nested object-like structure
* the main difference is that the punctuation is lighter

That makes MRON easier to scan for many configuration and document-shaped cases.
