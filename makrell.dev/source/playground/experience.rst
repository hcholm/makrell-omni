Experience
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

The playground should feel different from the documentation area even while it
stays on the same site. It should behave more like a product workspace than a
chaptered manual.

Core experience goals
---------------------

* editor-first layout
* fast example loading
* visible compile/run feedback
* light and dark mode support that both feel deliberate
* clear route back to the main docs and site

Suggested layout zones
----------------------

**Primary workspace**
    Editor, output, generated-code views, and any optional AST/parse panels.

**Secondary navigation**
    Examples, guides, and topic links relevant to the current file.

**Reference strip**
    Short contextual help rather than long uninterrupted prose.

**Global escape hatch**
    A visible route back to ``makrell.dev`` proper so the playground never
    feels like a dead-end.

Important identity rule
-----------------------

The playground should not look like a generic code sandbox dropped into the
docs site. It should look like a Makrell surface with its own rhythm, stronger
workspace cues, and a clearer split between navigation and active work.

At the same time, it should not become a disconnected brand. Typography, logo,
and overall family cues should still make it obvious that this belongs to
Makrell.

Light and dark mode
-------------------

The playground should work in both theme modes without one feeling like the
"real" version and the other feeling secondary.

The light version can stay cleaner and more editorial. The dark version should
lean more strongly into the editor/workspace identity. In both modes:

* the playground should remain denser than the documentation area
* navigation should stay visible and stable
* the route back to ``makrell.dev`` should stay easy to spot
* interactive zones should remain clear without relying on harsh borders

Product chrome
--------------

The playground should also have a small amount of persistent chrome that makes
the product feel self-contained without becoming heavy.

Good permanent controls for the first version:

* light/dark switch
* docs toggle or docs tab
* examples access
* share or copy-link action
* explicit route back to the main docs/site

These controls should feel calm and structural. They are not the main event,
but they strongly shape whether the playground feels intentional.

