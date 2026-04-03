Cookbook
========

Important future recipe areas:

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
