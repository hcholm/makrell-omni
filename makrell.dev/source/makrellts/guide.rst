Guide
=====

MakrellTS brings Makrell into the JavaScript and TypeScript ecosystem without giving
up the family feel.

Core themes
-----------

* expressions and calls
* collections and data flow
* interop with JavaScript and TypeScript APIs
* browser and Node.js usage
* macros and serialised compile-time definitions where applicable

Everyday MakrellTS shape
------------------------

MakrellTS aims to feel recognisably Makrell first, and JavaScript/TypeScript-aware
second.

That means the familiar family ideas should still be central:

.. code-block:: makrell

    a = 2
    b = a + 3
    [a b 5] | sum

    {fun add [x y]
      x + y}

    {match a
      2 "two"
      _ "other"}

In practice, MakrellTS becomes most interesting when these familiar Makrell forms can
be used while still fitting naturally into JS/TS projects.

TypeScript-oriented flavour
---------------------------

MakrellTS also explores a typed surface aligned with the TypeScript world.

Example:

.. code-block:: makrell

    Point = {class Point
      {fun __init__ [self x:number y:number]
        self.x = x
        self.y = y}}

    p:Point = {new Point [2 3]}

    mode:"option1" | "option2" = "option1"

Interop direction
-----------------

The real value of MakrellTS is not just that it can mimic family syntax. It is that
it can bring Makrell ideas into environments where people already work:

* Node.js tools
* browser runtimes
* TypeScript-heavy codebases
* module-based JavaScript workflows

This is why the docs for MakrellTS should eventually emphasise:

* running source through the CLI
* emitted JavaScript
* browser examples
* import and runtime model details

Practical next pages
--------------------

After this guide page, the most useful follow-ups are:

* :doc:`quick-start`
* :doc:`cookbook`
* :doc:`interop`
* :doc:`metaprogramming`
