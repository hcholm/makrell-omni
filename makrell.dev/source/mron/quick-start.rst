Quick Start
===========

Example MRON document:

.. code-block:: makrell

    owner "Rena Holm"
    last_update "2026-04-03"

    tools [
        "MakrellPy"
        "MakrellTS"
        "Makrell#"
    ]

This is a good first page to show readers that Makrell-shaped data can be both
structured and compact.

Read it as:

* top-level key/value entries
* a list under ``tools``
* scalar values without JSON punctuation

Another example
---------------

.. code-block:: makrell

    project "makrell.dev"
    environment "development"
    features {
        docs true
        tutorials true
        search true
    }

Why start here?
---------------

MRON is one of the easiest ways into the Makrell family because:

* the syntax is small
* the data model is familiar
* the documents are useful immediately for configuration and structured content

Next steps
----------

* :doc:`syntax`
* :doc:`cookbook`
* :doc:`cookbook-configuration`
* :doc:`cookbook-json-shape`
