Responsive behaviour
====================

.. container:: playground-shell playground-shell--inner

    .. container:: playground-topbar

        .. container:: playground-backlinks

            :doc:`Back to Makrell </index>`
            |
            :doc:`Open docs </getting-started>`

        .. container:: playground-badge

            Makrell playground

    .. include:: _section_nav.rst

The playground should be designed for desktop first, but it should still work
cleanly on smaller screens. It should not collapse into a broken miniature IDE.

Core rule
---------

On smaller screens, the playground should stop trying to show everything at
once. It should preserve the same learning loop with a simpler layout rhythm:

* one main surface at a time
* example selection still easy to reach
* output and docs still nearby
* source view still clearly primary

What should change on smaller screens
-------------------------------------

Good responsive changes for ``v0.10.0``:

* the left example rail can collapse into a drawer or section switcher
* the source/editor should remain the default visible panel
* output, docs, and examples can become stacked views or tabs
* the chrome should stay light and uncluttered

What should stay stable:

* the current example name
* run / compile access
* the route back to the main docs/site
* the theme switch

Static compact sketch
---------------------

.. container:: playground-state-sketch-grid

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            compact top bar

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line playground-state-line--strong

                hello.mrts

            .. container:: playground-state-line

                run   docs   examples

            .. container:: playground-state-line

                theme   back

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            source-first

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line playground-state-line--strong

                editor remains primary

            .. container:: playground-state-line

                output after run

            .. container:: playground-state-line

                docs as secondary view

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            stacked learning loop

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line

                choose example

            .. container:: playground-state-line

                edit + run

            .. container:: playground-state-line playground-state-line--strong

                inspect result

Why this matters
----------------

The playground does not need to be a phone-first coding environment, but it
does need to avoid creating a frustrating dead-end on narrower screens.

If the smaller layout still supports:

* loading one example
* running it
* reading a short explanation
* getting back to the docs

then it is already doing its job.

