MRON
====

MRON is the Makrell family data notation.

It is meant to be a lightweight alternative to JSON that still feels like part
of the same structural world as the Makrell languages.

Why use MRON?
-------------

* compact, readable syntax
* Makrell-shaped structure instead of JSON punctuation
* natural fit with the rest of the family
* useful for configuration, data exchange, and embedded data

Best fit
--------

MRON is a good fit when you want:

* something lighter and less punctuation-heavy than JSON
* configuration that humans can read and edit comfortably
* data that stays close to the same structural family as your Makrell code
* a format that can be parsed and processed by Makrell-family tools

How to read this section
------------------------

If you are new to MRON:

#. start with :doc:`quick-start`
#. use :doc:`syntax` as the reference page
#. then move to the cookbook pages for common shapes and practical tasks

If you already know the general idea and need working examples, the cookbook
pages are usually the fastest route.

Current implementation note
---------------------------

MRON is part of the shared family design, but the exact tooling around it
depends on the implementation track. In the current `.NET` implementation,
MRON parses to ``System.Text.Json.JsonDocument`` so it can fit naturally into
existing `.NET` JSON workflows.

Related pages
-------------

For family context and comparison, also see:

* :doc:`../concepts/overview`
* :doc:`../reference/implementation-matrix`
* :doc:`../mrml/index`

.. toctree::
   :maxdepth: 2

   quick-start
   syntax
   cookbook
   cookbook-configuration
   cookbook-json-shape
