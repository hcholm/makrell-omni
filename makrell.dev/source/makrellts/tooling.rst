Tooling
=======

MakrellTS already has a meaningful tooling shape. The TypeScript track is not
only about language forms; it also lives inside the normal build, test, and
runtime expectations of JS and TS projects.

Current areas
-------------

The current tooling emphasis includes:

* CLI usage
* build workflow
* type-checking and linting
* browser and bundler integration
* implementation material for import and runtime behaviour

Relevant implementation material in the repo
--------------------------------------------

Some useful implementation-oriented files are:

* ``impl/ts/src/browser.ts``
* ``impl/ts/src/meta_worker.ts``
* ``impl/ts/COMPATIBILITY.md``
* ``impl/ts/IMPORT_MODEL.md``

Basic workflow
--------------

From ``impl/ts``:

.. code-block:: bash

    bun install
    bun run build
    bun run test
    bun run typecheck

Run a source file:

.. code-block:: bash

    bun run src/cli.ts examples/hello.mrts

Emit generated JavaScript:

.. code-block:: bash

    bun run src/cli.ts examples/hello.mrts --emit-js

Browser-related material
------------------------

MakrellTS also has a browser-oriented tooling direction. The current
implementation material includes browser entry points, browser examples, and an
import/runtime model intended to support JS/TS environments beyond only a
single CLI workflow.

Why this matters
----------------

The TypeScript track is often most useful when it fits ordinary JS/TS
development practice rather than forcing a separate mental model. Build,
typecheck, lint, and browser-related tooling are therefore part of the language
story, not just peripheral maintenance tasks.

Suggested workflow
------------------

A practical local workflow is:

#. install dependencies with ``bun install``
#. run build, test, and typecheck
#. run a small source file through the CLI
#. inspect emitted JavaScript when the lowered output matters
#. add browser build and browser test steps when your work depends on them

Where to continue
-----------------

* :doc:`install`
* :doc:`cookbook-cli`
* :doc:`cookbook-browser`
* :doc:`interop`
* :doc:`metaprogramming`
