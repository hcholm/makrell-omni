Quick Start
===========

This page gives a short introduction to MRML through a few small examples. The
goal is to make the basic tree shape feel familiar before you move on to the
syntax and cookbook pages.

Example MRML document
---------------------

.. code-block:: makrell

    {html
        {head
            {title Makrell}}
        {body
            {h1 Makrell}
            {p Compact markup in the Makrell family.}}}

MRML is especially useful when you want markup to live close to the same family
of structures as your code and data.

Read it as
----------

* an outer ``html`` node
* nested child nodes for ``head`` and ``body``
* normal text content and nested inline structure

Another example
---------------

.. code-block:: makrell

    {section [class="hero"]
        {h1 Makrell}
        {p One structural family for code, data, and markup.}}

This shows a smaller fragment rather than a full page. Both follow the same
basic structural rules.

Why start here?
---------------

MRML is a good introduction when you want to see how the Makrell family handles
tree structure outside ordinary programming-language syntax.

It is especially useful when you want:

* a compact markup tree
* a structure that stays close to the rest of the family
* generated or templated markup that does not begin as raw HTML text

Next steps
----------

Continue with:

* :doc:`syntax`
* :doc:`cookbook`
* :doc:`cookbook-fragments`
* :doc:`cookbook-pages`
