Operators
=========

Operators are a central part of Makrell's feel.

Across the family, operators help express:

* infix structure
* pipes and reverse pipes
* composition-friendly code
* partial application
* operator-as-function workflows

Typical examples include:

.. code-block:: makrell

    2 + 3
    [2 3 5] | sum
    sum \ [2 3 5]
    2 | {+ 3} | {* 5}

In more advanced implementations, operators can also be extended or treated as
first-class callable values.

Operator behaviour can differ between implementations, so always check the
implementation-specific pages for the exact supported set.
