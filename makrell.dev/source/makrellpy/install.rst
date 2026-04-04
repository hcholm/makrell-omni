Installation
============

MakrellPy is currently the easiest general entry point into the Makrell family
if you are comfortable with Python tooling.

The normal user workflow is package-first.

Install from PyPI
-----------------

.. code-block:: bash

    pip install makrell

This is the simplest route if you want to try the language quickly.

Install from source for development
-----------------------------------

.. code-block:: bash

    git clone https://github.com/hcholm/makrell-omni
    cd makrell-omni/src/impl/py
    pip install .

Use this when you want to work directly on the implementation or follow the
repo state more closely than the published package.

Common next commands
--------------------

Start the REPL:

.. code-block:: bash

    makrell

Run a script:

.. code-block:: bash

    makrell myscript.mrpy

Run tests from the Python implementation area:

.. code-block:: bash

    python -m pytest -q

Notes
-----

MakrellPy is a good entry point for people who want:

* Python interop
* a deep practical implementation
* access to the family through familiar Python tooling

Suggested next steps
--------------------

After installation, continue with:

* :doc:`quick-start`
* :doc:`functional`
* :doc:`interop`
* :doc:`tooling`
