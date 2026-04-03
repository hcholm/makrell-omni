Functional Recipes
==================

Recipe: partial application
---------------------------

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    {add3 5}

Recipe: pipes
-------------

.. code-block:: makrell

    [2 3 5] | sum
    sum \ [2 3 5]

Recipe: operators as functions
------------------------------

.. code-block:: makrell

    2 | {+ 3} | {* 5}

Recipe: compose several functions
---------------------------------

.. code-block:: makrell

    add2 = {+ 2}
    mul3 = {* 3}
    sub = {-}

    add2mul3sub5 = add2 >> mul3 >> {sub _ 5}

    5 | add2mul3sub5
