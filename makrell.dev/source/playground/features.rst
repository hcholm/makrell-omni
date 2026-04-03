Features
========

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

The playground should be useful because it brings a few things together in one
place, not because it tries to become a giant browser IDE.

Core feature groups
-------------------

.. container:: playground-feature-grid

    .. container:: playground-feature-card

        **Editor**

        * MakrellTS-aware syntax highlighting
        * shared snippets and language metadata where possible
        * solid bracket and indentation behaviour

    .. container:: playground-feature-card

        **Run / Compile**

        * browser-side execution
        * generated JS view
        * clear error reporting tied to source

    .. container:: playground-feature-card

        **Examples**

        * curated starter examples
        * one-click loading
        * short explanation of what each example shows

    .. container:: playground-feature-card

        **Docs in context**

        * focused notes next to the active example
        * links into MakrellTS docs and shared concepts
        * "try this next" guidance

    .. container:: playground-feature-card

        **Family awareness**

        * MakrellTS-first execution
        * visible links to MRON, MRML, MRTD, MakrellPy, and Makrell#
        * enough family context without turning the playground into a portal maze

    .. container:: playground-feature-card

        **Sharing and continuity**

        * stable example URLs later on
        * local state or session persistence later on
        * a smooth path from browser experiment to local tooling

What should feel strong in v0.10.0
----------------------------------

For the first release, these matter most:

* the editor should feel credible
* examples should be easy to browse and load
* output and generated JS should be easy to inspect
* the surrounding docs should make the playground easier to learn from
* the section should feel like a real Makrell surface, not a generic sandbox

What should stay intentionally small
------------------------------------

The first version does not need:

* full project management
* collaborative editing
* user accounts
* multi-file application complexity everywhere
* every advanced compiler inspection tool at once

It is better for ``v0.10.0`` to have a smaller, reliable browser workflow than
an oversized surface full of half-finished ideas.
