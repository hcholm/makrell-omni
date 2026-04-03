Quick Start
===========

Makrell# is designed to feel familiar to Makrell users while fitting the .NET world.

Representative example
----------------------

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

Representative interop example
------------------------------

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder []}
    {sb.Append "Makrell#"}
    {sb.ToString}

Pattern-matching example
------------------------

.. code-block:: makrell

    {match [2 5]
        [x=_ y=_]
            {when x < y
                x + y}
        _
            0}

See also the implementation docs in the repo under ``impl/dotnet/``.
