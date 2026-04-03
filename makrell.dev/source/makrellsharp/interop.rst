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
