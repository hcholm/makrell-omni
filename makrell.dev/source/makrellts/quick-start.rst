Quick Start
===========

This page gives a short first pass through MakrellTS. The aim is to show the
basic CLI workflow and a few familiar Makrell forms in the TypeScript-hosted
track.

Install the CLI
---------------

.. code-block:: bash

    bun add -g makrellts

Run a MakrellTS source file
---------------------------

.. code-block:: bash

    makrellts hello.mrts

Emit generated JavaScript
-------------------------

.. code-block:: bash

    makrellts hello.mrts --emit-js

This is useful when you want to see how a MakrellTS source file lowers into the
current JavaScript output.

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

This example shows a few shared family ideas in one place:

* ordinary expression flow
* function definition
* pipeline usage
* pattern matching

Async example
-------------

.. code-block:: makrell

    {async fun fetchValue [value]
      {await {Promise.resolve value}}}

    {async fun addLater [x y]
      left = {await {fetchValue x}}
      right = {await {fetchValue y}}
      left + right}

    {await {addLater 20 22}}

MakrellTS now supports the shared family async baseline as part of the
``v0.10.0`` consolidation work.

Diagnostics
-----------

.. code-block:: bash

    makrellts check hello.mrts --json

MRON example
------------

.. code-block:: makrell

    owner "Rena Holm"
    active true
    count 3

This reminds you that the TypeScript track still lives in the broader family
world of formats and structures.

MRML example
------------

.. code-block:: makrell

    {html
      {body
        {h1 MakrellTS}
        {p Generated from MBF-style syntax.}}}

Next steps
----------

After this page, a useful route is:

* :doc:`guide`
* :doc:`cookbook`
* :doc:`interop`
* :doc:`tooling`
