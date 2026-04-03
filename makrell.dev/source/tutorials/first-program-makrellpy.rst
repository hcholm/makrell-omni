First Program in MakrellPy
==========================

Install MakrellPy:

.. code-block:: bash

    pip install makrell

Start the REPL:

.. code-block:: bash

    makrell

Try this:

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

What this shows:

* function definition with ``fun``
* placeholder-based partial application
* pipeline-oriented flow

Next steps:

* :doc:`../makrellpy/quick-start`
* :doc:`../makrellpy/functional`
* :doc:`../makrellpy/metaprogramming`
