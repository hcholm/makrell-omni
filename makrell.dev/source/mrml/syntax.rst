Syntax
======

MRML uses Makrell-shaped node structure for markup trees.

Typical ingredients include:

* tag-like nodes
* attribute lists
* child nodes
* alignment with MBF structure

Representative example
----------------------

.. code-block:: makrell

    {html
        {head
            {title A Test}}
        {body
            {h1 This is a Test}
            {p [style="color: red"] Just some {b bold} text here.}}}

MRML is especially useful when markup should sit close to the same structural
model as your Makrell code and data.

Basic shapes
------------

In practice, MRML usually consists of a few recurring shapes:

* a node name in curly form
* optional attribute lists
* text children
* nested child nodes

Example:

.. code-block:: makrell

    {p [class="lead"]
        A paragraph with an attribute and text content.}

Nested nodes
------------

Nested trees are expressed directly through nesting, rather than by switching to a
different syntax model.

.. code-block:: makrell

    {section
        {h1 Makrell}
        {p One structural family for code, data, and markup.}
        {ul
            {li MBF}
            {li MRON}
            {li MRML}}}

Inline structure
----------------

Inline structure uses the same general model.

.. code-block:: makrell

    {p
        Use the {b shared concepts} section first.}

How to read MRML
----------------

If you already know HTML or XML, a practical reading strategy is:

* outer curly forms correspond to elements
* square-bracket forms often hold attributes
* children are written directly inside the parent node
* the result is a tree first, not a string first
