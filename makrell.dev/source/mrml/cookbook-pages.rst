Page Recipes
============

MRML is also a natural fit for page-like document structures. This page focuses
on examples that are larger than a fragment and already have the shape of a
document or page.

Recipe: a simple page shell
---------------------------

.. code-block:: makrell

    {page [lang="en"]
        {title "Makrell docs"}
        {section
            {h1 "Getting Started"}
            {p "Begin with the shared concepts section."}}}

This is the basic page-level pattern: a root page node with nested content
blocks inside it.

Recipe: nested sections
-----------------------

.. code-block:: makrell

    {page
        {hero
            {h1 Makrell}
            {p Compact structural markup.}}
        {section
            {h2 "Why it matters"}
            {p "MRML stays close to the same family model as Makrell code."}}}

This shows how page-shaped markup can stay readable even as the structure gets
deeper.

Recipe: page plus styled paragraph
----------------------------------

.. code-block:: makrell

    {page
        {title "Example"}
        {p [style="color: red"] Just some {b bold} text here.}}

This illustrates that page-level structure and inline markup can still mix
naturally inside the same tree.

Why page recipes matter
-----------------------

These examples show how MRML can scale from small fragments to full document
trees without changing its basic mental model.

They are most useful when you want:

* a page-shaped document tree
* generated page content
* a markup model that stays structurally close to the rest of the family

Related pages
-------------

For smaller reusable pieces, continue with:

* :doc:`cookbook-fragments`
* :doc:`../mrml/cookbook`
* :doc:`../tutorials/mrml-markup`
