Metaprogramming
===============

MakrellTS belongs in the same family-wide macro and quoting story, but the details
must be documented honestly in host-specific terms.

This page should eventually cover:

* quote and unquote support
* macro support level
* compile-time and serialisation strategy
* differences from MakrellPy and Makrell#

Representative example
----------------------

.. code-block:: makrell

    {def macro twice [x]
      [{quote $x} {quote $x}]}

    {twice {print "hello"}}
