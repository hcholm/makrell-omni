Onboarding
==========

.. container:: playground-shell playground-shell--inner

    .. container:: playground-topbar

        .. container:: playground-backlinks

            :doc:`Back to Makrell </index>`
            |
            :doc:`Open docs </getting-started>`

        .. container:: playground-badge

            Makrell playground

    .. include:: _section_nav.rst

The playground should have a clear first-run experience. A new user should be
able to open it, understand the current example, run it, and know what to do
next without guessing.

First-run shape
---------------

The best default landing state for ``v0.10.0`` is:

* one working example already loaded
* run/output visible without extra clicks
* one short explanation of what the example demonstrates
* one or two suggested edits
* an obvious route into more examples and fuller docs

That means the first-run experience should feel guided, but still lightweight.

Static first-run sketch
-----------------------

.. container:: playground-doc-stack

    .. container:: playground-doc-card

        **Loaded by default**

        ``hello.mrts``

        Small enough to understand quickly, but rich enough to show that
        MakrellTS already has macros, pattern matching, and visible output.

    .. container:: playground-doc-card

        **First prompt**

        "Run the example, then change one literal and run it again."

        The first action should be obvious and low-risk.

    .. container:: playground-doc-card

        **Second prompt**

        "Open the generated JS tab and compare the shape."

        This helps explain what the browser playground is really doing.

    .. container:: playground-doc-card

        **Next route**

        Move into one of:

        * macro showcase
        * browser example
        * family formats

What beginners need first
-------------------------

The onboarding surface should privilege a small number of stable cues:

* what is loaded now
* what it prints or produces
* one safe edit to try
* where to go after the first successful run

It should avoid starting with:

* too many files at once
* advanced compile-time explanations
* a blank editor
* a giant wall of documentation

Beginner and advanced split
---------------------------

The playground should acknowledge different skill levels without making the
entry screen complicated.

Good first split:

**Start here**
    ``hello.mrts``, one macro example, one format example.

**Explore more**
    browser compile, n-body browser, richer macro cases, and deeper docs links.

This keeps the first impression calm while still giving stronger users somewhere
to go quickly.

What this page is for
---------------------

This page exists to make the launch experience explicit. If the onboarding path
is clear here, it is much easier to make the real browser product feel coherent
later.

