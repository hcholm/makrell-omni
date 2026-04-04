Installation
============

Makrell# is documented here as a published `.NET` tool first.
The source-tree workflow still exists for contributors, but it should not be
the main user path.

Prerequisites
-------------

Before working with Makrell#, make sure you have:

* a recent `.NET` SDK installed
* a shell where ``dotnet`` is available on ``PATH``

Install the tool
----------------

.. code-block:: bash

    dotnet tool install --global MakrellSharp.Cli

This gives you the ``makrellsharp`` command.

Run a first source file
-----------------------

Save a file as ``hello.mrsh``:

.. code-block:: makrell

    {import System}
    {Console.WriteLine "Hello from Makrell#"}

Then run it:

.. code-block:: bash

    makrellsharp hello.mrsh

Check a file and emit diagnostics:

.. code-block:: bash

    makrellsharp check hello.mrsh --json

Build and inspect:

.. code-block:: bash

    makrellsharp build hello.mrsh
    makrellsharp emit-csharp hello.mrsh

Use the source checkout for development
---------------------------------------

If you are working on Makrell# itself, use the source-tree workflow from
``impl/dotnet/``.

From ``impl/dotnet/``:

.. code-block:: bash

    dotnet build MakrellSharp.sln
    dotnet test MakrellSharp.sln

This gives you:

* the parser and compiler libraries
* the CLI entry point
* the current test suite for the `.NET` implementation

Representative commands
-----------------------

.. code-block:: bash

    makrellsharp hello.mrsh
    makrellsharp check hello.mrsh --json
    makrellsharp build hello.mrsh
    makrellsharp emit-csharp hello.mrsh
    makrellsharp parse-mron sample.mron
    makrellsharp parse-mrml sample.mrml

Common workflow
---------------

A typical user workflow looks like this:

#. install ``MakrellSharp.Cli``
#. run a small ``.mrsh`` file
#. use ``check`` and ``emit-csharp`` as needed

A typical contributor workflow looks like this:

#. build and test the solution
#. run the CLI from the source tree
#. inspect emitted C# when you want to understand how a Makrell# form lowers
#. build a ``.dll`` when you want to try the compile-and-load path
#. optionally switch to the packaged ``makrellsharp`` tool flow once you want a
   cleaner command-line experience

For example:

.. code-block:: bash

    makrellsharp hello.mrsh
    makrellsharp emit-csharp hello.mrsh

What is included today
----------------------

The current `.NET` implementation includes:

* MBF parsing
* MRON and MRML parsers
* a Makrell# compiler that emits and loads `.NET` assemblies
* macro and meta support for the current implemented subset
* a CLI/tool workflow for running source files, checking diagnostics, building
  assemblies, and inspecting embedded compile-time metadata

For the current feature slice and examples, continue with :doc:`quick-start`,
:doc:`guide`, :doc:`tooling`, and :doc:`cookbook`.
