Cookbook
========

MRML becomes attractive when you want document trees to stay compact and structural.

Useful recipe areas:

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

Recipe: a repeated card layout
------------------------------

.. code-block:: makrell

    {section [class="features"]
        {card {h2 Functional} {p Pipes, operators, and composition.}}
        {card {h2 Metaprogrammable} {p Quote, unquote, macros, and mini-languages.}}
        {card {h2 Multi-host} {p Python, TypeScript, and .NET implementations.}}}

Recipe: think in trees, not strings
-----------------------------------

MRML works best when you treat markup as a tree of nodes:

* container nodes
* attribute-bearing nodes
* text children
* nested inline structure

That makes it especially suitable for generation, composition, and embedded
document-oriented DSLs.

More MRML recipes
-----------------

* :doc:`cookbook-fragments`
* :doc:`cookbook-pages`
