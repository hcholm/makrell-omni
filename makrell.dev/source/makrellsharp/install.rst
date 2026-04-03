Installation
============

Makrell# currently lives in the ``impl/dotnet`` area of the monorepo. The
current setup is source-oriented: you build and run the implementation from the
repository rather than installing a separate published package.

Prerequisites
-------------

Before working with Makrell#, make sure you have:

* a recent `.NET` SDK installed
* the Makrell repository checked out locally
* a shell where ``dotnet`` is available on ``PATH``

If you are only exploring the language, the quickest way to start is to build
the solution and run one of the example ``.mrsh`` files.

Build and test
--------------

From ``impl/dotnet/``:

.. code-block:: bash

    dotnet build MakrellSharp.sln
    dotnet test MakrellSharp.sln

This gives you:

* the parser and compiler libraries
* the CLI entry point
* the current test suite for the `.NET` implementation

Run the CLI
-----------

The most direct way to use Makrell# is through the CLI project:

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh

That command builds the CLI if needed and runs the example program.

Representative commands
-----------------------

.. code-block:: bash

    dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- build examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- emit-csharp examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- parse-mron examples/sample.mron
    dotnet run --project src/MakrellSharp.Cli -- parse-mrml examples/sample.mrml

These commands are useful during development because they exercise the same
implementation that the tests use.

Common workflow
---------------

A typical local workflow looks like this:

#. build and test the solution
#. run an example ``.mrsh`` file
#. inspect emitted C# when you want to understand how a Makrell# form lowers
#. build a ``.dll`` when you want to try the compile-and-load path

For example:

.. code-block:: bash

    dotnet test MakrellSharp.sln
    dotnet run --project src/MakrellSharp.Cli -- emit-csharp examples/interop.mrsh
    dotnet run --project src/MakrellSharp.Cli -- build examples/interop.mrsh

What is included today
----------------------

The current `.NET` implementation includes:

* MBF parsing
* MRON and MRML parsers
* a Makrell# compiler that emits and loads `.NET` assemblies
* macro and meta support for the current implemented subset
* a CLI for running source files, building assemblies, and inspecting embedded
  compile-time metadata

For the current feature slice and examples, continue with :doc:`quick-start`,
:doc:`guide`, :doc:`tooling`, and :doc:`cookbook`.
