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

Profiles
--------

The MRTD core does not include suffix extensions. If an implementation supports
extra suffixes, they should be exposed through named profiles rather than being
accepted silently in core mode.

The current profile experiment is ``extended-scalars``. That profile allows
examples such as:

.. code-block:: mrtd

    when bonus
    "2026-04-03"dt 3k

Profile activation is intended to be composable. An implementation may enable
more than one named profile at once.

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
        """,
        new MrtdParseOptions
        {
            Profiles = new HashSet<string>(StringComparer.Ordinal)
            {
                MrtdProfiles.ExtendedScalars,
            },
        });

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
    """, profiles=("extended-scalars",))

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
    `, { profiles: ["extended-scalars"] });

Where to go next
----------------

* the current draft spec in ``specs/mrtd-spec.md``
* :doc:`../reference/implementation-matrix`
* the MakrellPy, MakrellTS, and Makrell# implementation sections
