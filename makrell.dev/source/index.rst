.. image:: /_static/makrell.png
    :alt: Makrell
    :align: center
    :width: 200

Makrell
=======

Makrell is a family of languages and formats built around a shared structural core.
It combines compact syntax, functional flow, metaprogramming, structured data, and
markup in one coherent ecosystem.

If most language projects force you to choose between code, data, markup, and host
ecosystem fit, Makrell is trying to make those pieces belong to the same world.

The family currently centres on:

* **MakrellPy**, the Python-hosted implementation with the deepest language support.
* **MakrellTS**, the TypeScript and JavaScript-hosted track.
* **Makrell#**, the .NET-hosted implementation for CLR interop, compile/load workflows, and tooling.
* **MRON**, a Makrell-shaped alternative to JSON.
* **MRML**, a Makrell-shaped alternative to XML and HTML.
* **MBF** (Makrell Base Format), the shared structural foundation underneath the family.

Makrell is useful when you want more than one thing at once:

* one structural model across code, data, and markup
* concise functional and operator-oriented syntax
* pattern matching and metaprogramming
* embedded mini-languages
* multiple host ecosystems without giving up a family identity

What you can do here
--------------------

Use this site in the way that matches your goal:

* learn the shared ideas first in :doc:`concepts/index`
* start building immediately in :doc:`makrellpy/index`, :doc:`makrellts/index`, or :doc:`makrellsharp/index`
* explore formats directly in :doc:`mron/index` and :doc:`mrml/index`
* learn by example in :doc:`tutorials/index`
* solve concrete problems in :doc:`cookbook/index`

Quick Taste
-----------

Makrell-style code
^^^^^^^^^^^^^^^^^^

.. code-block:: makrell

    {fun add [x y]
        x + y}

    add3 = {add 3 _}

    [2 5 8] | {map add3} | sum

MRON
^^^^

.. code-block:: makrell

    owner "Rena Holm"
    tools ["MakrellPy" "Makrell#" "MakrellTS"]
    features {
        macros true
        pattern_matching true
    }

MRML
^^^^

.. code-block:: makrell

    {page
        {hero
            {h1 Makrell}
            {p One family for code, data, and markup.}}
        {section [class="features"]
            {card {h2 Functional} {p Pipes, operators, and composition.}}
            {card {h2 Metaprogrammable} {p Quote, unquote, macros, and mini-languages.}}
            {card {h2 Multi-host} {p Python, TypeScript, and .NET implementations.}}}
    }

Start Here
----------

* :doc:`getting-started`
* :doc:`concepts/index`
* :doc:`makrellpy/index`
* :doc:`makrellts/index`
* :doc:`makrellsharp/index`
* :doc:`mron/index`
* :doc:`mrml/index`
* :doc:`mbf/index`
* :doc:`cookbook/index`
* :doc:`tutorials/index`
* :doc:`reference/index`

Popular Paths
-------------

* Want the broadest current language experience? Start with :doc:`makrellpy/index`.
* Want the TypeScript reference track? Go to :doc:`makrellts/index`.
* Want CLR interop and `.NET` workflows? Go to :doc:`makrellsharp/index`.
* Want a compact data format? Start with :doc:`mron/index`.
* Want compact structural markup? Start with :doc:`mrml/index`.

Why Makrell?
------------

Makrell is not just another syntax for one runtime. The central idea is that the
same structural model can carry:

* a programming language
* a data notation
* a markup notation
* macros and embedded mini-languages
* similar idioms across multiple host ecosystems

That makes Makrell useful both as a practical tool and as a language-design platform.

It also makes Makrell feel different from projects that are only:

* a syntax experiment
* a host-language wrapper
* a data format with no language story
* a macro system with no broader family structure

Implementation Picture
----------------------

The Makrell family is developing across multiple implementations. They do not all
have the same maturity, but they share the same direction:

* **MakrellPy**: currently the broadest language implementation and the deepest reference point.
* **MakrellTS**: the JavaScript and TypeScript track, important for browser and Node.js integration.
* **Makrell#**: the CLR and .NET track, with growing support for interop, macros, dynamic loading, MRON, and MRML.

The shared concepts pages explain what belongs to the family as a whole.
Each implementation section explains what is available in that host today.

.. toctree::
   :hidden:
   :maxdepth: 2

   getting-started
   concepts/index
   makrellpy/index
   makrellts/index
   makrellsharp/index
   mron/index
   mrml/index
   mbf/index
   cookbook/index
   tutorials/index
   reference/index
