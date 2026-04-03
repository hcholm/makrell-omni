Cookbook
========

Makrell# becomes compelling when you combine Makrell syntax with the CLR.

Useful recipe areas
-------------------

* run a `.mrsh` file from the CLI
* build an assembly and run it later
* inspect generated C#
* parse MRON and MRML from the CLI
* use CLR types with Makrell-shaped generic forms
* use `meta`, `def macro`, and `importm`

Recipe: run and build
---------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- build examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- run-assembly examples/hello.dll

Recipe: inspect generated C#
---------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- emit-csharp examples/hello.mrsh

Recipe: CLR interop
-------------------

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder []}
    {sb.Append "Makrell#"}
    {sb.ToString}

Recipe: Makrell-shaped generics
-------------------------------

.. code-block:: makrell

    names = {new (list string) ["Makrell" "Sharp"]}
    counts = {new (dict string int) [["macros" 1] ["interop" 1]]}
    parts = {new (array string) ["Mak" "rell#"]}

Recipe: parse MRON and MRML
---------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- parse-mron examples/sample.mron
    dotnet run --project src/MakrellSharp.Cli -- parse-mrml examples/sample.mrml

Recipe: meta and macros
-----------------------

.. code-block:: makrell

    {meta
        greeting = {quote "Hello"}}

    {def macro hello [ns]
        {quote {String.Join " " [{unquote greeting} "from Makrell#"]}}}
