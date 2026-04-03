Implementation Matrix
=====================

This matrix is the `v0.10.0` status snapshot for the family. The goal is not to
flatten the differences between tracks, but to make them easier to see.

.. list-table::
   :header-rows: 1
   :widths: 21 26 26 27

   * - Area
     - MakrellPy
     - MakrellTS
     - Makrell#
   * - Core language
     - strongest
     - active reference
     - active and growing
   * - Macros / meta
     - strongest
     - active, still being audited
     - active and growing
   * - Compile-time parity
     - strongest
     - improving
     - improving
   * - Pattern matching
     - strongest
     - partial
     - active subset
   * - Async / await
     - active
     - active
     - active
   * - Host interop
     - Python
     - JS / TS
     - .NET / CLR
   * - CLI story
     - established
     - active
     - active
   * - Dynamic loading
     - import-oriented
     - evolving
     - compile/load active
   * - Typing story
     - planned / exploratory
     - active typed surface
     - discussion / exploratory
   * - Packaging
     - package-shaped
     - package-ready direction
     - libraries active, CLI tool packaged
   * - Editor support
     - active via repo tooling
     - active via shared assets
     - active via shared assets
   * - Browser story
     - limited
     - active and central
     - none

Family formats and tooling
--------------------------

.. list-table::
   :header-rows: 1
   :widths: 24 16 60

   * - Area
     - Status
     - Notes
   * - MBF
     - active
     - shared structural base across the family
   * - MRON
     - active
     - available in Py and .NET, evolving in TS
   * - MRML
     - active
     - available in Py and .NET, evolving in TS
   * - MRTD
     - active
     - available across Py, TS, and .NET
   * - MRTD profiles
     - evolving
     - ``extended-scalars`` is the first shared profile
   * - VS Code extension
     - active
     - active now with run/check workflow and diagnostics coverage; see :doc:`vscode-makrell`
   * - Shared editor assets
     - active
     - shared grammar, snippets, and language config exist

Reading the table
-----------------

The words in this matrix are intentionally lightweight:

* **strongest** means the deepest current reference point in that area
* **active** means real and usable, but still clearly under development
* **partial** means meaningful support exists, but readers should expect gaps
* **evolving** means direction is clear, but the surface is still moving
* **planned / exploratory** means the topic matters, but is not yet a settled
  implementation story

This table should keep growing, but even this version is better than leaving
readers to infer everything from scattered pages.

How to use the matrix
---------------------

The matrix is not meant to replace the implementation sections. It is a quick
orientation tool.

Use it when you want to answer questions like:

* which implementation should I learn first for a specific host?
* which track currently has the deepest macro support?
* where should I expect the strongest interop story?
* whether a feature is already broad or still developing

Typical reading pattern
-----------------------

1. use this table to get oriented
2. go to the relevant implementation section
3. use that section's guide, cookbook, and tooling pages
4. consult the repo specs for more formal detail when needed

Practical takeaway
------------------

In simple terms:

* start with MakrellPy when you want the broadest current language experience
* start with MakrellTS when your main world is JavaScript or TypeScript
* start with Makrell# when your main world is `.NET`, CLR interop, and
  compiler-oriented workflows

The formats and shared-concepts sections then help connect those implementation
tracks back to the broader family model.
