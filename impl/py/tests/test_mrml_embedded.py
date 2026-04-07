from makrell.mrml import render_node_to_xml, render_src_to_xml
from makrell.makrellpy.compiler import eval_src


def test_parse_node_to_xml_exec_inserts_child_nodes():
    xml = eval_src("""
    {exec "from makrell.ast import CurlyBrackets, Identifier"}
    {import makrell.mrml@[render_node_to_xml]}

    child = {quote {p Body}}
    node = {quote
        {section
            {h1 Title}
            {$ child}
        }
    }

    {render_node_to_xml node}
    """)
    assert xml == "<section><h1>Title</h1><p>Body</p></section>"


def test_render_node_to_xml_uses_caller_scope():
    xml = eval_src("""
    {exec "from makrell.ast import CurlyBrackets, Identifier"}
    {import makrell.mrml@[render_node_to_xml]}

    title = "Scoped title"
    node = {quote
        {section
            {h1 {$ title}}
        }
    }

    {render_node_to_xml node}
    """)
    assert xml == "<section><h1>Scoped title</h1></section>"


def test_render_node_to_xml_handles_list_injection():
    xml = eval_src("""
    {exec "from makrell.ast import CurlyBrackets, Identifier"}
    {import makrell.mrml@[render_node_to_xml]}

    item1 = {quote {li One}}
    item2 = {quote {li Two}}
    items = []
    {items.append item1}
    {items.append item2}
    node = {quote
        {ul
            {$ items}
        }
    }

    {render_node_to_xml node}
    """)
    assert xml == "<ul><li>One</li><li>Two</li></ul>"


def test_render_src_to_xml_uses_caller_scope():
    xml = eval_src("""
    {import makrell.mrml@[render_src_to_xml]}

    title = "Scoped title"
    {render_src_to_xml "{section {h1 {$ title}}}"}
    """)
    assert xml == "<section><h1>Scoped title</h1></section>"


def test_render_src_to_xml_uses_caller_scope_in_attributes():
    xml = eval_src("""
    {import makrell.mrml@[render_src_to_xml]}

    href = "/hello"
    label = "Open"
    {render_src_to_xml "{nav {a [href={$ href}] {$ label}}}"}
    """)
    assert xml == '<nav><a href="/hello">Open</a></nav>'
