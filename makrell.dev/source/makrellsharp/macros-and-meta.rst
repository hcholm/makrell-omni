Macros and Meta
===============

Makrell# is building a substantial compile-time system in the .NET ecosystem.

Important themes:

* quote and unquote
* compile-time ``meta`` execution
* Makrell-defined macros
* replayable compile-time metadata via ``importm``
* whitespace-preserving macro input when needed

This page should become the user-facing explanation of how the Makrell family
metaprogramming model translates into the CLR world.

Representative macro example
----------------------------

.. code-block:: makrell

    {meta
        greeting = {quote "Hello from meta"}}

    {def macro hello [ns]
        {quote {String.Join " " [{unquote greeting} "and macros"]}}}
