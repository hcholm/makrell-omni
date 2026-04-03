Views
=====

.. container:: playground-shell playground-shell--inner

    .. container:: playground-topbar

        .. container:: playground-backlinks

            :doc:`Back to Makrell </index>`
            |
            :doc:`Open docs </getting-started>`

        .. container:: playground-badge

            Makrell playground

    .. include:: _section_nav.rst

The playground should make it easy to move between source, results, generated
code, and short explanations without losing the sense of one coherent working
surface.

Core views
----------

The first browser version should support a small stable set of views:

* source
* output
* generated JS
* docs
* examples

That set is enough to teach the browser workflow clearly without turning the
first release into a crowded multi-tool interface.

Static views sketch
-------------------

.. container:: playground-state-sketch-grid

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            source

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line playground-state-line--strong

                hello.mrts

            .. container:: playground-state-line

                active editor tab

            .. container:: playground-state-line

                editable code surface

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            output

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line playground-state-line--strong

                run result

            .. container:: playground-state-line

                printed output

            .. container:: playground-state-line

                visible errors when present

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            generated JS

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line playground-state-line--strong

                compiled view

            .. container:: playground-state-line

                compare structure

            .. container:: playground-state-line

                bridge to browser runtime

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            docs

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line playground-state-line--strong

                what this shows

            .. container:: playground-state-line

                try-this-next prompts

            .. container:: playground-state-line

                links back to fuller docs

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            examples

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line playground-state-line--strong

                curated library

            .. container:: playground-state-line

                grouped by role

            .. container:: playground-state-line

                one-click load actions

How these views should feel
---------------------------

The views should feel related rather than separated into distant modes.

Good behaviour for ``v0.10.0``:

* the current example stays obvious when switching views
* output and error views stay tied to the same source file
* generated JS is readable, but clearly secondary to the source
* docs and examples remain lightweight enough to support editing rather than replacing it

Likely later additions
----------------------

Useful later views, if the first release goes well:

* AST or parse tree
* macro expansion
* shared URL / share details
* local state history

These should wait until the core source/output/docs loop already feels solid.

Why this matters
----------------

The browser playground will feel much better if users understand that the
different views are all part of one learning loop:

* edit source
* run
* inspect output
* compare generated JS
* read one short explanation
* try another example

That loop is more important than any single advanced panel.

