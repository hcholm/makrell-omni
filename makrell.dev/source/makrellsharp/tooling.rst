Tooling
=======

The Makrell# tooling story is developing quickly. The current tooling already
covers the most important `.NET`-side workflow: run source, inspect output,
build assemblies, load assemblies, and inspect compile-time metadata.

Current direction includes:

* CLI commands to run, build, emit C#, and inspect metadata
* MRON and MRML parsing from the CLI
* compile/load workflows for `.NET` assemblies
* a testable source-oriented development loop inside ``impl/dotnet``
* source execution that now handles baseline async Makrell# programs as well as sync ones

Current CLI shape
-----------------

The current CLI supports commands such as:

* ``makrellsharp run <file.mrsh>``
* ``makrellsharp check <file.mrsh>``
* ``makrellsharp build <file.mrsh>``
* ``makrellsharp emit-csharp <file.mrsh>``
* ``makrellsharp run-assembly <file.dll>``
* ``makrellsharp meta-sources <file.dll>``
* ``makrellsharp check-mron <file.mron>``
* ``makrellsharp check-mrml <file.mrml>``
* ``makrellsharp check-mrtd <file.mrtd>``
* ``makrellsharp parse-mron <file.mron>``
* ``makrellsharp parse-mrml <file.mrml>``
* ``makrellsharp parse-mrtd <file.mrtd>``

These are useful because they map directly onto the major moving parts of the
implementation rather than hiding everything behind one generic command.

Basic workflow
--------------

Install the packaged tool:

.. code-block:: bash

    dotnet tool install --global MakrellSharp.Cli

Run a source file:

.. code-block:: bash

    makrellsharp hello.mrsh

Check a source file for editor-friendly diagnostics:

.. code-block:: bash

    makrellsharp check hello.mrsh --json

Run the checked-in async example:

.. code-block:: bash

    makrellsharp async.mrsh

Build and inspect:

.. code-block:: bash

    makrellsharp build hello.mrsh
    makrellsharp emit-csharp hello.mrsh

Use MRON and MRML from the CLI:

.. code-block:: bash

    makrellsharp parse-mron sample.mron
    makrellsharp parse-mrml sample.mrml

Use MRTD and format checks from the CLI:

.. code-block:: bash

    makrellsharp parse-mrtd sample.mrtd
    makrellsharp check-mron sample.mron --json
    makrellsharp check-mrml sample.mrml --json
    makrellsharp check-mrtd sample.mrtd --json

Repository development workflow
-------------------------------

From ``impl/dotnet/``:

.. code-block:: bash

    dotnet build MakrellSharp.sln
    dotnet test MakrellSharp.sln
    dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh
    dotnet run --project src/MakrellSharp.Cli -- check examples/hello.mrsh --json

Inspect compile-time metadata:

.. code-block:: bash

    makrellsharp meta-sources macros.dll

Why this matters
----------------

The current tooling already ties together several important parts of the `.NET`
track:

* source execution
* assembly build/load
* generated-code inspection
* compile-time metadata inspection
* format parsing through the same implementation area

That means the tooling is not only a thin launcher. It is also a way of
understanding the implementation and checking how the compile-time and runtime
layers interact.

Suggested workflow
------------------

A practical local workflow is:

#. build and test the solution
#. run a small source file directly
#. inspect emitted C# when behaviour is unclear
#. build a ``.dll`` once the program shape is stable
#. inspect embedded compile-time metadata if macros or ``importm`` are involved

Where to continue
-----------------

* :doc:`install`
* :doc:`cookbook-cli`
* :doc:`cookbook-interop`
* :doc:`cookbook-macros`
* :doc:`interop`
