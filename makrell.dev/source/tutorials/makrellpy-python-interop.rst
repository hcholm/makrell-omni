MakrellPy and Python Interop
============================

MakrellPy is designed to work with Python rather than replace access to it.
This tutorial shows the simplest two directions: calling Python from MakrellPy
and exposing MakrellPy functions to Python.

Step 1: import from Python
--------------------------

.. code-block:: makrell

    {import math}
    {math.sqrt 4}

You can also import selected names:

.. code-block:: makrell

    {import math@[sin cos]}
    {sin 0} + {cos 0}

This is the simplest runtime interop shape: treat a Python module as a host
library and call into it from MakrellPy.

Step 2: expose MakrellPy functions
----------------------------------

MakrellPy modules can also be imported from Python.

MakrellPy module:

.. code-block:: makrell

    {fun add [x y]
        x + y}

Python module:

.. code-block:: python

    import makrell
    from mrcalc import add

    print(add(2, 3))

This is useful when Makrell code is one part of a larger Python application
rather than a separate island.

Why this matters
----------------

This is one of the main reasons MakrellPy is still an important implementation
in the family. It lets Makrell code sit close to the Python ecosystem without
giving up the Makrell syntax model.

Next steps
----------

Continue with:

* :doc:`../makrellpy/interop`
* :doc:`../makrellpy/cookbook-interop`
* :doc:`../makrellpy/metaprogramming`
