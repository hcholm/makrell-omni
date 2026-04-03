Use MRML for Markup
==================

MRML is a good way to see how the Makrell family extends from code and data into
document structure.

Step 1: write a small page
--------------------------

.. code-block:: makrell

    {page
        {title Makrell}
        {p One structural family for code, data, and markup.}}

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

Step 3: add attributes and inline nodes
---------------------------------------

.. code-block:: makrell

    {p [style="color: red"]
        Just some {b bold} text here.}

Why this is useful
------------------

* markup stays compact
* the tree structure is easy to read
* it fits naturally with generated content and DSL-like document workflows

Next steps:

* :doc:`../mrml/index`
* :doc:`../mrml/syntax`
* :doc:`../mrml/cookbook`
