First Program in Makrell#
=========================

This short tutorial shows a minimal Makrell# workflow: run a small source file
through the CLI, then try a very small `.NET` interop example.

Run a source file
-----------------

.. code-block:: bash

    dotnet tool install --global MakrellSharp.Cli
    makrellsharp hello.mrsh

That gives you a direct end-to-end check of the current installed `.NET` parser,
compiler, and runtime path.

Try a small source file
-----------------------

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

This introduces the same kind of compact functional flow that appears
elsewhere in the Makrell family.

Then try a small CLR interop example
------------------------------------

.. code-block:: makrell

    {import System.Text}
    sb = {new StringBuilder []}
    {sb.Append "Makrell#"}
    {sb.ToString}

This shows the corresponding host-specific layer: Makrell forms around ordinary
CLR objects and methods.

What this shows
---------------

This small session shows:

* familiar Makrell function and pipe style
* Makrell-shaped CLR access
* the bridge between family syntax and `.NET` workflows

Next steps
----------

Continue with:

* :doc:`../makrellsharp/quick-start`
* :doc:`../makrellsharp/interop`
* :doc:`../makrellsharp/cookbook`
* :doc:`../makrellsharp/macros-and-meta`
