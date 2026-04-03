Use MRON for Configuration
==========================

MRON is a good first Makrell-family format because it is easy to read and directly
useful.

Step 1: write a small configuration
-----------------------------------

.. code-block:: makrell

    project "Makrell"
    environment "dev"
    features {
        docs true
        macros true
        mrml true
    }

Step 2: add a list
------------------

.. code-block:: makrell

    hosts [
        "Python"
        "TypeScript"
        ".NET"
    ]

Step 3: nest records
--------------------

.. code-block:: makrell

    tools [
        {
            name "MakrellPy"
            kind "language"
        }
        {
            name "MRON"
            kind "format"
        }
    ]

Why this is useful
------------------

* the structure stays clear without JSON punctuation noise
* it fits naturally with the rest of the Makrell family
* it works well for hand-edited structured documents

Next steps:

* :doc:`../mron/index`
* :doc:`../mron/syntax`
* :doc:`../mron/cookbook`
