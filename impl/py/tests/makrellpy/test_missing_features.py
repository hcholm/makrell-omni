from makrell.makrellpy.compiler import eval_src


def test_user_defined_suffixes() -> None:
    src = """
    {def intsuffix triple [s] -> ({int s} * 3)}
    {def floatsuffix half [s] -> ({float s} / 2)}
    {def strsuffix up [s] -> {s.upper}}
    [4triple 10.0half "ab"up]
    """
    actual = eval_src(src)
    assert actual == [12, 5.0, "AB"]


def test_user_defined_pattern() -> None:
    src = """
    {def pattern odd
        [p] -> ({isinstance p Identifier} && p.value == "odd")
        [tv p next] -> [{quote
            {do
                {when {not {isinstance {$ tv} int}}
                    {return false}}
                ({$ tv} % 2) == 1
            }} []]}

    {match 7
        odd
            "odd"
        _
            "other"
    }
    """
    actual = eval_src(src)
    assert actual == "odd"


def test_meta_dotted_call() -> None:
    src = """
    {meta
        {class Tool []
            {fun expand [self ns]
                {quote 99}
            }
        }
        tool = {Tool}
    }
    {tool.expand}
    """
    actual = eval_src(src)
    assert actual == 99
