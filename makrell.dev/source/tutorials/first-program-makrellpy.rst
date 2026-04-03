First Program in MakrellPy
==========================

This short tutorial shows a minimal MakrellPy workflow: install the package,
start the REPL, define a function, and run a small pipeline.

Install MakrellPy
-----------------

.. code-block:: bash

    pip install makrell

Start the REPL
--------------

.. code-block:: bash

    makrell

Try this program
----------------

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

What this does
--------------

This small program shows:

* function definition with ``fun``
* placeholder-based partial application
* pipeline-oriented flow

More concretely:

* ``add`` defines a two-argument function
* ``add3`` fixes the first argument and leaves the second open with ``_``
* the final pipeline maps that function over a list and sums the result

Why this is a good first example
--------------------------------

It introduces several recurring Makrell ideas in a small space:

* a compact structural function form
* functional composition through partial application
* left-to-right pipeline style

Those are not unique to MakrellPy, but MakrellPy is a good place to encounter
them first because the Python track has a broad and practical language surface.

Next steps
----------

Continue with:

* :doc:`../makrellpy/quick-start`
* :doc:`../makrellpy/functional`
* :doc:`../makrellpy/interop`
* :doc:`../makrellpy/metaprogramming`
