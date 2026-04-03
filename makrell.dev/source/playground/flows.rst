Flows
=====

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

The playground should support a small number of clear flows well. That matters
more than trying to support every kind of browser interaction at once.

Key flows for v0.10.0
---------------------

.. container:: playground-feature-grid

    .. container:: playground-feature-card

        **1. First contact**

        A new visitor lands in the playground and immediately sees:

        * one loaded example
        * where to run it
        * where to read what it is doing

        This is the "I want to try Makrell right now" path.

    .. container:: playground-feature-card

        **2. Example to understanding**

        A user opens an example, runs it, then follows the nearby explanation.

        The key here is that examples and docs should reinforce one another
        rather than sending the user across distant parts of the site.

    .. container:: playground-feature-card

        **3. Example to edit**

        After loading an example, the user should be nudged toward one or two
        small edits:

        * change a literal
        * add one step to a pipeline
        * switch to a related example

        The goal is to make the playground feel interactive, not museum-like.

    .. container:: playground-feature-card

        **4. Browser to local workflow**

        Once the playground has done its job, the user should know where to go
        next:

        * MakrellTS installation
        * the CLI examples
        * the surrounding documentation

        The browser surface should lead naturally into the real tooling.

Signature flows
---------------

There are two flows that should probably get extra attention because they help
explain why the playground exists:

**Macro showcase**
    Load the shared ``pipe`` / ``rpn`` / ``lisp`` example, run it, and inspect
    both output and generated code.

**Browser-native example**
    Load an example that would make much less sense as static documentation
    alone, such as a small browser-oriented or visibly stateful MakrellTS
    example.

Things to avoid
---------------

The playground should avoid these traps:

* landing on an empty editor
* hiding the "run" action
* making examples look like undifferentiated files
* sending users away from the playground before they have learned anything
* turning every path into a full tutorial when a short, guided loop would do

The first release should feel like a compact, well-guided circuit rather than a
big but vague browser IDE.
