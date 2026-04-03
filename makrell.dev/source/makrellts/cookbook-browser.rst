Browser Recipes
===============

MakrellTS is relevant both for Node-oriented work and for browser-oriented
workflows. This page collects a few patterns that are more about the browser
side of the TypeScript track than the CLI alone.

Recipe: browser-oriented runtime direction
------------------------------------------

The implementation already includes browser-related entry points and examples in
``impl/ts/examples/``.

Representative MRML-like output:

.. code-block:: makrell

    {html
      {body
        {h1 MakrellTS}
        {p Generated from MBF-style syntax.}}}

This kind of example is useful when you want to think about MakrellTS as part
of a document or frontend pipeline rather than only as a command-line tool.

Recipe: keep source and generated output nearby
-----------------------------------------------

When working in browser settings, a useful pattern is:

* keep Makrell source as the editable form
* inspect emitted JavaScript when needed
* treat browser examples as integration checks, not only syntax demos

Recipe: use MRON and MRML as part of the same workflow
------------------------------------------------------

.. code-block:: makrell

    owner "Rena Holm"
    active true
    items [
      { name "A" }
      { name "B" }
    ]

This helps show that the TypeScript track still participates in the broader
family of formats and structures, not only the programming-language layer.

When to use these patterns
--------------------------

Use these recipes when your main questions are about:

* browser-facing output
* generated structures
* how MakrellTS fits into a frontend or document pipeline

Related pages
-------------

For surrounding workflow detail, continue with:

* :doc:`cookbook-cli`
* :doc:`interop`
* :doc:`tooling`
