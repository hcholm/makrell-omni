Installation
============

MakrellTS is documented here as a published package with a normal installed CLI
workflow. The source-tree workflow still exists for contributors, but it should
not be the main user story.

Install the CLI
---------------

.. code-block:: bash

    bun add -g makrellts

This gives you the ``makrellts`` command.

Run a first source file
-----------------------

Save a file as ``hello.mrts``:

.. code-block:: makrell

    a = 2
    b = a + 3
    [a b 5] | sum

Then run it:

.. code-block:: bash

    makrellts hello.mrts

Emit generated JavaScript:

.. code-block:: bash

    makrellts hello.mrts --emit-js

Check a file and emit machine-readable diagnostics:

.. code-block:: bash

    makrellts check hello.mrts --json

Use source checkout for development
-----------------------------------

If you are working on MakrellTS itself, use the source-tree workflow from
``impl/ts/``:

.. code-block:: bash

    bun install

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

A common user workflow is:

#. install ``makrellts``
#. run a small ``.mrts`` file
#. use ``check`` and ``--emit-js`` as needed

A common contributor workflow is:

#. ``bun install``
#. run the build and test commands
#. use the examples and browser build from the source tree

What to read next
-----------------

After installation, continue with:

* :doc:`quick-start` for a first run-through
* :doc:`guide` for the general model of the TypeScript implementation
* :doc:`interop` for JavaScript and TypeScript integration
* :doc:`tooling` for build, test, and environment details
* :doc:`cookbook` for task-oriented examples
