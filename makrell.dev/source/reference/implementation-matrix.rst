Implementation Matrix
=====================

The implementations do not all have the same maturity.
This is a feature of the current project state, not something the docs should hide.

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

Reading the table
-----------------

The words in this matrix are intentionally lightweight:

* **strongest** means the deepest current reference point in that area
* **active** means real and usable, but still clearly under development
* **partial** means meaningful support exists, but readers should expect gaps
* **evolving** means direction is clear, but the surface is still moving

This table should keep growing, but even this version is much better than leaving
readers to infer everything from scattered pages.
