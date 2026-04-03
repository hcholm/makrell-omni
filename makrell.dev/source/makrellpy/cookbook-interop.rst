Python Interop Recipes
======================

This page collects small MakrellPy interop patterns. The goal is to show how
MakrellPy and Python can call into each other without losing the structural
style of Makrell code.

Recipe: import a Python module
------------------------------

.. code-block:: makrell

    {import math}
    {math.sqrt 4}

This is the simplest interop shape: import a Python module at runtime and call
its functions through ordinary Makrell syntax.

Recipe: import selected names
-----------------------------

.. code-block:: makrell

    {import math@[sin cos]}
    {sin 0} + {cos 0}

This is useful when you want shorter local names instead of carrying the module
prefix through a whole file.

Recipe: call MakrellPy from Python
----------------------------------

MakrellPy is designed for two-way interop with Python modules.

MakrellPy module:

.. code-block:: makrell

    {import pycalc@[mul]}

    {fun add [x y]
        x + y}

Python module:

.. code-block:: python

    import makrell
    from mrcalc import add, mul

    result = add(2, mul(3, 5))
    print(result)

This is useful when Makrell code is one part of a larger Python application
rather than a completely separate environment.

When to use these patterns
--------------------------

These recipes are most useful when you want:

* access to ordinary Python libraries
* MakrellPy code inside a Python-oriented project
* a gradual boundary between Makrell and Python instead of a hard separation

Related pages
-------------

For broader explanation, continue with:

* :doc:`interop`
* :doc:`metaprogramming`
* :doc:`cookbook`
