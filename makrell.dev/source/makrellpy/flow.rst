Program Flow
============

Conditionals
------------

.. code-block:: makrell

    {if 2 < 3                       # an expression that evaluates to "2 is less than 3"
        "2 is less than 3"
        "2 is not less than 3"
    }

    a = 3
    {if                             # if with multiple branches
        a < 3                       
            "a is less than 3"
        a == 3
            "a is 3"
        a < 5
            "a is less than 5"

            "a is something else"   # this is the default case
    }

    {when 2 < 3                     # testing with multiple statements and no return value
        {print "2 is less than 3"}
        {print "2 is still less than 3"}
    }

Returning From a Function
-------------------------

MakrellPy functions return the value of the last expression evaluated, but you can also use the `return` keyword to return a value explicitly. ``return`` is typically used to exit a function early, inside a conditional ``when`` statement:

.. code-block:: makrell

    {fun add [x y]                  # a function that returns the sum of two numbers
        {when x < 0                 # a conditional statement with multiple statements
            {print "x is negative"}
            {return 0}
        }
        return x + y}

Loops
-----

.. code-block:: makrell

    a = 0
    {while a < 5                    # a loop that prints numbers from 0 to 4
        a | print
        a = a + 1
    }

    xs = [2 3 5]
    {for x xs                       # a loop that prints the elements of a list
        x | print
    }

Pattern Matching
----------------

``match`` is a feature that allows you to match a value against a set of patterns. The first pattern that matches the value is executed. Patterns can be literals, lists, types, or wildcards. If no pattern matches, ``match`` returns ``null``. Examples:

.. code-block:: makrell

    {match 2
        2
            "two"
        3 | 5
            "three or five"
        "asd"
            "the string 'asd'"
        []
            "an empty list"
        [2 _ _]
            "a list with three elements, first is 2"
        [_  3 | 5]
            "list with two elements, second is 3 or 5"
        _:str
            "a string"
        _:int & $ < 3
            "an integer less than 3"
        _:Point
            "a Point object"
        _:Point & $.x > 0  # $ refers to the value being matched
            "a Point object with positive x"
        $
            "something truthy"
        _ 
            "something else"
    }

    # keep lists with 3 elements, last element >= 3
    [
        [2 3]
        []
        [3 5 2]
        [3 3 3]
        [null]
        []
        [2 3 5]
    ]
    | {filter {match _ [_ _  $ >= 3]} _} | list | print
    # [[3, 3, 3], [2, 3, 5]]


There is also a shorthand syntax for matching against a single pattern:

.. code-block:: makrell

    a = []
    is_an_empty_list = {match a []}  # true

