from datetime import datetime
from makrell.mron import parse_src


def test_empty():
    src = "  "
    v = parse_src(src)
    assert v is None


def test_scalars():
    src = " 2 "
    v = parse_src(src)
    assert v == 2

    src = " Makrell "
    v = parse_src(src)
    assert v == "Makrell"


def test_illegal_syntax():
    src = "2 3 5"
    try:
        parse_src(src)
        assert False
    except Exception as e:
        assert str(e) == "Illegal number (3) of root level expressions"


def test_array():
    src = "[]"
    v = parse_src(src)
    assert v == []

    src = "[2 3 5]"
    v = parse_src(src)
    assert v == [2, 3, 5]

    src = "a [2 3 \"æ\"]"
    v = parse_src(src)
    assert v == {"a": [2, 3, "æ"]}


def test_simple():
    src = "a 2 b 3"
    v = parse_src(src)
    assert v == {"a": 2, "b": 3}


def test_nested():
    src = "a { b 2 }"
    v = parse_src(src)
    assert v == {"a": {"b": 2}}


def test_complex1():
    src = """
        f {
            g [2]
            h "asd"
        }
    """
    actual = parse_src(src)
    excpected = {
        "f": {
            "g": [2],
            "h": "asd"
        },
    }
    print(actual)
    assert actual == excpected


def test_complex2obj():
    src = """
    a 2
    b [3 5 "7"]
    c {
        "d x" 11
        "e æ" 13.17
        f {
            g []
            h "asd"
            ø2 qweÆØÅ
            生年月日 "1996-05-12"dt
        }
    }
    """
    obj = parse_src(src)
    assert obj.a == 2
    assert obj.b == [3, 5, "7"]
    assert obj.c['d x'] == 11
    assert obj.c.f.生年月日 == datetime.fromisoformat("1996-05-12")


def test_complex2():
    src = """
    a 2
    b [3 5 "7"]
    c {
        "d x" 11
        "e æ" 13.17
        f {
            g []
            h "asd"
            ø2 qweÆØÅ
            生年月日 "1996-05-12"dt
        }
    }
    """
    actual = parse_src(src)
    expected = {
        "a": 2,
        "b": [3, 5, "7"],
        "c": {
            "d x": 11,
            "e æ": 13.17,
            "f": {
                "g": [],
                "h": "asd",
                "ø2": "qweÆØÅ",
                "生年月日": datetime.fromisoformat("1996-05-12"),
            },
        },
    }
    assert actual == expected


def test_identifiers_are_string_values_everywhere():
    src = """
    title Makrell
    tags [alpha beta gamma]
    nested {
        kind article
        status draft
    }
    """
    actual = parse_src(src)
    expected = {
        "title": "Makrell",
        "tags": ["alpha", "beta", "gamma"],
        "nested": {
            "kind": "article",
            "status": "draft",
        },
    }
    assert actual == expected


def test_dates():
    src = """
    生年月日 "1996-05-12"dt
    Født    "1996-05-12 13:47"dt
    """
    actual = parse_src(src)
    expected = {
        "生年月日": datetime.fromisoformat("1996-05-12"),
        "Født": datetime.fromisoformat("1996-05-12 13:47"),
    }
    assert actual == expected


def test_exec():
    src = """
    a 2
    b {$ 2 + 3 }
    """
    actual = parse_src(src, allow_exec=True)
    expected = {
        "a": 2,
        "b": 5,
    }
    assert actual == expected


def test_hyphenated_barewords_are_not_identifiers():
    try:
        parse_src("name trailing-commas")
        assert False
    except Exception:
        assert True
