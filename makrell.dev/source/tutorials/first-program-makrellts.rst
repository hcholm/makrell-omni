First Program in MakrellTS
==========================

From ``impl/ts`` run:

.. code-block:: bash

    bun install
    bun run src/cli.ts examples/hello.mrjs

Try a small source file:

.. code-block:: makrell

    {fun add [x y]
      x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

Then try a tiny macro:

.. code-block:: makrell

    {def macro twice [x]
      [{quote $x} {quote $x}]}

What this shows:

* familiar Makrell syntax in a JS/TS-oriented host
* CLI-based execution
* the same family concepts carrying into the TypeScript track

Next steps:

* :doc:`../makrellts/quick-start`
* :doc:`../makrellts/guide`
* :doc:`../makrellts/cookbook`
