Choosing Recipes by Section
===========================

Use the implementation-specific sections when the task depends on the host
ecosystem:

* :doc:`../makrellpy/cookbook`
* :doc:`../makrellts/cookbook`
* :doc:`../makrellsharp/cookbook`
* :doc:`../mron/cookbook`
* :doc:`../mrml/cookbook`

Use :doc:`common-recipes` when you want patterns that reflect the family as a
whole.

Rule of thumb
-------------

Choose the recipe section based on what is most specific about the task:

* if the task is about a shared Makrell pattern, start with :doc:`common-recipes`
* if the task is about a host ecosystem, go to the implementation section
* if the task is about data or markup structure, go to MRON or MRML

Examples
--------

Use **MakrellPy recipes** for:

* Python imports
* Python-facing modules
* macro work in the Python implementation

Use **MakrellTS recipes** for:

* CLI and emitted JavaScript workflows
* browser-oriented usage
* JS/TS-facing macro or runtime questions

Use **Makrell# recipes** for:

* CLI build/run workflows
* CLR interop
* assembly loading and generated C# inspection

Use **MRON** and **MRML** recipes for:

* configuration and data documents
* markup fragments and page-shaped trees

Why this page matters
---------------------

The cookbook is easier to use when you pick the right subsection early. Most
recipe pages are intentionally specific, so a small amount of orientation here
can save time later.
