Use MRML for Markup
==================

MRML is a good way to see how the Makrell family extends from code and data into
document structure. This short tutorial walks through a small progression from a
minimal page to nested markup and inline structure.

Step 1: write a small page
--------------------------

.. code-block:: makrell

    {page
        {title Makrell}
        {p One structural family for code, data, and markup.}}

This establishes the basic shape: one root node containing nested document
elements.

Step 2: add nested structure
----------------------------

.. code-block:: makrell

    {page
        {hero
            {h1 Makrell}
            {p Compact structural markup.}}
        {section
            {h2 Why it matters}
            {p MRML stays close to the same family model as Makrell code.}}}

This shows how deeper tree structure remains readable without switching to a
different underlying notation.

Step 3: add attributes and inline nodes
---------------------------------------

.. code-block:: makrell

    {p [style="color: red"]
        Just some {b bold} text here.}

This mixes attributes, text, and inline nested nodes inside one compact form.

Why this is useful
------------------

* markup stays compact
* the tree structure is easy to read
* it fits naturally with generated content and DSL-like document workflows

Next steps
----------

Continue with:

* :doc:`../mrml/index`
* :doc:`../mrml/syntax`
* :doc:`../mrml/cookbook`
