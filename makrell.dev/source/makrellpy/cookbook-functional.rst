Functional Recipes
==================

This page collects short MakrellPy recipes for common functional patterns. The
aim is not to explain functional programming from first principles, but to show
how a few recurring tasks look in MakrellPy.

Recipe: partial application
---------------------------

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    {add3 5}

This is one of the most common small patterns in MakrellPy: fix some arguments
now, leave the remaining ones open with placeholders, and reuse the resulting
function later.

Recipe: pipes
-------------

.. code-block:: makrell

    [2 3 5] | sum
    sum \ [2 3 5]

These examples show both forward and reverse pipe style. They are useful when
you want the flow of a small calculation to read left-to-right or right-to-left
depending on the situation.

Recipe: operators as functions
------------------------------

.. code-block:: makrell

    2 | {+ 3} | {* 5}

Operators can participate in higher-order flow instead of only appearing in
ordinary infix expressions.

Recipe: compose several functions
---------------------------------

.. code-block:: makrell

    add2 = {+ 2}
    mul3 = {* 3}
    sub = {-}

    add2mul3sub5 = add2 >> mul3 >> {sub _ 5}

    5 | add2mul3sub5

This shows how small reusable functions can be composed into one larger step and
then dropped back into a pipeline.

When to use these patterns
--------------------------

These recipes are especially useful when you want:

* concise data-flow style
* reusable small functions
* composition without a lot of surrounding scaffolding

Related pages
-------------

For broader explanation, continue with:

* :doc:`functional`
* :doc:`flow`
* :doc:`cookbook`
