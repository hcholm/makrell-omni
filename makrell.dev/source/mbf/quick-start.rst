Quick Start
===========

MBF is not just a syntax curiosity.
It matters because it provides the common structural backbone used by:

* Makrell languages
* MRON
* MRML
* embedded sublanguages and miniformats

Understanding MBF helps the whole family make sense.

Small examples
--------------

List structure:

.. code-block:: makrell

    [2 3 5]

Call structure:

.. code-block:: makrell

    {add 2 3}

Operator structure:

.. code-block:: makrell

    2 + 3
    [2 3 5] | sum

Nested structure:

.. code-block:: makrell

    {page
        {title Makrell}
        {section
            {p One structural family for code, data, and markup.}}}

What to notice
--------------

The goal is not to memorise every syntax detail immediately.
Instead, notice that:

* bracket shapes carry meaning
* operator forms remain structured
* the same basic syntax model can host code, data, and markup

Next steps
----------

* :doc:`syntax`
* :doc:`parsing-model`
* :doc:`../concepts/mbf`
