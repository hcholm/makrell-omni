Implementation Matrix
=====================

The implementations do not all have the same maturity. This is part of the
current project state, and it is more useful to show that plainly than to blur
the differences.

+------------------+----------------------+----------------------+----------------------+
| Area             | MakrellPy            | MakrellTS            | Makrell#             |
+==================+======================+======================+======================+
| Core language    | deep, practical      | active reference     | active and growing   |
+------------------+----------------------+----------------------+----------------------+
| Macros / meta    | strongest            | partial / evolving   | active and growing   |
+------------------+----------------------+----------------------+----------------------+
| Pattern matching | strongest            | partial              | active subset        |
+------------------+----------------------+----------------------+----------------------+
| Host interop     | Python               | JS / TS              | .NET / CLR           |
+------------------+----------------------+----------------------+----------------------+
| CLI story        | established          | active               | active               |
+------------------+----------------------+----------------------+----------------------+
| Dynamic loading  | import-oriented      | evolving             | compile/load active  |
+------------------+----------------------+----------------------+----------------------+
| MRON             | available            | evolving             | available            |
+------------------+----------------------+----------------------+----------------------+
| MRML             | available            | evolving             | available            |
+------------------+----------------------+----------------------+----------------------+
| MRTD             | available            | available            | available            |
+------------------+----------------------+----------------------+----------------------+

Reading the table
-----------------

The words in this matrix are intentionally lightweight:

* **strongest** means the deepest current reference point in that area
* **active** means real and usable, but still clearly under development
* **partial** means meaningful support exists, but readers should expect gaps
* **evolving** means direction is clear, but the surface is still moving

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
* start with Makrell# when your main world is `.NET` and CLR interop

The formats and shared-concepts sections then help connect those implementation
tracks back to the broader family model.
