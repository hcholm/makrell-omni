Configuration Recipes
=====================

MRON is especially strong as a human-edited configuration format. This page
collects a few common configuration-shaped examples rather than treating MRON
only as abstract structured data.

Recipe: environment-specific settings
-------------------------------------

.. code-block:: makrell

    app "makrell.dev"
    environment "development"
    server {
        host "127.0.0.1"
        port 8010
    }
    features {
        docs true
        search true
        experimental false
    }

This is a typical MRON configuration shape: a handful of top-level settings plus
nested grouped settings where the structure needs to stay readable.

Recipe: service endpoints
-------------------------

.. code-block:: makrell

    services {
        api "https://api.example.test"
        docs "https://docs.example.test"
        assets "https://assets.example.test"
    }

Recipe: simple lists of enabled modules
---------------------------------------

.. code-block:: makrell

    enabled [
        "makrellpy"
        "mron"
        "mrml"
    ]

Why this works well
-------------------

For configuration, MRON keeps the shape obvious while staying visually lighter
than JSON. That makes it easier to scan and edit by hand.

Typical use cases
-----------------

These configuration recipes are most useful for:

* local development settings
* feature toggles
* service endpoint maps
* lists of enabled modules or capabilities

Related pages
-------------

For more on other data shapes, continue with:

* :doc:`cookbook-json-shape`
* :doc:`../mron/syntax`
* :doc:`../tutorials/mron-configuration`
