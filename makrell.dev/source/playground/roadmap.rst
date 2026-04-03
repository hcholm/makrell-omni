Roadmap
=======

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

For ``v0.10.0``, the playground does not need every idea at once. It needs a
credible first browser-facing product shape.

Phase 1: visible product surface
--------------------------------

* a dedicated ``/playground/`` section on ``makrell.dev``
* distinct navigation and visual identity
* clear links from the home page and MakrellTS pages
* light and dark mode support
* a clear explanation of what the playground is for

Phase 2: core browser workflow
------------------------------

* browser editor with Makrell-aware syntax support
* example loading
* run / compile actions
* output panel
* generated JS view

Phase 3: guided learning loop
-----------------------------

* embedded docs tied to examples
* "try this next" prompts
* a better first-run example
* stronger links between examples and the MakrellTS documentation

Phase 4: shared tooling base
----------------------------

* extract reusable editor/language assets from the VS Code extension
* share snippets, metadata, and example manifests
* avoid duplicating syntax/tooling definitions between browser and editor

Near-term order of work
-----------------------

For the actual build-out, a useful order is:

**1. Shared language assets**
    Make the editor-facing grammar, snippets, and language configuration easier
    to consume from both the browser playground and ``vscode-makrell``.

**2. Minimal browser shell**
    Load one example, show source, run it, and display output plus generated
    JS.

**3. Launch example set**
    Turn ``hello.mrts``, the macro showcase, browser compile, and one richer
    browser example into a small coherent catalogue.

**4. Docs bridge**
    Attach summaries, "try this next" prompts, and links back to MakrellTS
    docs.

**5. Continuity**
    Add light persistence for theme and current example, plus stable example
    links.

This order matters because it proves the browser product on real implementation
code before spending time on more decorative or speculative features.

What can wait until later
-------------------------

These are good directions, but they should not block the first useful version:

* AST inspectors
* macro-expansion inspectors
* advanced share links and persistence
* multi-implementation execution
* heavy account or project-management features

The important thing for the first release is that the playground feels real,
uses the real MakrellTS path, and teaches the actual system rather than a demo
facsimile.
