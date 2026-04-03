Tooling
=======

The Makrell# tooling story is developing quickly.

Current direction includes:

* CLI commands to run, build, emit C#, and inspect metadata
* MRON and MRML parsing from the CLI
* compile/load workflows for `.NET` assemblies

This page should eventually consolidate everyday developer workflows.

Current CLI shape
-----------------

* ``makrellsharp run <file.mrsh>``
* ``makrellsharp build <file.mrsh>``
* ``makrellsharp emit-csharp <file.mrsh>``
* ``makrellsharp run-assembly <file.dll>``
* ``makrellsharp meta-sources <file.dll>``
* ``makrellsharp parse-mron <file.mron>``
* ``makrellsharp parse-mrml <file.mrml>``
