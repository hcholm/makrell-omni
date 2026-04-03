Docs panel
==========

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

The playground should not force people to choose between reading and trying.
The docs panel is where short guidance, related links, and small prompts stay
close to the active example.

What the panel should answer
----------------------------

The first version should usually answer four questions:

* what is this example showing?
* what should I try changing next?
* where can I read the fuller explanation?
* how does this connect to the wider Makrell family?

Static sketch
-------------

.. container:: playground-doc-stack

    .. container:: playground-doc-card

        **What this example shows**

        A short note explaining the main idea in the loaded file, such as
        macros, browser output, or a family format like MRTD.

        .. container:: playground-doc-links

            .. container:: playground-doc-chip

                MakrellTS basics

            .. container:: playground-doc-chip

                Macro cookbook

            .. container:: playground-doc-chip

                Browser examples

    .. container:: playground-doc-card

        **Try this next**

        * change one literal and run again
        * load a related example from the left rail
        * compare the source with the generated JS tab

    .. container:: playground-doc-card

        **Related family notes**

        Even in a MakrellTS-first playground, the user should get light cues
        that the same ideas also connect to MakrellPy, Makrell#, MRON, MRML,
        and MRTD.

    .. container:: playground-doc-card

        **Go deeper**

        One or two clear links back into ``makrell.dev`` proper should always
        be visible so the playground never feels like a closed box.

Baseline for `v0.10.0`
----------------------

The first useful version does not need a full interactive documentation
system. It just needs enough structure to support learning while editing.

Good baseline:

* a short example summary
* one or two ``Try this`` prompts
* two or three related doc links
* a visible route back to MakrellTS docs

Good later additions:

* syntax-specific help cards
* macro-expansion notes tied to the current file
* context-sensitive panels for MRON, MRML, and MRTD examples
* richer family cross-links

What to avoid
-------------

The docs panel should not become:

* a second copy of the whole docs site
* a marketing panel with no practical help
* a permanent wall of prose beside the editor
* a place where users lose track of the active example

The best version is compact, readable, and clearly tied to what the editor is
currently showing.
