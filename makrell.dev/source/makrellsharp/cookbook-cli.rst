CLI Recipes
===========

This page collects common Makrell# CLI tasks. The commands below assume you are
using the installed ``makrellsharp`` command.

Recipe: run a source file
-------------------------

.. code-block:: bash

    makrellsharp hello.mrsh

Use this when you want the simplest end-to-end check that the parser, compiler,
and runtime path are working together.

Recipe: build an assembly
-------------------------

.. code-block:: bash

    makrellsharp build hello.mrsh

This writes a compiled ``.dll`` next to the source file unless you pass an
explicit output path.

Recipe: run a built assembly
----------------------------

.. code-block:: bash

    makrellsharp run-assembly hello.dll

Use this when you want to separate the compile step from the run step, or when
you are checking the dynamic assembly-load path.

Recipe: inspect generated C#
----------------------------

.. code-block:: bash

    makrellsharp emit-csharp hello.mrsh

This is useful when you want to understand how a Makrell# form lowers into the
current generated C# module.

Recipe: inspect embedded meta sources
-------------------------------------

.. code-block:: bash

    makrellsharp meta-sources macros.dll

This prints the replayable compile-time sources embedded in a built assembly.
It is mainly useful when working with ``meta``, ``def macro``, or ``importm``.

Suggested workflow
------------------

A practical CLI-oriented development loop is:

#. run a small ``.mrsh`` file directly
#. inspect the emitted C# if behaviour is unclear
#. build a ``.dll`` once the source behaves as expected
#. inspect embedded meta sources if compile-time definitions are involved

Related pages
-------------

For more on the surrounding `.NET` workflow, continue with:

* :doc:`install`
* :doc:`tooling`
* :doc:`interop`
* :doc:`macros-and-meta`
