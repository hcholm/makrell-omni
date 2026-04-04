Makrell# CLI Workflow
=====================

The Makrell# CLI is the main practical entry point into the .NET implementation.

Step 1: run a source file
-------------------------

.. code-block:: bash

    dotnet tool install --global MakrellSharp.Cli
    makrellsharp hello.mrsh

Step 2: build an assembly
-------------------------

.. code-block:: bash

    makrellsharp build hello.mrsh

Step 3: inspect generated C#
----------------------------

.. code-block:: bash

    makrellsharp emit-csharp hello.mrsh

Step 4: parse MRON or MRML
--------------------------

.. code-block:: bash

    makrellsharp parse-mron sample.mron
    makrellsharp parse-mrml sample.mrml

Step 5: inspect replayable compile-time metadata
------------------------------------------------

.. code-block:: bash

    makrellsharp meta-sources macros.dll

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
