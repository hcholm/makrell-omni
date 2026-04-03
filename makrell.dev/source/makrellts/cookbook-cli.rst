CLI Recipes
===========

This page collects a few common command-line tasks for MakrellTS. The examples
assume you are working from ``impl/ts`` in the repository.

Recipe: run a source file
-------------------------

From ``impl/ts``:

.. code-block:: bash

    bun run src/cli.ts examples/hello.mrts

This is the simplest way to confirm that the TypeScript implementation is wired
up and able to parse and run a small source file.

Recipe: emit generated JavaScript
---------------------------------

.. code-block:: bash

    bun run src/cli.ts examples/hello.mrts --emit-js

Use this when you want to inspect the current output shape or understand how a
MakrellTS form maps onto generated JavaScript.

Recipe: run common project commands
-----------------------------------

.. code-block:: bash

    bun run build
    bun run test
    bun run typecheck
    bun run lint

These commands cover the main local development loop for the TypeScript track.

Recipe: include browser-oriented build work
-------------------------------------------

.. code-block:: bash

    bun run build:browser
    bun run test:browser

Use these when you are working with the browser-facing side of MakrellTS rather
than only the Node.js path.

Why this helps
--------------

These commands make it easier to treat MakrellTS as part of an ordinary JS/TS
development workflow instead of a separate experimental step.

Suggested workflow
------------------

A practical CLI-oriented loop is:

#. run a small source file
#. inspect emitted JavaScript if behaviour is unclear
#. run the build, test, and typecheck commands
#. add the browser build steps if your work depends on browser integration

Related pages
-------------

For more context, continue with:

* :doc:`install`
* :doc:`tooling`
* :doc:`interop`
* :doc:`cookbook-browser`
