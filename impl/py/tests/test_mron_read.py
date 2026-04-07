from pathlib import Path

from makrell.mron import read_file, read_src


def test_read_src_returns_plain_python_data():
    doc = read_src("""
    title "Hello"
    tags ["a" "b"]
    meta {
        count 3
    }
    """)

    assert doc == {
        "title": "Hello",
        "tags": ["a", "b"],
        "meta": {"count": 3},
    }


def test_read_file_returns_plain_python_data(tmp_path: Path):
    path = tmp_path / "sample.mron"
    path.write_text('name "Hugrell"\nport 8096\n', encoding="utf-8")

    doc = read_file(str(path))

    assert doc == {
        "name": "Hugrell",
        "port": 8096,
    }
