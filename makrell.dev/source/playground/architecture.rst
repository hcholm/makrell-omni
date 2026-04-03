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
        :doc:`Features <features>`
        :doc:`Workspace <workspace>`
        :doc:`Docs panel <docs-panel>`
        :doc:`Onboarding <onboarding>`
        :doc:`Views <views>`
        :doc:`Sharing <sharing>`
        :doc:`Responsive <responsive>`
        :doc:`Status <status>`
        :doc:`States <states>`
        :doc:`Flows <flows>`
        :doc:`Experience <experience>`
        :doc:`Examples <examples>`
        :doc:`Architecture <architecture>`
        :doc:`Implementation <implementation>`
        :doc:`Launch checklist <launch-checklist>`
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

Current sources to reuse
------------------------

There is already useful material in the shared editor-asset base and in
``vscode-makrell`` that should inform the playground rather than being copied
by hand:

* ``shared/makrell-editor-assets/``
* the TextMate grammar
* the snippet definitions
* the language configuration
* family file-extension and language metadata

The VS Code extension now syncs its packaged copies from that shared asset
base, which is the right direction for the browser playground too.

There is also useful material in the MakrellTS track itself:

* browser entrypoints
* existing browser examples
* the actual compile and runtime path

The right long-term shape is probably:

* shared TS-side language assets
* a VS Code integration layer
* a browser playground integration layer

This is more important than exact folder naming. The important thing is to
avoid duplicate language/editor definitions.

Execution model
---------------

The playground should treat MakrellTS as the actual engine:

* parse in the browser with the real parser
* compile with the real compiler
* run with the real browser-appropriate runtime path
* keep any browser-specific glue outside the language implementation itself

Static hosting shape
--------------------

The playground should remain compatible with static-site hosting on
``makrell.dev``:

* the docs and the playground should be able to live on the same site
* browser execution should not require a custom backend to be useful
* the first version should prefer browser-local evaluation, examples, and docs
  integration over server-dependent features

Why this matters
----------------

If the playground diverges from MakrellTS proper, it becomes a demo that
teaches the wrong thing. If it shares the actual language/tooling path, it
becomes a trustworthy way to learn and test the real system.
