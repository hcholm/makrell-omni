Installation
============

MakrellPy is currently the easiest general entry point into the Makrell family
if you are comfortable with Python tooling.

Current usage is centred on Python packaging.

Install from PyPI
-----------------

.. code-block:: bash

    pip install makrell

This is the simplest route if you want to try the language quickly.

Install from source
-------------------

.. code-block:: bash

    git clone https://github.com/hcholm/makrell-py
    cd makrell-py
    pip install .

Use this when you want to work directly on the implementation or follow the
current repo state more closely than a packaged release.

Common next commands
--------------------

Start the REPL:

.. code-block:: bash

    makrell

Run a script:

.. code-block:: bash

    makrell myscript.mr

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
