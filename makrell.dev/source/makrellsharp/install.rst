Installation
============

Makrell# currently lives in the `.NET` implementation area of the monorepo.

From ``impl/dotnet/``:

.. code-block:: bash

    dotnet build MakrellSharp.sln
    dotnet test MakrellSharp.sln

Typical setup revolves around:

* the `.NET` SDK
* building the Makrell# solution
* running the CLI

Representative CLI commands
---------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- build examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- emit-csharp examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- parse-mron examples/sample.mron
    dotnet run --project src/MakrellSharp.Cli -- parse-mrml examples/sample.mrml
