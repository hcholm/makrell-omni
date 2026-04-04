First Program in MakrellTS
==========================

This short tutorial shows a minimal MakrellTS workflow: install the CLI, run a
small source file, and see how familiar Makrell forms carry into the
TypeScript-hosted track.

Install the CLI
---------------

.. code-block:: bash

    bun add -g makrellts
    makrellts hello.mrts

That gives you a quick end-to-end check that the installed CLI path is working.

Try a small source file
-----------------------

.. code-block:: makrell

    {fun add [x y]
      x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

This example should already look familiar if you have seen MakrellPy or the
shared family examples.

Then try a tiny macro
---------------------

.. code-block:: makrell

    {def macro twice [x]
      [{quote $x} {quote $x}]}

This does not attempt to be a full macro tutorial. The point is to show that
the TypeScript track also participates in the family macro model rather than
only mirroring runtime syntax.

What this shows
---------------

This small session shows:

* familiar Makrell syntax in a JS/TS-oriented host
* CLI-based execution
* the same family concepts carrying into the TypeScript track
* a first hint of how compile-time forms fit into the implementation

Next steps
----------

Continue with:

* :doc:`../makrellts/quick-start`
* :doc:`../makrellts/guide`
* :doc:`../makrellts/cookbook`
* :doc:`../makrellts/metaprogramming`
