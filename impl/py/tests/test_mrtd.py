from datetime import date
from pathlib import Path
from makrell.mrtd import parse_src, read_records, read_tuples, write_records, write_tuples


FIXTURES = Path(__file__).resolve().parents[3] / "shared" / "format-fixtures"


def test_parse_src_reads_simple_tabular_data():
    doc = parse_src("""
    name:string age:int active:bool
    Ada 32 true
    "Rena Holm" 29 false
    """)

    assert doc.columns == [
        type(doc.columns[0])("name", "string"),
        type(doc.columns[1])("age", "int"),
        type(doc.columns[2])("active", "bool"),
    ]
    assert doc.records[1] == {
        "name": "Rena Holm",
        "age": 29,
        "active": False,
    }


def test_read_records_maps_rows_to_objects():
    class Person:
        def __init__(self):
            self.name = ""
            self.age = 0
            self.active = False

    rows = read_records("""
    name:string age:int active:bool
    Ada 32 true
    Ben 41 false
    """, Person)

    assert isinstance(rows[0], Person)
    assert rows[0].name == "Ada"
    assert rows[1].age == 41


def test_read_tuples_maps_rows_to_tuple_shape():
    rows = read_tuples("""
    id:int name:string score:float
    1 Ada 13.5
    2 Ben 9.25
    """, (int, str, float))

    assert rows == [
        (1, "Ada", 13.5),
        (2, "Ben", 9.25),
    ]


def test_parse_src_supports_multiline_rows():
    doc = parse_src("""
    name:string note:string score:float
    ( "Rena Holm"
      "line wrapped"
      13.5 )
    """)

    assert doc.records == [
        {
            "name": "Rena Holm",
            "note": "line wrapped",
            "score": 13.5,
        }
    ]


def test_parse_src_treats_identifiers_as_string_values_in_typed_and_untyped_cells():
    doc = parse_src("""
    name:string status note
    Ada active draft
    Ben inactive review
    """)

    assert doc.records == [
        {
            "name": "Ada",
            "status": "active",
            "note": "draft",
        },
        {
            "name": "Ben",
            "status": "inactive",
            "note": "review",
        },
    ]


def test_write_records_writes_header_and_rows():
    class Person:
        def __init__(self, name, age, active):
            self.name = name
            self.age = age
            self.active = active

    text = write_records([
        Person("Ada", 32, True),
        Person("Rena Holm", 29, False),
    ])

    assert "name:string age:int active:bool" in text
    assert "Ada 32 true" in text
    assert '"Rena Holm" 29 false' in text


def test_write_tuples_writes_tuple_rows_with_default_headers():
    text = write_tuples([
        (1, "Ada", 13.5),
        (2, "Ben", 9.25),
    ])

    assert "c1:int c2:string c3:float" in text
    assert "1 Ada 13.5" in text


def test_parse_src_accepts_suffixes_without_profile():
    doc = parse_src("""
    when bonus:float
    "2026-04-03"dt 3k
    """)

    assert str(doc.records[0]["when"]).startswith("2026-04-03")
    assert doc.records[0]["bonus"] == 3000


def test_write_records_writes_date_values_without_profile():
    text = write_records([
        {"when": date(2026, 4, 3), "active": True},
    ])

    assert 'when active:bool' in text
    assert '"2026-04-03"dt true' in text


def test_parse_src_rejects_hyphenated_barewords():
    try:
        parse_src("name:string\ntrailing-commas")
        assert False
    except ValueError:
        assert True


def test_parse_src_accepts_shared_block_comment_fixture():
    src = (FIXTURES / "conformance" / "mrtd" / "block-comments.mrtd").read_text(encoding="utf-8")
    doc = parse_src(src)

    assert doc.records == [
        {"name": "Ada", "status": "active", "note": "draft"},
        {"name": "Ben", "status": "inactive", "note": "review"},
    ]


def test_parse_src_accepts_shared_base_suffix_fixture():
    src = (FIXTURES / "conformance" / "mrtd" / "base-suffixes.mrtd").read_text(encoding="utf-8")
    doc = parse_src(src)

    assert str(doc.records[0]["when"]).startswith("2026-04-11")
    assert doc.records[0]["bits"] == 10
    assert doc.records[0]["octal"] == 15
    assert doc.records[0]["mask"] == 255
    assert doc.records[0]["bonus"] == 3000
    assert doc.records[0]["scale"] == 2_000_000
    assert abs(doc.records[0]["turn"] - 3.141592653589793) < 1e-12
    assert abs(doc.records[0]["angle"] - 3.141592653589793) < 1e-12
    assert abs(doc.records[0]["half"] - 1.5707963267948966) < 1e-12
