Getting Started
===============

This site is organised for two kinds of readers:

* people who want to understand the **Makrell family**
* people who want to jump straight to **one implementation or format**

Recommended paths
-----------------

If you are new to Makrell, start here:

1. :doc:`concepts/index`
2. :doc:`mron/index`
3. :doc:`mrml/index`
4. :doc:`mrtd/index`
5. one implementation section:
   * :doc:`makrellpy/index`
   * :doc:`makrellts/index`
   * :doc:`makrellsharp/index`

If you already know what you want:

* use **MakrellPy** for the most mature language experience today
* use **MakrellTS** for the TypeScript reference track, browser work, and JavaScript interop
* use **Makrell#** for .NET and CLR integration
* use **MRON** for structured data
* use **MRML** for markup and document-like trees
* use **MRTD** for simple tabular data

Suggested first hour
--------------------

If you want a simple way to get oriented without reading too widely, this is a
reasonable first hour:

1. skim :doc:`concepts/overview`
2. read :doc:`mron/quick-start`
3. read :doc:`mrml/quick-start`
4. read :doc:`mrtd/quick-start`
5. choose one implementation:
   * :doc:`makrellpy/quick-start`
   * :doc:`makrellts/quick-start`
   * :doc:`makrellsharp/quick-start`

Fast entry points
-----------------

MakrellPy
^^^^^^^^^

.. code-block:: bash

    pip install makrell
    makrell

MakrellTS
^^^^^^^^^

.. code-block:: bash

    cd impl/ts
    bun install
    bun run src/cli.ts examples/hello.mrts

Makrell#
^^^^^^^^

.. code-block:: bash

    cd impl/dotnet
    dotnet run --project src/MakrellSharp.Cli -- examples/hello.mrsh

What is shared across the family?
---------------------------------

The common thread is **MBF**, the Makrell Base Format:

* bracketed forms
* operator-oriented structure
* syntax that stays compact but highly structured
* support for code, data, markup, and embedded sublanguages

That is why Makrell can support languages like MakrellPy and Makrell#, while also
supporting formats like MRON and MRML.

Where to look for detail
------------------------

Different parts of the site serve different purposes:

* **tutorials** for guided learning
* **cookbook** for short task-oriented examples
* **implementation sections** for practical host-specific usage
* **reference** for lookup material
* **specs in the repo** for more formal detail

Quick orientation by section
----------------------------

**Shared Concepts**
    The common model: MBF, operators, calls, pattern matching, quoting, macros,
    implementations, and feature differences.

**MakrellPy**
    The Python-hosted implementation. Deep, practical, and still one of the best places
    to learn the language in action.

**MakrellTS**
    The TypeScript reference track for ongoing language evolution, with browser and Node.js relevance.

**Makrell#**
    The .NET-hosted implementation with CLR interop, MRON/MRML support, and compile/load workflows.

**MRON**
    A lightweight structured data notation.

**MRML**
    A lightweight markup and document notation.

**MRTD**
    A lightweight tabular notation with typed headers.

**MBF**
    The shared structural format beneath the family.
