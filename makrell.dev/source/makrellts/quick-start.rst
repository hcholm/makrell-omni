Quick Start
===========

Run a MakrellTS source file from ``impl/ts``:

.. code-block:: bash

    bun run src/cli.ts examples/hello.mrjs

Emit generated JavaScript:

.. code-block:: bash

    bun run src/cli.ts examples/hello.mrjs --emit-js

Small example
-------------

.. code-block:: makrell

    a = 2
    b = a + 3
    [a b 5] | sum

    {fun add [x y]
      x + y}

    {match a
      2 "two"
      _ "other"}

MRON example
------------

.. code-block:: makrell

    owner "Rena Holm"
    active true
    count 3

MRML example
------------

.. code-block:: makrell

    {html
      {body
        {h1 MakrellTS}
        {p Generated from MBF-style syntax.}}}
