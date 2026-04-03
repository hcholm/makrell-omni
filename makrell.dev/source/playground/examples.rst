Examples
========

.. container:: playground-shell playground-shell--inner

    .. container:: playground-topbar

        .. container:: playground-backlinks

            :doc:`Back to Makrell </index>`
            |
            :doc:`Open docs </getting-started>`

        .. container:: playground-badge

            Makrell playground

    .. include:: _section_nav.rst

Examples should be one of the main reasons to enter the playground.

Planned example groups
----------------------

* first steps
* macros
* pattern matching
* browser examples
* MRON
* MRML
* MRTD

Good first example set
----------------------

For ``v0.10.0``, the most important examples to surface are:

* the shared ``pipe`` / ``rpn`` / ``lisp`` macro showcase
* a small MakrellTS-first language example
* one browser-oriented example
* one compact data/format example

.. container:: playground-example-grid

    .. container:: playground-example-card

        **First steps**

        The smallest useful MakrellTS file:

        * one function
        * one pipeline
        * one visible output value

        Good for showing the editor, output panel, and generated JS side by side.

    .. container:: playground-example-card

        **Macro trio**

        The shared ``pipe`` / ``rpn`` / ``lisp`` showcase:

        * macro ergonomics
        * notation reshaping
        * language-embedding flavour

        This should be one of the signature teaching examples.

    .. container:: playground-example-card

        **Browser example**

        A browser-oriented MakrellTS example with visible state or animation.

        It should answer the question: "why is there a browser playground at all?"

    .. container:: playground-example-card

        **Format example**

        A compact MRON, MRML, or MRTD example tied to MakrellTS parsing and output.

        This helps connect the language track to the rest of the family.

Candidate first examples from the current repo
----------------------------------------------

The playground should lean on real MakrellTS examples that already exist in the
repo, then add a small number of browser-specific teaching wrappers around
them.

``examples/hello.mrts``
    The simplest useful MakrellTS entry point. This is the right default for a
    first-run browser experience.

``examples/macros/showcase.mrts``
    The shared ``pipe`` / ``rpn`` / ``lisp`` macro trio. This should be one of
    the signature examples for ``v0.10.0``.

``examples/browser-compile/index.html``
    A browser compile example. Even if the playground eventually absorbs some
    of this directly, it is useful as a current reference for the browser-side
    path.

``examples/nbody-browser/app.mrts``
    The most obvious current browser-oriented example. It helps justify why the
    playground exists as a browser product, not only as documentation.

Launch set for ``v0.10.0``
--------------------------

The first browser release does not need a huge catalogue. It needs a compact
set of examples with clearly different jobs.

.. container:: playground-example-grid

    .. container:: playground-example-card

        **Launch example: ``hello.mrts``**

        Role:

        * default loaded example
        * first successful run
        * first look at generated JS

        Teach:

        * basic syntax
        * small functional flow
        * what "run" means in the playground

    .. container:: playground-example-card

        **Launch example: macro showcase**

        Role:

        * signature MakrellTS example
        * shared family story for ``pipe`` / ``rpn`` / ``lisp``

        Teach:

        * macro ergonomics
        * notation reshaping
        * generated-code curiosity

    .. container:: playground-example-card

        **Launch example: browser compile**

        Role:

        * explain the browser-side MakrellTS path
        * prove that the playground is using real implementation code

        Teach:

        * compile in the browser
        * source-to-output relationship
        * how browser usage differs from CLI usage

    .. container:: playground-example-card

        **Launch example: n-body browser**

        Role:

        * richer, visibly browser-native example
        * answer "why not just read docs?"

        Teach:

        * stateful browser behaviour
        * MakrellTS in a more dynamic setting
        * why a playground is worth having

Example catalogue shape
-----------------------

The first catalogue in the playground could be grouped something like this:

**Start here**
    ``hello.mrts``, one compact pipeline example, one match example.

**Macros**
    ``showcase.mrts`` and perhaps one follow-up example focused on one macro at
    a time.

**Browser**
    a small browser compile example and one richer browser-oriented example.

