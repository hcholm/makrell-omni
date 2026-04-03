Tooling
=======

MakrellPy currently has the most established tooling story in the family. That
matters because it gives the language a practical everyday workflow rather than
only a conceptual design.

Highlights
----------

Current tooling highlights include:

* command-line execution
* REPL workflow
* language-server support
* Visual Studio Code extension

Everyday workflow
-----------------

Install:

.. code-block:: bash

    pip install makrell

Run the REPL:

.. code-block:: bash

    makrell

Run a script:

.. code-block:: bash

    makrell myscript.mr

Run tests from the Python implementation area:

.. code-block:: bash

    python -m pytest -q

Editor support
--------------

MakrellPy has the clearest editor-tooling story in the family today. That
includes:

* a language-server workflow
* Visual Studio Code support
* a practical link between day-to-day editing and the Python implementation

Why this matters
----------------

The tooling story is part of what makes MakrellPy a useful practical reference
track. It is not only about language features; it is also about being able to
edit, run, inspect, and test code in a routine development loop.

Suggested next pages
--------------------

For the rest of the Python track, continue with:

* :doc:`install`
* :doc:`quick-start`
* :doc:`interop`
* :doc:`metaprogramming`
