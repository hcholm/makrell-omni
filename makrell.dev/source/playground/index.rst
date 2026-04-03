Playground
==========

.. container:: playground-shell

    .. container:: playground-topbar

        .. container:: playground-backlinks

            :doc:`Back to Makrell </index>`
            |
            :doc:`Open docs </getting-started>`

        .. container:: playground-badge

            MakrellTS playground

    .. container:: playground-section-nav

        :doc:`Overview <index>`
        :doc:`Experience <experience>`
        :doc:`Examples <examples>`
        :doc:`Architecture <architecture>`
        :doc:`Roadmap <roadmap>`

    .. container:: playground-hero

        .. container:: playground-hero-copy

            .. rubric:: Makrell Playground

            A browser-based surface for learning and trying the Makrell family
            through the MakrellTS implementation. The playground is part of
            ``makrell.dev``, but it should feel like its own product surface:
            editor-first, example-rich, and tuned for live exploration.

        .. container:: playground-hero-panels

            .. container:: playground-panel

                **What it should combine**

                * live editor
                * runnable examples
                * output and REPL area
                * generated-code views
                * embedded docs/reference

            .. container:: playground-panel

                **Ground rules**

                * reuse real MakrellTS parser/compiler/runtime code
                * share editor/language assets with ``vscode-makrell`` where practical
                * keep the playground distinct from the docs without forking the product identity

Why a dedicated section?
------------------------

The main documentation site is good for reading and navigation. The playground
should optimise for a different mode:

* open an example and run it immediately
* inspect what MakrellTS generates
* compare source, output, and documentation side by side
* learn the language by modifying live examples rather than only reading pages

That is why it should live under ``/playground/`` with its own section identity,
even though it remains part of ``makrell.dev``.

Planned product shape
---------------------

The intended first version for ``v0.10.0`` is MakrellTS-first.

Planned core areas:

* **Editor**
  with Makrell syntax highlighting, snippets, and bracket-aware editing
* **Examples**
  curated examples grouped by theme, with one-click loading
* **Run / Compile**
  browser execution plus generated JS/TS views
* **Output / REPL**
  result values, logs, and interactive experimentation
* **Embedded docs**
  focused explanations tied to the current example or topic

Static product sketch
---------------------

The first important thing is not a full browser app. It is a clear product
shape that the real playground can grow into.

.. container:: playground-workspace

    .. container:: playground-rail

        .. container:: playground-rail-header

            Examples

        .. container:: playground-rail-list

            .. container:: playground-rail-item playground-rail-item--active

                **First program**

                Small MakrellTS file, output, and generated JS.

            .. container:: playground-rail-item

                **Macro trio**

                ``pipe`` / ``rpn`` / ``lisp`` as the shared macro showcase.

            .. container:: playground-rail-item

                **MRON**

                Compact data example with browser-side parsing.

            .. container:: playground-rail-item

                **MRML**

                Markup example with live rendered output.

    .. container:: playground-main

        .. container:: playground-main-top

            .. container:: playground-faux-tabbar

                .. container:: playground-faux-tab playground-faux-tab--active

                    source.mrts

                .. container:: playground-faux-tab

                    output

                .. container:: playground-faux-tab

                    docs

            .. container:: playground-runbar

                .. container:: playground-run-pill

                    run

                .. container:: playground-run-pill playground-run-pill--quiet

                    compile

        .. container:: playground-editor

            .. code-block:: makrell

                {macro pipe [xs]
                    ...}

                message = "Makrell Playground"
                {print message}

                [2 3 5]
                    | {map {* 2}}
                    | sum

        .. container:: playground-bottom-grid

            .. container:: playground-output-panel

                **Output**

                ``Makrell Playground``

                ``20``

            .. container:: playground-output-panel

                **Generated JS**

                ``console.log(message)``

                ``sum([2, 3, 5].map(x => x * 2))``

            .. container:: playground-output-panel

                **Context docs**

                Short notes tied to the loaded example, with links back to the
                surrounding MakrellTS documentation.

The next pages sketch how this should be organised, what examples it should
highlight, and how it should be built without duplicating the real MakrellTS
toolchain.

Playground navigation
---------------------

.. toctree::
   :maxdepth: 2

   experience
   examples
   architecture
   roadmap
