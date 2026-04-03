MRTD
====

MRTD is the Makrell family tabular data format.

The current draft keeps MRTD close to CSV in overall shape while using MBF-style
token rules for cells, quoting, and typed headers.

Why use MRTD?
-------------

* simple row-and-column structure
* lighter syntax than comma-delimited formats
* optional typed headers
* a tabular format that still belongs to the same family as Makrell code, MRON, and MRML

Best fit
--------

MRTD is a good fit when you want:

* something close to CSV in intent
* hand-editable tabular data
* optional scalar typing in the header row
* a family-native format for datasets, exports, and configuration tables

How to read this section
------------------------

If you are new to MRTD:

#. start with :doc:`quick-start`
#. use the repo spec for the current draft details
#. then look at implementation-specific APIs in MakrellPy, MakrellTS, or Makrell#

Current implementation note
---------------------------

The current draft is now implemented in the `.NET`, Python, and TypeScript
tracks as a simple row-based parser plus typed/object-and-tuple helper APIs.

The first profile experiment is also in place: ``extended-scalars`` adds a small
set of profile-level scalar suffixes such as ``dt`` and ``k``. Those suffixes are
not part of MRTD core and should be treated as profile-specific.

Related pages
-------------

For family context and comparison, also see:

* :doc:`../concepts/overview`
* :doc:`../reference/implementation-matrix`
* :doc:`../mron/index`

.. toctree::
   :maxdepth: 2

   quick-start
