MRTD Quick Start
================

MRTD is a tabular format.

The first row is the header.
Every later row is data.
Cells are separated by whitespace rather than commas.

Basic example
-------------

.. code-block:: mrtd

    name:string age:int active:bool
    Ada 32 true
    "Rena Holm" 29 false

Header cells
------------

Each header cell is either:

* a field name
* or a field name with a type annotation like ``name:string``

The current core draft supports only these scalar types:

* ``int``
* ``float``
* ``bool``
* ``string``

Quoted names and values
-----------------------

Identifiers can be written without quotes:

.. code-block:: mrtd

    name city
    Ada Oslo

Anything that is not a valid identifier should be quoted:

.. code-block:: mrtd

    "full name":string city:string
    "Rena Holm" "Bergen sentrum"

Multiline rows
--------------

Rows can be wrapped in round brackets when they need to span multiple lines:

.. code-block:: mrtd

    name:string note:string score:float
    ( "Rena Holm"
      "line wrapped"
      13.5 )

Basic suffix profile
--------------------

The current MRTD core includes the shared basic suffix profile. That profile is
applied after MBF L1 parsing and gives a common meaning to standard suffixed
scalar nodes.

Examples:

.. code-block:: mrtd

    when bonus
    "2026-04-03"dt 3k

For the current spec version, MRTD implementations should treat this as part of
core conformance rather than as an optional toggle.

Implementation examples
-----------------------

Makrell#
^^^^^^^^

.. code-block:: csharp

    var rows = MrtdTyped.ReadRecords<Person>(
        """
        name:string age:int active:bool
        Ada 32 true
        Ben 41 false
        """);

.. code-block:: csharp

    var doc = MrtdParser.ParseSource(
        """
        when bonus
        "2026-04-03"dt 3k
        """);

MakrellPy
^^^^^^^^^

.. code-block:: python

    from makrell.mrtd import read_records

    rows = read_records("""
    name:string age:int active:bool
    Ada 32 true
    Ben 41 false
    """)

.. code-block:: python

    doc = parse_src("""
    when bonus
    "2026-04-03"dt 3k
    """)

MakrellTS
^^^^^^^^^

.. code-block:: ts

    import { parseMrtd, readMrtdRecords } from "makrellts";

    const rows = readMrtdRecords(`
    name:string age:int active:bool
    Ada 32 true
    Ben 41 false
    `);

.. code-block:: ts

    const doc = parseMrtd(`
    when bonus
    "2026-04-03"dt 3k
    `);

Where to go next
----------------

* the current draft spec in ``specs/mrtd-spec.md``
* :doc:`../reference/implementation-matrix`
* the MakrellPy, MakrellTS, and Makrell# implementation sections
