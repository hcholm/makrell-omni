Makrell# CLI Workflow
=====================

The Makrell# CLI is the main practical entry point into the .NET implementation.

Step 1: run a source file
-------------------------

From ``impl/dotnet``:

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh

Step 2: build an assembly
-------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- build examples/hello.mrsh

Step 3: inspect generated C#
---------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- emit-csharp examples/hello.mrsh

Step 4: parse MRON or MRML
--------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- parse-mron examples/sample.mron
    dotnet run --project src/MakrellSharp.Cli -- parse-mrml examples/sample.mrml

Step 5: inspect replayable compile-time metadata
------------------------------------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- meta-sources examples/macros.dll

Why this matters
----------------

The CLI ties together the practical parts of the current Makrell# implementation:

* running source
* building assemblies
* inspecting generated output
* using MRON and MRML
* working with compile-time metadata

Next steps:

* :doc:`../makrellsharp/quick-start`
* :doc:`../makrellsharp/cookbook-cli`
* :doc:`../makrellsharp/interop`
