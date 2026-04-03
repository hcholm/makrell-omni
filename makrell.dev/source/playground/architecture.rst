Architecture
============

.. container:: playground-shell playground-shell--inner

    .. container:: playground-topbar

        .. container:: playground-backlinks

            :doc:`Back to Makrell </index>`
            |
            :doc:`Open docs </getting-started>`

        .. container:: playground-badge

            Makrell playground

    .. container:: playground-section-nav

        :doc:`Overview <index>`
        :doc:`Experience <experience>`
        :doc:`Examples <examples>`
        :doc:`Architecture <architecture>`
        :doc:`Roadmap <roadmap>`

The playground should use real implementation code rather than a separate demo
runtime.

Technical direction
-------------------

* use MakrellTS as the execution/compile track
* reuse the real parser/compiler/runtime path
* avoid duplicating language semantics in browser-only helper code
* share editor/language assets with ``vscode-makrell`` where practical

Shared tooling direction
------------------------

The extension and the playground should increasingly draw from the same TS-side
assets for:

* language metadata
* snippets data
* grammar assets where possible
* example manifests

That way, the browser playground and the editor are two surfaces over the same
language/tooling base rather than two parallel maintenance tracks.

Practical shared pieces
-----------------------

The obvious things to share early are:

* file and language metadata
* snippets and example manifests
* tokenisation or grammar assets where the editor component can reuse them
* small documentation payloads for example descriptions and help cards

The VS Code extension should become a thin integration layer over shared
language assets rather than the only place where those assets live.

Execution model
---------------

The playground should treat MakrellTS as the actual engine:

* parse in the browser with the real parser
* compile with the real compiler
* run with the real browser-appropriate runtime path
* keep any browser-specific glue outside the language implementation itself

Why this matters
----------------

If the playground diverges from MakrellTS proper, it becomes a demo that
teaches the wrong thing. If it shares the actual language/tooling path, it
becomes a trustworthy way to learn and test the real system.
