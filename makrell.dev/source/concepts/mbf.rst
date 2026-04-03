MBF
===

MBF, the **Makrell Base Format**, is the structural core of the Makrell family.

It provides:

* bracketed forms
* regular nodes and operator expressions
* a syntax that can preserve source-sensitive structure when needed
* a base that can host programming languages, data formats, and markup formats

Why it matters
--------------

MBF is what lets the Makrell family feel coherent.
Without MBF, MakrellPy, MRON, MRML, and the other implementations would just be
separate surface notations.

With MBF, they can share:

* common parsing intuitions
* a common AST vocabulary
* quote/unquote and macro-oriented workflows
* embedded sublanguages and miniformats

See also :doc:`../mbf/index`.
