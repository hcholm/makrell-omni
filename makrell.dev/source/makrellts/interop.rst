Interop
=======

Interop is one of the most important reasons to use MakrellTS. The TypeScript
track is valuable when Makrell forms need to live inside ordinary JavaScript and
TypeScript projects rather than sitting apart from them.

This section should eventually document:

* JavaScript interop
* TypeScript-facing ergonomics
* browser APIs
* package and module workflows
* boundaries between Makrell semantics and JS/TS semantics

Practical environments include:

* Node.js CLI use
* Bun development workflows
* browser runtime execution
* browser compile/execute flows with isolated meta execution support

Representative direction
------------------------

MakrellTS interop is about fitting Makrell forms into JavaScript and TypeScript
projects rather than treating the language as isolated from the host ecosystem.

That means the important questions are often practical:

* how source is run or compiled
* how emitted JavaScript is inspected
* how browser-oriented workflows are supported
* how module/import models behave in different environments

Small example shape
-------------------

MakrellTS keeps the family syntax while targeting JS/TS-oriented usage:

.. code-block:: makrell

    {fun add [x y]
      x + y}

    add3 = {add 3 _}
    [2 5 8] | {map add3} | sum

How to use this page
--------------------

Use this page as a host-facing orientation page. If your main question is about
CLI workflow or browser workflow, the cookbook and tooling pages are often the
next practical stop.

Read this page together with
----------------------------

* :doc:`quick-start`
* :doc:`tooling`
* :doc:`cookbook-cli`
* :doc:`cookbook-browser`
