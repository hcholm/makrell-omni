Workspace
=========

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

This page is a static product sketch for the browser workspace itself. It is
not the real app yet, but it shows the shape the playground should be moving
towards.

.. container:: playground-workspace playground-workspace--large

    .. container:: playground-rail

        .. container:: playground-rail-header

            Example library

        .. container:: playground-rail-list

            .. container:: playground-rail-item playground-rail-item--active

                **Hello, MakrellTS**

                Load, run, inspect output.

            .. container:: playground-rail-item

                **Macro trio**

                ``pipe`` / ``rpn`` / ``lisp``

            .. container:: playground-rail-item

                **Pattern matching**

                Small match-heavy example with visible output.

            .. container:: playground-rail-item

                **MRON / MRML / MRTD**

                Family formats shown through the browser track.

    .. container:: playground-main

        .. container:: playground-main-top

            .. container:: playground-faux-tabbar

                .. container:: playground-faux-tab playground-faux-tab--active

                    hello.mrts

                .. container:: playground-faux-tab

                    generated.js

                .. container:: playground-faux-tab

                    docs

                .. container:: playground-faux-tab

                    examples

            .. container:: playground-runbar

                .. container:: playground-run-pill

                    run

                .. container:: playground-run-pill playground-run-pill--quiet

                    compile

                .. container:: playground-run-pill playground-run-pill--quiet

                    reset

        .. container:: playground-utilitybar

            .. container:: playground-utilitygroup

                .. container:: playground-utility-chip playground-utility-chip--active

                    light

                .. container:: playground-utility-chip

                    dark

            .. container:: playground-utilitygroup

                .. container:: playground-utility-chip

                    docs

                .. container:: playground-utility-chip

                    examples

                .. container:: playground-utility-chip

                    share

                .. container:: playground-utility-chip

                    back to docs

        .. container:: playground-editor

            .. code-block:: makrell

                {fun square [x]
                    x * x}

                values = [2 3 5]

                {print "Makrell Playground"}
                {print {values | {map square} | sum}}

        .. container:: playground-bottom-grid

            .. container:: playground-output-panel

                **Output**

                ``Makrell Playground``

                ``38``

            .. container:: playground-output-panel

                **Generated JS**

                ``const values = [2, 3, 5]``

                ``console.log(sum(values.map(square)))``

            .. container:: playground-output-panel

                **Context help**

                Explain the loaded example, link to MakrellTS docs, and suggest
                one or two edits to try next.

The intended layout
-------------------

The first useful browser version should keep a stable three-part rhythm:

* example rail on the left
* active workspace in the centre
* docs/help/output around the active file rather than on separate distant pages

The point is not to replicate a full IDE. The point is to give Makrell a clean
browser-native place where examples, execution, and documentation reinforce one
another.

Interactive mock
----------------

The static sketch above shows the overall shape. This smaller in-page mock is
there to make the section feel more like a product surface while the real
browser playground is still being built.

.. raw:: html

    <div class="playground-demo" data-playground-demo>
      <div class="playground-demo-rail">
        <div class="playground-demo-rail-header">Launch examples</div>
        <div class="playground-demo-rail-list">
          <button class="playground-demo-example playground-demo-example--active" type="button" data-example="hello">hello.mrts</button>
          <button class="playground-demo-example" type="button" data-example="macros">macro showcase</button>
          <button class="playground-demo-example" type="button" data-example="browser">browser compile</button>
          <button class="playground-demo-example" type="button" data-example="nbody">n-body browser</button>
        </div>
      </div>
      <div class="playground-demo-main">
        <div class="playground-demo-toolbar">
          <div class="playground-demo-tabs">
            <button class="playground-demo-tab playground-demo-tab--active" type="button" data-view="source">source</button>
            <button class="playground-demo-tab" type="button" data-view="output">output</button>
            <button class="playground-demo-tab" type="button" data-view="generated">generated JS</button>
            <button class="playground-demo-tab" type="button" data-view="docs">docs</button>
          </div>
          <div class="playground-demo-title" data-demo-title>hello.mrts</div>
        </div>
        <div class="playground-demo-body">
          <div class="playground-demo-panel playground-demo-panel--active" data-panel="source">
            <pre class="playground-demo-pre" data-demo-source></pre>
          </div>
          <div class="playground-demo-panel" data-panel="output">
            <pre class="playground-demo-pre" data-demo-output></pre>
          </div>
          <div class="playground-demo-panel" data-panel="generated">
            <pre class="playground-demo-pre" data-demo-generated></pre>
          </div>
          <div class="playground-demo-panel" data-panel="docs">
            <div class="playground-demo-docs">
              <strong data-demo-heading></strong>
              <p data-demo-summary></p>
              <ul data-demo-points></ul>
            </div>
          </div>
        </div>
      </div>
    </div>

Workspace chrome
----------------

The product shell matters almost as much as the editor area itself. The first
browser version should make a few things obvious immediately:

* this is a Makrell surface, not a generic sandbox
* there is a deliberate light/dark mode choice
* examples, docs, and share actions are always nearby
* the user can get back to the main site without feeling trapped in a side tool

That is why the workspace mock should show a small utility strip rather than
only code tabs and run buttons.

What this page is for
---------------------

This workspace sketch is useful for:

* design iteration
* layout decisions
* agreeing on product scope for ``v0.10.0``
* checking that the playground feels like its own Makrell surface before the
  real browser app exists
