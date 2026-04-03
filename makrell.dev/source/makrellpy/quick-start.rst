Quick Start
===========

Run the REPL
------------

.. code-block:: bash

    makrell

Example session
---------------

.. code-block:: makrell

    > 2 + 3
    5
    > [2 3 5] | sum
    10

What this shows
---------------

Even the smallest REPL session already shows two common family patterns:

* ordinary expressions such as ``2 + 3``
* pipeline-oriented usage such as ``[2 3 5] | sum``

Run a script
------------

.. code-block:: bash

    makrell myscript.mr

Small example
-------------

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}

    [2 5 8] | {map add3} | sum

What to notice
--------------

This small example introduces several MakrellPy basics at once:

* ``fun`` for function definition
* placeholder-based partial application with ``_``
* a pipeline-oriented way of writing data flow

Async example
-------------

.. code-block:: makrell

    {import asyncio}

    {async fun just_sleep [n]
        {await {asyncio.sleep n}}
        n + 2}

    {async fun main []
        n = {await {just_sleep 1}}
        {print n}}

    {asyncio.run {main}}

MakrellPy already supports the shared family baseline of ``{async fun ...}``
and ``{await ...}``, and it also goes further with Python-shaped async forms
such as ``async for`` and ``async with``.

Next steps
----------

* :doc:`basics`
* :doc:`functional`
* :doc:`interop`
* :doc:`metaprogramming`
