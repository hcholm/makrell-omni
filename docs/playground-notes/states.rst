States
======

.. container:: playground-shell playground-shell--inner

    .. container:: playground-topbar

        .. container:: playground-backlinks

            :doc:`Back to Makrell </index>`
            |
            :doc:`Open docs </getting-started>`

        .. container:: playground-badge

            Makrell playground

    .. include:: _section_nav.rst

The playground should not be designed only around the ideal loaded-example
state. A few UI states matter disproportionately because they shape whether the
browser experience feels polished or frustrating.

Important states
----------------

.. container:: playground-state-grid

    .. container:: playground-state-card

        **Default loaded state**

        One example already loaded, run action visible, and the output or docs
        panel showing something useful immediately.

        This should be the normal first impression.

    .. container:: playground-state-card

        **Loading / compiling**

        If compilation or execution takes noticeable time, the UI should still
        feel active:

        * current panel stays visible
        * progress is obvious
        * controls do not jump around

    .. container:: playground-state-card

        **Error state**

        Errors should be tied to the source and still feel teachable.

        Good error presentation is one of the main things that separates a real
        playground from a superficial demo.

    .. container:: playground-state-card

        **Empty or reset state**

        If the editor is reset, the page should not feel blank or abandoned.

        It should offer:

        * a starter example
        * a short prompt
        * a route back to curated examples

    .. container:: playground-state-card

        **Docs-focused state**

        Sometimes the user is reading more than editing. The layout should let
        the docs/context area breathe without losing the sense of active code.

    .. container:: playground-state-card

        **Example-switching state**

        Moving between examples should feel fast and legible. The user should
        always know:

        * what example is currently loaded
        * what changed
        * how to get back

State sketches
--------------

.. container:: playground-state-sketch-grid

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            Loaded example

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line

                ``hello.mrts`` loaded

            .. container:: playground-state-line playground-state-line--strong

                Run ready

            .. container:: playground-state-line

                Output visible

            .. container:: playground-state-line

                Docs panel linked to example

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            Compile / error

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line

                ``macro-showcase.mrts``

            .. container:: playground-state-line playground-state-line--error

                Error at line 8

            .. container:: playground-state-line

                Source stays visible

            .. container:: playground-state-line

                Generated output hidden or stale-marked

    .. container:: playground-state-sketch

        .. container:: playground-state-sketch-header

            Docs-focused reading

        .. container:: playground-state-sketch-body

            .. container:: playground-state-line

                Example still loaded

            .. container:: playground-state-line

                Context help expanded

            .. container:: playground-state-line

                One suggested edit visible

            .. container:: playground-state-line

                Link to MakrellTS docs nearby

Static design takeaway
----------------------

Even in the current documentation prototype, it helps to think in terms of
states rather than only pages. The final browser app will be judged heavily on:

* how reassuring the first loaded state feels
* how understandable errors are
* how quickly users can move between examples
* whether empty/reset states still feel purposeful

That is why these states should be treated as product-design inputs, not just
implementation details.

