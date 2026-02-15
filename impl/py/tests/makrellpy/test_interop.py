
from makrell.makrellpy.compiler import eval_src


def test_import_stdlib_module():
    src = """
    {import math}
    {math.sqrt 9}
    """
    res = eval_src(src)
    assert res == 3.0


def test_import_local_python_module():
    src = """
    {import sys}
    {sys.path.append "tests/makrellpy"}
    {import interop1}
    {interop1.add 2 3}
    """
    res = eval_src(src)
    assert res == 5
