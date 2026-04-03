Cookbook
========

MRON is most useful when you need structured documents that humans can still read and
edit comfortably.

Useful recipe areas:

* configuration files
* nested documents
* conversions to and from host JSON models
* computed or embedded values where supported

Small example
-------------

.. code-block:: makrell

    name "Makrell#"
    features {
        macros true
        pattern_matching true
    }

Recipe: human-edited configuration
----------------------------------

MRON is a good fit for configuration-like documents because it stays structured
without forcing JSON punctuation everywhere.

.. code-block:: makrell

    project "Makrell"
    environment "dev"
    features {
        docs true
        macros true
        mrml true
    }

Recipe: nested object lists
---------------------------

.. code-block:: makrell

    books [
        {
            title "That Time of the Year Again"
            year 1963
        }
        {
            title "One for the Team"
            year 2024
        }
    ]

Recipe: feature flags and environment values
--------------------------------------------

.. code-block:: makrell

    mode "development"
    debug true
    endpoints {
        api "https://api.example.test"
        docs "https://docs.example.test"
    }

Recipe: shape close to JSON, but lighter to edit
------------------------------------------------

MRON is especially nice when the data would be awkward or noisy in JSON.

.. code-block:: makrell

    team {
        name "Makrell"
        languages ["MakrellPy" "MakrellTS" "Makrell#"]
        formats ["MRON" "MRML"]
    }

The same document in JSON would be perfectly possible, but MRON keeps the same
structure while reducing punctuation overhead.

Recipe: think in objects and lists
----------------------------------

The easiest way to write MRON well is to think in just a few shapes:

* scalar values
* key/value objects
* lists of values
* lists of nested objects

That covers a large fraction of practical configuration and data files.

More MRON recipes
-----------------

* :doc:`cookbook-configuration`
* :doc:`cookbook-json-shape`
