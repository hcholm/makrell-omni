Family Tour
===========

Makrell makes the most sense when you see the family side by side. This short
tutorial is meant as a quick orientation pass across the main layers rather than
a deep dive into one implementation.

One shared idea
---------------

At the centre is **MBF**, a structural format that can support:

* programming languages
* data notations
* markup notations
* macros and embedded sublanguages

That shared base is what makes the family feel related instead of merely
co-branded.

Three quick glimpses
--------------------

Makrell-style code:

.. code-block:: makrell

    {fun add [x y]
        x + y}

    [2 5 8] | {map {add 3 _}} | sum

MRON:

.. code-block:: makrell

    project "Makrell"
    hosts ["Python" "TypeScript" ".NET"]

MRML:

.. code-block:: makrell

    {page
        {title Makrell}
        {p One structural family for code, data, and markup.}}

What this should suggest
------------------------

These examples are intentionally small, but together they show the family idea:

* one structural model for code
* one structural model for data
* one structural model for markup

The details differ by implementation and format, but the shared shape is still
visible.

Where to go next
----------------

Continue with:

* :doc:`../concepts/index` for the common model
* :doc:`choosing-an-implementation` to pick a host track
* :doc:`first-program-makrellpy`, :doc:`first-program-makrellts`, or
  :doc:`first-program-makrellsharp` for a first implementation-specific step
