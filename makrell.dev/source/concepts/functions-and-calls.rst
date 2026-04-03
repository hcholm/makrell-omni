Functions and Calls
===================

Makrell code tends to revolve around **expressions, calls, and flow**.

Common patterns across the family include:

* direct calls: ``{f x y}``
* pipelines: ``value | f``
* reverse pipelines: ``f \ value``
* partial application with placeholders
* operator-head calls such as ``{+ 2}``

This gives Makrell a strong functional flavour even in host ecosystems that are not
primarily functional.

The exact available call forms vary by implementation, but the underlying idea is
consistent: code should be concise, compositional, and easy to transform.

Representative examples
-----------------------

Direct call:

.. code-block:: makrell

    {add 2 3}

Pipeline:

.. code-block:: makrell

    [2 3 5] | sum

Reverse pipeline:

.. code-block:: makrell

    sum \ [2 3 5]

Placeholder-based partial application:

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    {add3 5}

Operators as callable forms:

.. code-block:: makrell

    2 | {+ 3} | {* 5}

Why this matters
----------------

This style changes how Makrell code reads:

* calls can stay compact
* data flow stays visible
* partial application becomes natural
* operators and ordinary functions can participate in similar pipelines

That is part of why the Makrell family can support both normal programming-language
work and more transform-oriented code.

Implementation notes
--------------------

**MakrellPy**
    Strong practical support for functional flow and higher-order style.

**MakrellTS**
    Similar direction, with additional TypeScript-facing considerations.

**Makrell#**
    Strongly aligned with the family style while also adapting to CLR interop and
    a more explicit compile/load toolchain.
