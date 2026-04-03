Classes
=======

MakrellPy includes object-oriented forms alongside its functional and macro-oriented
style.

Why this matters
----------------

For some tasks, especially Python-facing ones, classes are the natural fit.
MakrellPy does not require an object-oriented style everywhere, but it can support it
when the host ecosystem or the domain benefits from it.

Representative shape
--------------------

The exact class surface can evolve, but the general idea is that MakrellPy can define
and work with Python-compatible object structures while staying inside the family
syntax style.

Example:

.. code-block:: makrell

    Point = {class Point
        {fun __init__ [self x y]
            self.x = x
            self.y = y}

        {fun length_sq [self]
            self.x * self.x + self.y * self.y}}

    p = {new Point [2 3]}
    {p.length_sq}

What to notice
--------------

Even in a class-oriented example, several familiar Makrell ideas remain visible:

* method bodies still use normal Makrell expressions
* construction still fits the family structure
* the overall syntax stays close to the rest of the implementation

Relationship to Python
----------------------

Classes in MakrellPy matter partly because they live close to Python interop.
That means they are useful when:

* a Python-facing API expects objects
* you want a MakrellPy module to expose richer structured values
* a domain already fits an object-oriented model better than a purely functional one

Related pages
-------------

* :doc:`functional`
* :doc:`interop`
* :doc:`metaprogramming`
