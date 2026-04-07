from makrell.makrellpy.compiler import eval_src
import re


def test_dollar_mrml_embeds_html_with_local_scope():
    actual = eval_src("""
    title = "Hello"
    {$mrml
        html [lang="en"]
            {body
                {h1 {$ title}}
            }
    }
    """)
    compact = re.sub(r'>\s+<', '><', actual).strip()
    assert compact == '<html lang="en"><body><h1>Hello</h1></body></html>'


def test_dollar_mron_embeds_data_with_local_scope():
    actual = eval_src("""
    a = 5
    doc = {$mron
        x 2
        y {$ a + 3}
    }
    [doc.x doc.y]
    """)
    assert actual == [2, 8]


def test_dollar_mrtd_embeds_tabular_data():
    actual = eval_src("""
    doc = {$mrtd
        name:string age:int
        Ada 32
        Ben 41
    }
    doc.records
    """)
    assert actual == [
        {"name": "Ada", "age": 32},
        {"name": "Ben", "age": 41},
    ]


def test_dollar_mrdt_alias_embeds_tabular_data():
    actual = eval_src("""
    doc = {$mrdt
        name:string age:int
        Ada 32
    }
    doc.records
    """)
    assert actual == [{"name": "Ada", "age": 32}]
