Implementation
==============

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

This page connects the playground idea to the current codebase. The point is to
keep the playground grounded in the real MakrellTS and ``vscode-makrell`` work
rather than letting it drift into a disconnected mock product.

Implementation anchors
----------------------

.. container:: playground-feature-grid

    .. container:: playground-feature-card

        **MakrellTS core**

        The browser playground should compile and run through the real
        TypeScript implementation.

        Important areas:

        * ``impl/ts/src/``
        * ``impl/ts/src/browser.ts``
        * ``impl/ts/src/meta_worker.ts``

    .. container:: playground-feature-card

        **Current examples**

        The first browser examples should be drawn from the real MakrellTS
        examples rather than written as special demo-only content.

        Important areas:

        * ``impl/ts/examples/hello.mrts``
        * ``impl/ts/examples/macros/showcase.mrts``
        * ``impl/ts/examples/browser-compile/``
        * ``impl/ts/examples/nbody-browser/``

    .. container:: playground-feature-card

        **Editor assets**

        The playground should reuse shared editor/language assets rather than
        duplicating language definitions in browser-only code.

        Important areas:

        * ``shared/makrell-editor-assets/``
        * ``vscode-makrell/scripts/sync-shared-assets.mjs``
        * ``vscode-makrell/`` as a consumer rather than the only source of truth

    .. container:: playground-feature-card

        **Site surface**

        The playground should live inside ``makrell.dev`` while keeping a
        distinct section identity.

        Important areas:

        * ``makrell.dev/source/playground/``
        * ``makrell.dev/source/_static/custom.css``

How the first version could be split
------------------------------------

One reasonable way to split the early implementation work is:

**1. Browser shell**
    Layout, navigation, loaded example state, and output panes.

**2. Editor integration**
    Syntax support, snippets, and small language-aware editor behaviours.

**3. MakrellTS execution**
    Compile/run path in the browser, error display, and generated JS view.

**4. Example catalogue**
    Example metadata, descriptions, load actions, and "try this next" prompts.

**5. Docs integration**
    Links and context cards that connect the active example back to MakrellTS
    and family documentation.

Concrete repo work packages
---------------------------

The first implementation pass could also be described in terms of concrete repo
work packages rather than only product areas.

.. container:: playground-feature-grid

    .. container:: playground-feature-card

        **Shared editor assets**

        Pull the reusable language/editor pieces into a shape both the browser
        playground and ``vscode-makrell`` can consume.

        Main source areas:

        * ``shared/makrell-editor-assets/``
        * ``shared/makrell-editor-assets/languages.json``
        * ``vscode-makrell/scripts/sync-shared-assets.mjs``

    .. container:: playground-feature-card

        **Browser host**

        Build the shell that loads an example, runs it in the browser, and
        shows source, output, and generated JS as one product surface.

        Main source areas:

        * ``impl/ts/src/browser.ts``
        * ``impl/ts/examples/browser-compile/``
        * ``makrell.dev/source/playground/``

    .. container:: playground-feature-card

        **Example catalogue**

        Turn the existing MakrellTS examples into a small launch catalogue with
        summaries, categories, and "try this next" prompts.

        Main source areas:

        * ``impl/ts/examples/``
        * playground example metadata
        * surrounding MakrellTS docs pages

    .. container:: playground-feature-card

        **Docs bridge**

        Connect active browser examples back to the right MakrellTS and family
        docs without making the playground feel like a duplicate manual.

        Main source areas:

        * ``makrell.dev/source/playground/``
        * ``makrell.dev/source/makrellts/``
        * shared concepts pages

First extraction targets
------------------------

If the shared-tooling work starts small, these are the best first candidates:

* syntax grammar
* snippets data
* language configuration
* example manifest shape

That is enough to prove the "shared with ``vscode-makrell``" rule early without
needing to solve every future tooling problem up front.

Current shared-tooling rule
---------------------------

If the browser playground and the VS Code extension need the same language
knowledge, that knowledge should live in a shared TS-side location.

The VS Code extension should remain a consumer of shared assets.
The browser playground should also remain a consumer of shared assets.
Neither should become the only source of truth for syntax or language metadata.

Implementation rule for `v0.10.0`
---------------------------------

The first release should favour a thin browser host over a giant special-case
app layer.

That means:

* keep the browser surface close to the real MakrellTS path
* share editor knowledge instead of copying it
* use teaching metadata around real examples rather than inventing demo-only semantics
* let the docs site provide the surrounding explanation instead of duplicating it in code

What this page is for
---------------------

This is not meant to be a final technical design document. It is here to keep
the playground tied to the real repo structure while the product shape is still
being worked out.
