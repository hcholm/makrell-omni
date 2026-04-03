Syntax
======

MBF is centred on structured nodes rather than conventional line-oriented or
heavily punctuation-oriented syntax.

Key ideas include:

* bracket forms
* regular nodes
* operator expressions
* source-preserving structure where needed

Representative examples
-----------------------

Bracketed structure:

.. code-block:: makrell

    [2 3 5]
    {add 2 3}
    (2 + 3)

Operator structure:

.. code-block:: makrell

    2 + 3
    [2 3 5] | sum
    2 | {+ 3} | {* 5}

Nested structural forms:

.. code-block:: makrell

    {page
        {title Makrell}
        {section
            {p One structural family for code, data, and markup.}}}

What to look for
----------------

When reading MBF syntax, the main things to notice are:

* bracket shapes carry structure
* operators can create readable infix forms
* the result is still meant to be parseable as structured data, not only as text

This is part of why MBF can act as the basis for multiple related languages and
formats.

How to use this page
--------------------

Use this page to get comfortable with the visible syntax shapes. Then continue
to :doc:`parsing-model` when you want to understand how those shapes are turned
into structured nodes.
