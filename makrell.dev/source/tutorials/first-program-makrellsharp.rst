First Program in Makrell#
=========================

From ``impl/dotnet`` run:

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh

Try a small source file:

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

Then try a tiny CLR interop example:

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder []}
    {sb.Append "Makrell#"}
    {sb.ToString}

What this shows:

* familiar Makrell function and pipe style
* Makrell-shaped CLR access
* the bridge between family syntax and .NET workflows

Next steps:

* :doc:`../makrellsharp/quick-start`
* :doc:`../makrellsharp/interop`
* :doc:`../makrellsharp/macros-and-meta`
