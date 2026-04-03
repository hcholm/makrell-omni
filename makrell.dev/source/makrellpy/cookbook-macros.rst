Macro Recipes
=============

Recipe: duplicate an expression
-------------------------------

.. code-block:: makrell

    {def macro twice [x]
        [{quote $x} {quote $x}]}

Recipe: wrap a block
--------------------

.. code-block:: makrell

    {def macro timeit [ns]
        [
            {quote {import time}}
            {quote start = {time.time}}
        ] + ns + [
            {quote {print "Time taken:" {time.time} - start}}
        ]}

Recipe: use a meta helper
-------------------------

.. code-block:: makrell

    {meta
        {fun twice_fn [x]
            [{quote $x} {quote $x}]}}

    {def macro twice [x]
        {twice_fn x}}

Recipe: think about hygiene
---------------------------

When macros introduce bindings, remember that generated names may collide with user
code. MakrellPy's macro facilities are powerful, but hygiene and readability still
matter in real projects.
