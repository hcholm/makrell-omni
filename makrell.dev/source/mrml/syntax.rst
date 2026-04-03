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

MRML is especially compelling when markup should sit close to the same structural
model as your Makrell code and data.
