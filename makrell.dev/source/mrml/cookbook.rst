Cookbook
========

Important future recipe areas:

* HTML generation
* attributes and children
* reusable document fragments
* data-driven rendering
* documentation-page generation

Small example
-------------

.. code-block:: makrell

    {page [lang="en"]
        {title "Makrell#"}
        {p "A small MRML example."}}

Recipe: a simple HTML fragment
------------------------------

.. code-block:: makrell

    {section [class="hero"]
        {h1 Makrell}
        {p One structural family for code, data, and markup.}}

Recipe: nested emphasis and attributes
--------------------------------------

.. code-block:: makrell

    {p [style="color: red"]
        Just some {b bold} text here.}

Recipe: documentation-page style structure
------------------------------------------

.. code-block:: makrell

    {page [lang="en"]
        {title "Makrell docs"}
        {section
            {h1 "Getting Started"}
            {p "Begin with the shared concepts section."}}}
