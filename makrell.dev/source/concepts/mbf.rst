MBF
===

MBF, the **Makrell Base Format**, is the structural core of the Makrell family.

It provides:

* bracketed forms
* regular nodes and operator expressions
* a syntax that can preserve source-sensitive structure when needed
* a base that can host programming languages, data formats, and markup formats

Why it matters
--------------

MBF is what lets the Makrell family feel coherent.
Without MBF, MakrellPy, MRON, MRML, and the other implementations would just be
separate surface notations.

With MBF, they can share:

* common parsing intuitions
* a common AST vocabulary
* quote/unquote and macro-oriented workflows
* embedded sublanguages and miniformats

Representative shapes
---------------------

MBF is easiest to recognise through a few simple structural forms:

.. code-block:: makrell

    [2 3 5]
    {add 2 3}
    2 + 3
    {page
        {title Makrell}
        {p One structural family for code, data, and markup.}}

These examples show why MBF matters across the whole family:

* lists
* calls
* operators
* nested document-like trees

How to use this page
--------------------

Use this conceptual MBF page when you want the family-level idea.

Use the dedicated MBF section when you want more practical detail:

* :doc:`../mbf/quick-start`
* :doc:`../mbf/syntax`
* :doc:`../mbf/parsing-model`

See also :doc:`../mbf/index`.
