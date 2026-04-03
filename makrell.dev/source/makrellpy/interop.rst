Python Interop
==============

MakrellPy has full two-way support for Python interop through ``import`` statements.


Importing From Python
---------------------

.. code-block:: makrell

    {import math}               # import the math module from Python

    {math.sqrt 4}               # 2.0

    {import math@[sin cos]}     # import sin and cos from the math module

    {sin 0} + {cos 0}           # 1.0


Python Importing From MakrellPy
-------------------------------

Example of importing between Python and MakrellPy modules.

A module written in Python:

.. code-block:: python

    # pycalc.py

    def mul(x, y):
        return x * y

Import the Python module into a MakrellPy module:

.. code-block:: makrell

    # mrcalc.mr

    {import pycalc@[mul]}

    {fun add [x y] x + y}

    {print "Running in mrcalc.mr:"  {add 2 3}}

Call the MakrellPy module from Python:

.. code-block:: python

    # main.py

    import makrell              # import the makrell module before importing from mrcalc
    from mrcalc import add, mul

    a = add(2, mul(3, 5))
    print("Running in main.py:", a)

Run the Python script:

.. code-block:: bash
    
    $ python main.py
    Running in mrcalc.mr: 5
    Running in main.py: 17

