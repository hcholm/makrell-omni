Parsing Model
=============

The MBF parsing model is one of the most important shared ideas in the project.

At a high level, the parsing model can be understood as a layered process:

1. tokenisation
2. bracket parsing
3. operator parsing
4. regularisation or structural cleanup
5. optional preservation of original source-sensitive details

Layer 1: tokenisation
---------------------

The source is first broken into tokens such as:

* identifiers
* strings
* numbers
* bracket tokens
* operator tokens

Layer 2: bracket parsing
------------------------

Bracketed forms are then assembled into structural nodes.
This is where the family gets one of its most recognisable properties: code, data,
and markup can all be represented in closely related structural shapes.

Layer 3: operator parsing
-------------------------

Binary operators are then interpreted with precedence and associativity rules.
This is what lets MBF support concise infix structure while still remaining
structural rather than purely textual.

Layer 4: regularisation
-----------------------

Some consumers want a cleaned-up structural view of the parsed source.
Regularisation is the step where the tree is made easier to work with in ordinary
language processing.

Layer 5: source-preserving modes
--------------------------------

Some parts of the family need more than a simplified tree.
Macros and embedded sublanguages may need access to source-shaped nodes, including
whitespace-sensitive structure.

That is why MBF parsing is not only about producing a convenient tree. It is also
about preserving enough information for language extension and embedding.

Why this matters
----------------

The parsing model is one of the reasons the Makrell family can support:

* programming-language implementations
* MRON
* MRML
* macros
* embedded mini-languages
