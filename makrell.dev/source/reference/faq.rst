FAQ
===

Is Makrell one language or several?
-----------------------------------

Makrell is a family. It includes programming-language implementations such as
MakrellPy, MakrellTS, and Makrell#, along with related formats such as MRON and
MRML.

What is shared across the family?
---------------------------------

The main shared layer is MBF, the Makrell Base Format, plus a broader family
model around structure, operators, quoting, macros, and related syntax ideas.

Which implementation should I start with?
-----------------------------------------

That depends on your goal:

* MakrellPy for a deep practical language implementation
* MakrellTS for the TypeScript and JavaScript track
* Makrell# for `.NET` and CLR integration
* MRON or MRML if you want to begin with the formats

The implementation matrix and the “choosing an implementation” tutorial are
good next stops if you are still unsure.

Are all implementations equally complete?
-----------------------------------------

No. The site tries to be clear about maturity and coverage differences rather
than hide them.

Where should I look for the most formal definitions?
----------------------------------------------------

Use the specifications under ``specs/`` in the repo for deeper normative detail.
Use the site sections to understand what is implemented and how to use it.

Why does the site talk about both shared concepts and implementation sections?
---------------------------------------------------------------------------

Because the family has both a common model and host-specific behaviour. You
usually need both views to understand the project properly.

Why are MRON and MRML documented alongside the language implementations?
-----------------------------------------------------------------------

Because they are part of the same family design. They are not isolated side
formats; they share structural ideas with the language tracks and help show how
the family model extends beyond general programming.

How should I use the site?
--------------------------

A practical route is:

* start with tutorials if you want a guided path
* use implementation sections if you already know your host ecosystem
* use reference pages when you need quick orientation or terminology
