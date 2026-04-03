MRML
====

MRML is the Makrell family markup language.

It aims to provide a compact, structural alternative to XML and HTML while
staying aligned with the Makrell family model.

Why use MRML?
-------------

* compact markup syntax
* natural nesting
* good fit for generated trees and embedded document languages
* structural similarity with the rest of Makrell

Best fit
--------

MRML is a good fit when you want:

* a compact alternative to verbose XML or HTML trees
* generated or templated markup
* document structures that feel close to Makrell code and data
* a basis for static-site, template, or DSL-style document generation

How to read this section
------------------------

If you are new to MRML:

#. start with :doc:`quick-start`
#. use :doc:`syntax` as the reference page
#. then move to the cookbook pages for fragments and page-shaped documents

If you already know the general idea and want examples, the cookbook pages are
usually the quickest entry point.

Current implementation note
---------------------------

In the current `.NET` implementation, MRML parses to
``System.Xml.Linq.XDocument``. That makes it easier to reuse established `.NET`
XML and document-processing libraries instead of inventing a separate runtime
tree shape.

Related pages
-------------

For family context and comparison, also see:

* :doc:`../concepts/overview`
* :doc:`../reference/implementation-matrix`
* :doc:`../mron/index`

.. toctree::
   :maxdepth: 2

   quick-start
   syntax
   cookbook
   cookbook-fragments
   cookbook-pages
