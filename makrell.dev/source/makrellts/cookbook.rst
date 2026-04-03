Cookbook
========

MakrellTS is especially useful when you want Makrell-style structure in
JavaScript and TypeScript environments.

Useful recipe areas
-------------------

* run a source file with the CLI
* emit generated JavaScript for inspection
* use MRON as lightweight structured data
* use MRML for generated markup
* run Makrell in browser-oriented workflows
* bridge Makrell code with JavaScript modules

Recipe: run and emit
--------------------

Run a source file:

.. code-block:: bash

    bun run src/cli.ts examples/hello.mrjs

Emit generated JavaScript:

.. code-block:: bash

    bun run src/cli.ts examples/hello.mrjs --emit-js

Recipe: compact MRON
--------------------

.. code-block:: makrell

    owner "Rena Holm"
    active true
    items [
      { name "A" }
      { name "B" }
    ]

Recipe: MRML output
-------------------

.. code-block:: makrell

    {html
      {body
        {h1 MakrellTS}
        {p Generated from MBF-style syntax.}}}

Recipe: a tiny macro
--------------------

.. code-block:: makrell

    {def macro twice [x]
      [{quote $x} {quote $x}]}

    {twice {print "hello"}}

More MakrellTS recipes
----------------------

* :doc:`cookbook-cli`
* :doc:`cookbook-browser`
* :doc:`cookbook-macros`
