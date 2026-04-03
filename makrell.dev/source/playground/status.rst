Status
======

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

This page keeps the playground section honest. Some parts already exist in the
repo today, while other parts are still planned for ``v0.10.0``.

What exists now
---------------

.. container:: playground-feature-grid

    .. container:: playground-feature-card

        **MakrellTS browser path**

        The repo already contains browser-facing MakrellTS material, including
        browser compile examples and richer browser examples.

        Current anchors:

        * ``impl/ts/examples/browser-compile/``
        * ``impl/ts/examples/nbody-browser/``
        * ``impl/ts/src/browser.ts``

    .. container:: playground-feature-card

        **Launch examples**

        The likely launch examples already exist as real source files.

        Current anchors:

        * ``impl/ts/examples/hello.mrts``
        * ``impl/ts/examples/macros/showcase.mrts``
        * browser compile example
        * n-body browser example

    .. container:: playground-feature-card

        **Editor assets**

        The repo already has useful language assets through ``vscode-makrell``.

        Current anchors:

        * grammar
        * snippets
        * language configuration

    .. container:: playground-feature-card

        **Playground section on ``makrell.dev``**

        This docs/product-planning surface now exists and is already linked
        from the site and MakrellTS pages.

What is still planned
---------------------

The browser product itself is still ahead of the current implementation state.

Key planned pieces:

* real in-page editor component
* actual run/compile surface inside ``makrell.dev/playground/``
* generated-JS panel in the browser shell
* docs-panel behaviour tied to the active example
* lightweight continuity and share actions

What this section is doing now
------------------------------

Until the real browser product exists, this section is carrying three jobs:

* define the intended product surface
* keep the implementation grounded in the current repo
* turn ``v0.10.0`` into a concrete, testable target instead of a vague idea

Good current reading
--------------------

If you want the current truthful picture, these pages are the most useful:

* :doc:`Examples <examples>` for the real launch set
* :doc:`Implementation <implementation>` for current repo anchors
* :doc:`Launch checklist <launch-checklist>` for what still has to ship
* :doc:`Roadmap <roadmap>` for the likely order of work

Why this matters
----------------

The playground should eventually feel like a real browser product, not only a
well-documented intention. A status page makes that distinction visible and
helps keep the section from overpromising.
