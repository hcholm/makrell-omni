Family Tour
===========

Makrell makes the most sense when you see the family side by side.

One shared idea
---------------

At the centre is **MBF**, a structural format that can support:

* programming languages
* data notations
* markup notations
* macros and embedded sublanguages

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

Where to go next
----------------

* learn the common model in :doc:`../concepts/index`
* choose a host in :doc:`choosing-an-implementation`
* start with :doc:`first-program-makrellpy`, :doc:`first-program-makrellts`, or :doc:`first-program-makrellsharp`
