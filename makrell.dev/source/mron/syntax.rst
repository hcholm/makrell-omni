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