**Family formats**
    short MRON, MRML, and MRTD examples that are browser-friendly and tied back
    to the family docs.

Documentation pairings
----------------------

The playground examples should link back into the surrounding docs in a clear,
repeatable way.

Useful pairings for the first release:

``hello.mrts`` -> MakrellTS quick start
    The simplest "edit and run" route should connect directly to the main
    implementation onboarding path.

``showcase.mrts`` -> MakrellTS macro docs
    The shared macro trio should connect to the existing macro cookbook and the
    broader family macro story.

``browser-compile`` -> playground architecture
    This is a good bridge between user-facing browser behaviour and the real
    technical implementation path.

``nbody-browser`` -> MakrellTS browser/tooling pages
    This example helps link the playground back to the TypeScript/browser track
    rather than leaving it as an isolated spectacle.

Each example should come with:

* a short description
* a "load into editor" action
* one or two suggested edits to try next

Example UX rule
---------------

The examples should not just be a file list. They should work like teaching
cards: concise enough to browse quickly, but rich enough that a user can see
why an example exists before opening it.

Launch notes for the current repo examples
------------------------------------------

To make the playground feel real, the first browser version should ship with
small teaching notes attached to the actual example files that already exist in
the repo.

.. container:: playground-feature-grid

    .. container:: playground-feature-card

        **``hello.mrts``**

        Summary:
            A compact MakrellTS file that shows macros, pattern matching, and a
            simple printed result without any browser-specific setup.

        Good first load because:
            * it runs quickly
            * it has visible output
            * it exposes normal language structure before the user sees a large example

        Try this next:
            * change ``x = 2`` to another value
            * change the ``repeat_add`` count
            * make one ``match`` branch fail and see what the fallback does

        Related docs:
            * MakrellTS quick start
            * shared concepts for functions and calls
            * pattern matching basics

    .. container:: playground-feature-card

        **``examples/macros/showcase.mrts``**

        Summary:
            The shared ``pipe`` / ``rpn`` / ``lisp`` trio. This is the cleanest
            current signature example for the family-wide macro story.

        Good first macro card because:
            * it is distinctive
            * it shows three different macro flavours
            * it maps directly to the MakrellPy and Makrell# showcase direction

        Try this next:
            * change the pipeline input value
            * change the postfix expression in ``rpn``
            * replace the Lisp-shaped input string and compare the result

        Related docs:
            * MakrellTS macro cookbook
            * family macro/meta concepts
            * generated-JS comparison view

    .. container:: playground-feature-card

        **``examples/browser-compile/``**

        Summary:
            The current browser-compile path. This is less about language
            teaching and more about proving that the browser surface is using
            real MakrellTS implementation code.

        Good technical bridge because:
            * it shows the browser path already exists
            * it helps explain source-to-output behaviour
            * it anchors the playground in current code, not only in plans

        Try this next:
            * compare the source and generated output side by side
            * trigger a small source edit and rebuild
            * use it as the reference for how the playground run loop should behave

        Related docs:
            * playground architecture
            * playground implementation
            * MakrellTS tooling notes

    .. container:: playground-feature-card

        **``examples/nbody-browser/app.mrts``**

        Summary:
            A browser-native MakrellTS example with visible state changes and a
            stronger reason for a real playground surface to exist.

        Good richer example because:
            * the output is more visual than plain text
            * it makes browser execution feel worthwhile
            * it tests how the playground handles a larger file and a more dynamic result

        Try this next:
            * change one simulation parameter
            * reset and rerun with a different body count
            * inspect how the browser-facing functions are structured

        Related docs:
            * MakrellTS tooling and browser notes
            * playground workspace
            * playground flows

Example metadata the app should expose
--------------------------------------

Even the first browser version should treat examples as more than file paths.
Each launch example should carry a small stable metadata shape:

* title
* source path
* category
* short summary
* one or two ``Try this next`` prompts
* related docs links
* whether the output is mainly textual, generated-code-oriented, or browser-visual

That will help the playground reuse the same example catalogue in:

* the left example rail
* the docs panel
* any "start here" view
* future shareable example links

