Metaprogramming
===============

Metaprogramming is a programming technique in which computer programs can treat other program code as data and modify the program code. This is a powerful technique, but should be used with caution, as it can make the code harder to understand and maintain. In MakrellPy, metaprogramming code is executed at compile time, and can be used to generate code, implement domain-specific languages and more.

Macros
------

A common use of metaprogramming is to define macros, which are code templates that can be expanded into other code. In MakrellPy, macros are defined using the ``macro`` keyword. The macro body is a block of code that is executed when the macro is expanded. The macro body can contain other macros, which are expanded recursively.

Example: Execution Time Measurement
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: makrell

    {def macro timeit [ns]
        {print "This is printed at compile time"}

        [
            {quote {import time}}
            {quote start = {time.time}}
        ] + ns + [
            {quote {print "Time taken:" {time.time} - start}}
        ]
    }

    {print "Starting"}
    a = 0
    {timeit
        {while a < 10000000
            a = a + 1
        }
    }
    {print a}
    {print "Done"}

This macro will add the statements ``{import time}`` and ``start = {time.time}`` before the code block that is passed to it, and the expression ``{print "Time taken:" {time.time} - start}`` after it. The resulting code after macro expansion will look like this:

.. code-block:: makrell

    {print "Starting"}
    a = 0
    {import time}
    start = time.time
    {while a < 10000000
        a = a + 1
    }
    {print "Time taken:" time.time - start}
    {print a}
    {print "Done"}

Running this code will output something like this:

.. code-block:: text

    This is printed at compile time
    Starting
    Time taken: 0.49701976776123047
    10000000
    Done

Macro Hygiene
^^^^^^^^^^^^^

The previous example demonstrates a common problem with macros called "macro hygiene". In the expanded code, the variable ``start`` is defined in the macro. This can lead to name conflicts if the variable ``start`` is used elsewhere in the code. To avoid this problem, MakrellPy provides a mechanism called "macro hygiene" that ensures that variables defined in macros do not conflict with variables in the code block. This is done by using the built-in function ``{gensym}`` to generate unique variable names. A new macro can be defined to handle this:

(TBD)

The Meta
--------

MakrellPy runs macro definitions and other metaprogramming code at compile time in the "meta" context. ``meta`` blocks can be used to run arbitrary code during compilation. Macros are implemented as functions that take a list of syntax nodes (AST nodes) as input and return a list of syntax nodes as output, running in the meta context. The ``timeit`` macro from the previous example could also be written using a ``meta`` expression:

.. code-block:: makrell

    {meta
        {fun timeit [ns]
            {print "This is printed at compile time"}
            
            [
                {quote {import time}}
                {quote {import time}}
                {quote start = {time.time}}
            ] + ns + [
                {quote {print "Time taken:" {time.time} - start}}
            ]
        }
    }

With ``meta``, it's possible to run code that doesn't fit into macros, such as defining supporting functions or variables, or running arbitrary code.

