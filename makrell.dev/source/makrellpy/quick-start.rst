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
