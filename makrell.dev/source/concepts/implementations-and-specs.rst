Implementations and Specs
=========================

The Makrell project should be read through both **specifications** and
**implementations**.

The specs explain the intended family model.
The implementations show what is currently real in each host ecosystem.

How to read the project
-----------------------

In practice, it is useful to read the Makrell project through three layers:

* **shared concepts**, for the family model
* **implementation sections**, for currently available behaviour
* **specs**, for more formal detail and intended semantics

This avoids two common mistakes:

* assuming every implementation already has the same depth
* assuming one implementation page is the whole project definition

Current implementation picture
------------------------------

**MakrellPy**
    Deep and practical, especially for macros, pattern matching, and Python interop.

**MakrellTS**
    The TypeScript reference track for ongoing language evolution, with browser and Node.js integration.

**Makrell#**
    Important for .NET, CLR interop, compilation, dynamic loading, MRON, and MRML.

Where the specs fit
-------------------

The specifications under ``specs/`` are the closest thing to a family-wide source of
truth, but they do not remove the need to look at real implementations.

The implementations matter because they answer questions like:

* what is already usable today?
* what is host-specific?
* what differences are intentional rather than temporary?

Practical rule
--------------

When in doubt:

* use the shared concepts pages for family-wide ideas
* use the language-specific sections for actual support status
* use the spec pages in the repo for deeper normative detail

See also :doc:`../reference/implementation-matrix`.
