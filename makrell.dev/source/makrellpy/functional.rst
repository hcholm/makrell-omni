Functional Programming
======================

Writing Functions
-----------------

Functions are defined using the ``fun`` keyword. The function body is a block of code that is executed when the function is called. The last expression in the block is the return value of the function.

Lambdas or anonymous functions are defined using the ``->`` operator. The lambda body is a single expression that is evaluated when the function is called. Multiline lambdas can be defined using ``{do ...}`` expressions.

.. code-block:: makrell

    {fun add [x y]          # function definition
        x + y
    }

    f = [x] -> x * 2                    # lambda function
    f = x -> x * 2                      # square brackets are optional if there is only one parameter

    f = x -> {do                        # multiline lambda function
        "Hi from f" | print
        x * 2
    }

    mul = [x y] -> x * y                # lambda function

Function Calls
--------------

Functions are called using the function name and the arguments in curly braces. Arguments are separated by whitespace. Lambdas and other function expressions are called in the same way.

.. code-block:: makrell

    {add 2 3}               # 5
    {mul 2 3}               # 6

    {f 3}                   # 6

    {x -> x * 2             # 6, immediately called lambda
        3}

    {fun make_adder [x]     # higher order function returning a function
        y -> x + y}
    add2 = {make_adder 2}
    {add2 3}                # 5

Partial Application
-------------------

.. code-block:: makrell


    add3 = {add 3 _}        # partial application, creates a new function that adds 3 to its argument

    {add3 5}                # 8

Operators as Functions
----------------------

Binary operators can be used as functions by enclosing them in curly braces. This allows for composition of operators.

.. code-block:: makrell

    mul = {*}               # multiplication operator as a function with two arguments

    {{*} 2 3}               # 6, immediate call

    add2 = {+ 2}            # addition operator as a function with one argument

    {2 | {+ 3} | {* 5}}     # 25, operators as functions

    minus_from2 = {- 2}     # the function argument is the right operand
    {minus_from2 3}         # 2 - 3 = -1

{do ...} Expressions
--------------------

``{do ...}`` expressions are used to group multiple expressions into a single expression. The return value of the expression is the return value of the last expression in the block. ``{do ...}`` expressions are implemented as regular functions and thus have their own scope.

.. code-block:: makrell

    b = 2               # outer scope b
    a = {do         
        b = 3           # inner scope b
        b * b
    }
    {print a b}         # 9 2, outer scope b is not affected by inner scope b

Composition
-----------

Functions can be used in a variety of ways. One pattern is to chain functions together with the pipe operator ``|``.

.. code-block:: makrell

    [2 3 5] | sum               # 10

    [2 3 5] | sum | {mul 3 _}   # 30

    2 | {+ 3} | {* 5}           # 25

The reverse pipe operator ``\`` can be used to apply functions in reverse order.

.. code-block:: makrell

    sum \ [2 3 5]               # 10

    {mul 3 _} \ sum \ [2 3 5]   # 30

    {* 5} \ {+ 3} \ 2           # 25

Composing several functions into one
-------------------------------------

The ``>>`` operator can be used to compose several functions into one. The functions are applied from left to right.

.. code-block:: makrell

    sub = {-}

    add2mul3sub5 = add2 >> mul3 >> {sub _ 5}

    5 | add2mul3sub5            # 16

