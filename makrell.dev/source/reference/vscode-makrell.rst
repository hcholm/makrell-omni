VS Code Extension
=================

``vscode-makrell-omni`` is the current editor-facing package for the Makrell family.
For ``v0.10.0`` it is meant to give a credible everyday experience across:

* MakrellPy
* MakrellTS
* Makrell#
* MRON
* MRML
* MRTD

Install it from the
`Visual Studio Marketplace <https://marketplace.visualstudio.com/items?itemName=hchrholm.vscode-makrell-omni>`_.

.. image:: /_static/ide.png
    :alt: vscode-makrell-omni showing Makrell diagnostics in VS Code
    :class: vscode-screenshot

For ``v0.10.0``, this should be treated as part of the main Makrell
experience, not as a side utility hidden after the language/runtime docs.

What it gives you now
---------------------

The extension currently provides:

* syntax highlighting
* snippets
* language configuration and bracket behaviour
* shared Makrell-family file associations
* ``Run Current File`` for:
  * ``.mrpy``
  * ``.mrts``
  * ``.mrsh``
* check/diagnostics commands for:
  * MakrellPy
  * MakrellTS
  * Makrell#
* editor-visible diagnostics/code markings for:
  * ``.mrpy``
  * ``.mrts``
  * ``.mrsh``
  * ``.mron``
  * ``.mrml``
  * ``.mrtd``

It also still supports an optional ``makrell-langserver`` bridge for richer
editor features such as hover, go-to, and completions while the broader
TypeScript-family language-server direction is being developed.

File types
----------

Current language/file coverage in the extension:

* ``.mr`` and ``.mrx``
  * general Makrell / MBF-style files
  * highlighted and snippet-aware
  * not treated as MakrellPy programs by default
* ``.mrpy``
  * MakrellPy program files
* ``.mrts``
  * MakrellTS program files
* ``.mrsh``
  * Makrell# program files
* ``.mron``
  * MRON
* ``.mrml``
  * MRML
* ``.mrtd``
  * MRTD

Command-line integration
------------------------

The current diagnostics story is CLI-backed. That keeps it useful in the short
term without requiring a full family language server first.

MakrellPy
^^^^^^^^^

.. code-block:: bash

    makrell check path/to/file.mrpy --json

MakrellTS
^^^^^^^^^

.. code-block:: bash

    makrellts check path/to/file.mrts --json

Makrell#
^^^^^^^^

.. code-block:: bash

    makrellsharp check path/to/file.mrsh --json

Family formats through Makrell#
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

    makrellsharp check-mron path/to/file.mron --json
    makrellsharp check-mrml path/to/file.mrml --json
    makrellsharp check-mrtd path/to/file.mrtd --json

Current workflow
----------------

The extension is currently strongest as a practical workflow surface rather than
as a full IDE engine.

That means the realistic ``v0.10.0`` story is:

* open Makrell-family files and get a reasonable editing experience
* run the three main language tracks from the editor
* get diagnostics/code markings from the shipped CLIs
* optionally use ``makrell-langserver`` for interim hover/go-to/completion work

It does **not** yet mean:

* one full cross-family language server
* strong rename/refactor support
* full semantic navigation across all tracks

Direction
---------

The long-term direction is one TypeScript-based family tooling/LSP path shared
across:

* Makrell
* MakrellPy
* MakrellTS
* Makrell#
* MRON
* MRML
* MRTD

That is also why shared editor assets now live outside the extension itself:
the editor grammar/snippets/language configuration are being treated as
family-wide tooling assets, not as VS Code-only data.

See also
--------

* :doc:`implementation-matrix`
* :doc:`/makrellts/index`
* :doc:`/makrellts/tooling`
