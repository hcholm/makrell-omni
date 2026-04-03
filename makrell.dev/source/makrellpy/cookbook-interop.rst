Python Interop Recipes
======================

Recipe: import a Python module
------------------------------

.. code-block:: makrell

    {import math}
    {math.sqrt 4}

Recipe: import selected names
-----------------------------

.. code-block:: makrell

    {import math@[sin cos]}
    {sin 0} + {cos 0}

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
