Fragment Recipes
================

MRML works well for reusable structural fragments. This page collects small
fragment-shaped examples that are useful when you do not need a whole document
or page tree.

Recipe: a hero block
--------------------

.. code-block:: makrell

    {section [class="hero"]
        {h1 Makrell}
        {p One structural family for code, data, and markup.}}

This is a typical fragment recipe: one reusable subtree that can later be
embedded inside a larger page or document shape.

Recipe: an inline emphasis fragment
-----------------------------------

.. code-block:: makrell

    {p
        Start with the {b shared concepts} section.}

MRML fragments do not have to be large. Small inline structures are often just
as useful, especially when building generated or templated markup.

Recipe: a feature-card group
----------------------------

.. code-block:: makrell

    {section [class="features"]
        {card {h2 Functional} {p Pipes, operators, and composition.}}
        {card {h2 Metaprogrammable} {p Quote, unquote, macros, and mini-languages.}}
        {card {h2 Multi-host} {p Python, TypeScript, and .NET implementations.}}}

This shows the practical benefit of structural markup: repeated visual patterns
can be expressed as clear nested trees rather than stitched together as text.

Why fragments matter
--------------------

Fragments let you think in reusable tree shapes instead of string concatenation
or raw HTML snippets.

They are especially useful when you want:

* reusable pieces of markup
* generated sections that later fit into a bigger page
* embedded document languages or DSL-like structures

Related pages
-------------

For larger document shapes, continue with:

* :doc:`cookbook-pages`
* :doc:`../mrml/cookbook`
* :doc:`../tutorials/mrml-markup`
