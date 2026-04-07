from makrell.makrellpy.compiler import eval_src


def test_match_keeps_function_local_scope_in_branch_values():
    actual = eval_src("""
    {fun choose [path]
        {match path
            "/"
                path
            _ 
                "other"
        }
    }

    {choose "/"}
    """)

    assert actual == "/"


def test_match_keeps_function_local_scope_in_branch_calls():
    actual = eval_src("""
    {fun choose [path]
        prefix = "seen:"
        {match path
            "/health"
                prefix + path
            _
                "other"
        }
    }

    {choose "/health"}
    """)

    assert actual == "seen:/health"
