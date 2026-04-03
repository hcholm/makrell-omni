Interop
=======

Interop is one of the main reasons Makrell# exists.

This section should eventually cover:

* importing namespaces and types
* CLR construction and member access
* generic type usage
* generic method calls
* delegates and function adaptation
* dynamic loading and compiled assemblies

Representative imports
----------------------

.. code-block:: makrell

    {import System.Text}
    {import System.Text@[Encoding]}
    {import System.Text.StringBuilder}
    {import (list string)}

Makrell-shaped generic types
----------------------------

.. code-block:: makrell

    {new (list string) ["a" "b"]}
    {new (dict string int) [["a" 1] ["b" 2]]}
    {new (array string) ["a" "b"]}

Static and instance examples
----------------------------

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder ["Mak"]}
    {sb.Append "rell#"}
    {sb.ToString}

What this page is about
-----------------------

Makrell# interop is about making CLR access fit naturally into Makrell-shaped code.

In practice, that means:

* imports should look like part of the language, not bolted-on foreign syntax
* generic types should use Makrell-shaped forms
* object construction, member access, and static calls should compose with normal
  Makrell flow

Representative combined example
-------------------------------

.. code-block:: makrell

    {import System.Text}

    names = {new (list string) ["Makrell" "Sharp"]}
    joined = {String.Join " " names}

    sb = {new StringBuilder []}
    {sb.Append joined}
    {sb.ToString}

Related pages
-------------

* :doc:`guide`
* :doc:`tooling`
* :doc:`cookbook-interop`
* :doc:`cookbook-cli`
