Installation
============

MakrellTS currently lives under ``impl/ts`` in the monorepo. Like the other
implementations in this repository, it is currently used directly from source.

Prerequisites
-------------

Before working with MakrellTS, make sure you have:

* the Makrell repository checked out locally
* Bun installed
* a recent Node.js environment if you also want to test Node-oriented usage

Install dependencies
--------------------

From ``impl/ts/``:

.. code-block:: bash

    bun install

This installs the dependencies used for the library, browser build, tests, and
tooling around the TypeScript implementation.

Common commands
---------------

.. code-block:: bash

    bun run build
    bun run build:browser
    bun run test
    bun run typecheck
    bun run lint
    bun run test:browser

These cover the main development loop for MakrellTS:

* ``build`` for the library output
* ``build:browser`` for browser-facing bundles
* ``test`` and ``test:browser`` for runtime coverage in different environments
* ``typecheck`` and ``lint`` for TypeScript code quality

Environment focus
-----------------

MakrellTS is aimed at:

* Node.js
* Bun
* browser-oriented workflows
* JavaScript and TypeScript interop

Typical workflow
----------------

A common local workflow is:

#. install dependencies with ``bun install``
#. run the build and test commands
#. use the examples and docs pages to try MakrellTS in either Node.js or the
   browser-oriented build

For example:

.. code-block:: bash

    bun install
    bun run build
    bun run test
    bun run build:browser

What to read next
-----------------

After installation, continue with:

* :doc:`quick-start` for a first run-through
* :doc:`guide` for the general model of the TypeScript implementation
* :doc:`interop` for JavaScript and TypeScript integration
* :doc:`tooling` for build, test, and environment details
* :doc:`cookbook` for task-oriented examples
