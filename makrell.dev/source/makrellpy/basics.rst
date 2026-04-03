Basic Constructs
================

Values
------

Numerical literals
^^^^^^^^^^^^^^^^^^

.. code-block:: makrell

    2
    2.5
    -2.5e+10

    2.5k        # 2,500
    2.5M        # 2,500,000
    2.5G        # 2,500,000,000
    2.5T        # 2,500,000,000,000
    2.5E        # 2,500,000,000,000,000
    2pi         # 6.283185307179586

    "ff"hex     # 255, hexadecimal FF
    "A74FF"hex  # 685311, hexadecimal A74FF

String literals
^^^^^^^^^^^^^^^

.. code-block:: makrell

    "Hello, World!"
    "This is a string: \"Hi.\""     # escaping double quotes

Note that these values have more C-style names instead of Python-style names (the Python names can also be used):

.. code-block:: makrell

    true    # Python: True
    false   # Python: False
    null    # Python: None

E-Strings
^^^^^^^^^

E-strings are strings that can contain MakrellPy expressions:

.. code-block:: makrell

    "2 + 3 = {2 + 3}"e                          # "2 + 3 = 5"

    "a{2 + 3}{{sum [5 7 11]}}{[13 17]|sum}"e    # "a52330"

Lists
^^^^^

These work like Python lists, but without commas:

.. code-block:: makrell

    [2 3 5 7]
    [2 3 5 [7 11 13] 17]

Arithmetic Expressions
----------------------

.. code-block:: makrell

    2 + 3               # 5
    2 - 3               # -1, space after the minus sign to avoid confusion with negative numbers
    2 * 3 + 5 * 7       # = 6 + 35 = 41, multiplication has higher precedence than addition
    2 * (3 + 5) * 7     # = 2 * 8 * 7 = 112, parentheses can be used to group expressions

    2 == 3              # false
    2 != 3              # true
    2 < 3               # true

    true && false       # false, logical AND
    true || false       # true, logical OR
    {not true}          # false, logical NOT
    true | not          # same as {not true}, using pipe syntax
