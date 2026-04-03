Launch Checklist
================

.. container:: playground-shell playground-shell--inner

    .. container:: playground-topbar

        .. container:: playground-backlinks

            :doc:`Back to Makrell </index>`
            |
            :doc:`Open docs </getting-started>`

        .. container:: playground-badge

            Makrell playground

    .. include:: _section_nav.rst

This page turns the playground work into a more concrete `v0.10.0` delivery
checklist. It is intentionally practical rather than aspirational.

Minimum browser product
-----------------------

.. container:: playground-feature-grid

    .. container:: playground-feature-card

        **Section and identity**

        * dedicated ``/playground/`` section on ``makrell.dev``
        * stronger product-surface styling than the docs area
        * clear route back to the main site and MakrellTS docs

    .. container:: playground-feature-card

        **Editor shell**

        * browser editor component in place
        * Makrell-aware highlighting/snippets at a useful baseline
        * light/dark mode behaving well

    .. container:: playground-feature-card

        **Run / compile loop**

        * one loaded example by default
        * run action
        * generated JS view
        * visible output and visible error handling

    .. container:: playground-feature-card

        **Launch examples**

        * ``hello.mrts``
        * macro showcase
        * one browser-oriented example
        * one family-format example

Shared tooling baseline
-----------------------

These are the important "do not fake this" items:

* use the real MakrellTS parser/compiler/runtime path
* do not duplicate language semantics in browser-only code
* start extracting shared editor/language assets from ``vscode-makrell``
* keep examples tied to real repo examples wherever possible

Content baseline
----------------

The first release should also ship with enough guidance to feel teachable:

* concise example descriptions
* one or two suggested edits per example
* links from examples back to the MakrellTS docs
* a clear explanation of what the playground is and is not

Release blockers
----------------

If these are missing, the playground will still feel more like a concept sketch
than a first product release.

* one default example that really runs
* one richer example beyond the trivial case
* visible source, output, and generated-JS surfaces
* obvious light/dark mode handling
* a clear route back to the main site and docs
* no duplicated fake browser-only language semantics

Practical smoke checks
----------------------

Before calling the playground ready for ``v0.10.0``, a few simple checks should
pass:

* load the default example and run it successfully
* switch to another curated example without losing the shell state
* view generated JS for the current example
* follow a docs link from the playground into the surrounding site
* return from the docs to the playground without feeling lost
* refresh the page and keep at least the current example or theme

Good first acceptance question
------------------------------

Another useful release question is:

"Does this feel like a real Makrell surface, or does it still feel like a demo
page attached to the docs?"

That is worth asking because the product-surface requirement is one of the main
reasons the playground exists as its own section.

Can wait until later
--------------------

These are useful, but should not block the first useful version:

* AST inspectors
* macro-expansion viewers
* advanced persistence and sharing
* multi-file project support everywhere
* broader multi-implementation execution

Practical release question
--------------------------

A good final check for ``v0.10.0`` is:

"Can a new user open the playground, run a real MakrellTS example, learn
something from it, and know where to go next without leaving confused?"

If the answer is yes, the first version is doing its job.

