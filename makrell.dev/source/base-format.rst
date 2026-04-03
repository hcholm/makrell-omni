Makrell Base Format (MBF)
=========================

All Makrell formats, including MakrellPy, MakrellPy macros, MRON and MRML, are based on the Makrell Base Format (MBF). MBF is inspired by Lisp S-expressions, but adds some extra features, notably binary operators and expressions. There are three conceptual levels in MBF:

Level 0: Tokens
^^^^^^^^^^^^^^^

The basic building blocks of MBF are tokens, which are sequences of characters. These are the types of tokens:

**Identifier:** A sequence of characters that does not contain whitespace or special characters. Examples: ``foo``, ``bar``, ``baz``.

**String:** A sequence of characters enclosed in double quotes. Examples: ``"Hello, world!"``, ``"foo"``.

**Number:** A sequence of digits, possibly with a decimal point and/or exponent. Examples: ``42``, ``3.14``, ``6.02e23``.

**Operator:** A sequence of characters that represent an operator. Examples: ``+``, ``-``, ``*``, ``/``.

**Whitespace:** A sequence of whitespace characters (space, tab, newline).

**Comment:** A sequence of characters that is ignored by the parser. Comments start with ``#`` and continue to the end of the line. Example: ``# This is a comment``.

**Other Token:** A sequence of characters that does not match any of the other token types.

Level 1: Lists
^^^^^^^^^^^^^^

At Level 1, tokens are grouped into lists. There are three types of lists:

**Round List:** A list of tokens enclosed in parentheses. Examples: ``(foo bar baz)``, ``(1 2 3)``.

**Square List:** A list of tokens enclosed in square brackets. Examples: ``[foo bar baz]``, ``[1 2 3]``.

**Curly List:** A list of tokens enclosed in curly braces. Examples: ``{foo bar baz}``, ``{1 2 3}``.

Level 2: Expressions
^^^^^^^^^^^^^^^^^^^^

Level 2 adds **binary expressions**, which are operators with two operands. A binary expression is a grouped sequence of an expression, an operator and an expression, separated by whitespace. Examples: ``2 + 3``, ``2 + 3``.

Operators have precedence and associativity, which determine the order in which they are evaluated. Operators with higher precedence are evaluated before operators with lower precedence. Operators with the same precedence are evaluated from left to right. These priorities are set by a hosting implementation such as MakrellPy.

With operator precedence and associativity, the "round lists" are used at parentheses to group expressions, like in common arithmetic expressions. Examples of arithmetic expressions in MakrellPy:

.. code-block:: makrell

    2 + 3               # 5

    2 * 3 + 5 * 7       # = 6 + 35 = 41, multiplication has higher precedence than addition

    2 * (3 + 5) * 7     # = 2 * 8 * 7 = 112, parentheses can be used to group expressions

Beyond MBF
^^^^^^^^^^

Hosting applications like MakrellPy can add more complex syntax on top of MBF, starting at any level. For instance, a Forth-like language could use only Level 0 tokens, while a Lisp-like language could use Level 1 lists.

