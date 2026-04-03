Sharing
=======

.. container:: playground-shell playground-shell--inner

    .. container:: playground-topbar

        .. container:: playground-backlinks

            :doc:`Back to Makrell </index>`
            |
            :doc:`Open docs </getting-started>`

        .. container:: playground-badge

            Makrell playground

    .. include:: _section_nav.rst

The playground should feel easy to return to and easy to point other people
at. Even a simple first release benefits a lot from a small amount of sharing
and continuity.

What the first version should support
-------------------------------------

The first useful browser release does not need a full cloud account system. It
just needs a few practical ways to preserve and point to work:

* copy link to the current example
* keep a stable URL for each curated launch example
* remember a little local browser state
* make it easy to get back to the default loaded example

Static sketch
-------------

.. container:: playground-doc-stack

    .. container:: playground-doc-card

        **Copy example link**

        A small action in the playground chrome that copies a stable URL to the
        current curated example.

    .. container:: playground-doc-card

        **Return to last state**

        The browser can remember a few low-risk things locally:

        * last opened example
        * selected theme
        * last active view

    .. container:: playground-doc-card

        **Reset path**

        A clear way back to the launch example matters just as much as saving
        state. The playground should be easy to recover, not only easy to
        personalise.

    .. container:: playground-doc-card

        **Docs-compatible links**

        Shared links should work nicely from the docs site and from external
        places like GitHub, release notes, and social posts.

Good baseline for `v0.10.0`
---------------------------

The first release is already doing well if it has:

* one share action for curated examples
* stable URLs for the launch set
* browser-local memory for theme and last opened example
* a clear reset or "start over" path

Good later additions:

* encoded URLs for light edits
* share links for custom edited state
* saved local history
* richer import/export of playground state

Why this matters
----------------

Sharing and continuity are not only convenience features. They affect the
teaching loop:

* a doc page can link directly into a live example
* a user can come back without losing the thread
* a release note can point to one exact browser experience
* a person can send another person the same starting point

That is a strong fit for the browser-first MakrellTS story.

