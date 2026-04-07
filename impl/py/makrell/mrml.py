import html
import inspect
import xml.etree.ElementTree as ET
from functools import lru_cache

from makrell.ast import BinOp, CurlyBrackets, Identifier, Node, Number, RoundBrackets, SquareBrackets, String
from makrell.baseformat import operator_parse, src_to_baseformat
from makrell.makrellpy.compiler import eval_nodes
from makrell.parsing import NodeReader, get_identifier
from makrell.tokeniser import regular


def node_str(n: Node) -> str:
    if isinstance(n, Identifier):
        return n.value
    if isinstance(n, String):
        return n.value[1:-1]
    return str(n)


def _node_text(value: Node) -> str:
    if isinstance(value, String):
        return value.value[1:-1]
    if isinstance(value, Number):
        return str(value.value) + str(value.suffix)
    if isinstance(value, Identifier):
        return value.value
    if isinstance(value, RoundBrackets):
        inner = "".join(node_str(n) for n in value.nodes)
        return "(" + inner + ")"
    return str(value)


@lru_cache(maxsize=1024)
def _parsed_root_from_src(src: str) -> Node:
    bp = regular(src_to_baseformat(src))
    return bp[0]


def _resolve_scope(globs: dict | None = None, locs: dict | None = None) -> tuple[dict, dict]:
    if globs is None or locs is None:
        frame = inspect.currentframe()
        assert frame is not None
        caller = frame.f_back
        while caller is not None and caller.f_globals.get("__name__") == __name__:
            caller = caller.f_back
        assert caller is not None
        if globs is None:
            globs = caller.f_globals
        if locs is None:
            locs = caller.f_locals
    return globs or {}, locs or {}


def parse_element(
    n: Node,
    parent: ET.Element | None = None,
    allow_exec: bool = False,
    globs={},
    locs={},
) -> ET.Element:
    if not isinstance(n, CurlyBrackets):
        raise Exception("Expected curly brackets at " + n.pos_str())
    if len(n.nodes) == 0:
        raise Exception("Empty curly brackets")

    reader = NodeReader(n.nodes)

    elem_name_node = reader.read()
    if isinstance(elem_name_node, Identifier):
        elem_name = elem_name_node.value
    elif isinstance(elem_name_node, String):
        elem_name = elem_name_node.value[1:-1]
    else:
        raise Exception("Expected identifier")

    if parent is not None:
        elem = ET.SubElement(parent, elem_name)
    else:
        elem = ET.Element(elem_name)
    reader.skip_whitespace()

    next_node = reader.peek()
    if isinstance(next_node, SquareBrackets):
        reader.read()
        attr_nodes = operator_parse(regular(next_node.nodes))
        for attr_node in attr_nodes:
            if not isinstance(attr_node, BinOp) and not attr_node.type == "=":
                raise Exception("Expected attribute")

            name = node_str(attr_node.left)
            ar = attr_node.right

            if isinstance(ar, CurlyBrackets):
                if allow_exec and len(ar.nodes) >= 1 and get_identifier(ar.nodes[0], "$"):
                    ns = regular(ar.nodes[1:])
                    value = str(eval_nodes(operator_parse(ns)[0], None, globals() | globs, locals() | locs))
                else:
                    raise Exception("Expected attribute value")
            else:
                value = node_str(ar)
            elem.attrib[name] = value

        reader.skip_whitespace()

    tail_holder = None

    def append_text(text: str):
        if tail_holder is not None:
            if tail_holder.tail:
                tail_holder.tail += text
            else:
                tail_holder.tail = text
        else:
            if elem.text:
                elem.text += text
            else:
                elem.text = text

    def append_runtime_value(value):
        nonlocal tail_holder
        if value is None:
            return
        if isinstance(value, ET.Element):
            elem.append(value)
            tail_holder = value
            return
        if isinstance(value, CurlyBrackets):
            tail_holder = parse_element(value, elem, allow_exec, globs, locs)
            return
        if isinstance(value, (list, tuple)):
            for item in value:
                append_runtime_value(item)
            return
        if isinstance(value, Identifier | String | Number | RoundBrackets | SquareBrackets):
            append_text(node_str(value))
            return
        if isinstance(value, Node):
            append_text(str(value))
            return
        append_text(str(value))

    while reader.has_more:
        next_node = reader.read()

        if isinstance(next_node, (list, tuple)):
            append_runtime_value(next_node)
            continue

        if isinstance(next_node, CurlyBrackets):
            if allow_exec and len(next_node.nodes) >= 1 and get_identifier(next_node.nodes[0], "$"):
                ns = regular(next_node.nodes[1:])
                r = eval_nodes(operator_parse(ns)[0], None, globals() | globs, locals() | locs)
                append_runtime_value(r)
            else:
                tail_holder = parse_element(next_node, elem, allow_exec, globs, locs)
        else:
            append_text(_node_text(next_node))

    return elem


def _render_runtime_value_to_chunks(value, out: list[str], allow_exec: bool, globs: dict, locs: dict):
    if value is None:
        return
    if isinstance(value, ET.Element):
        out.append(ET.tostring(value, encoding="unicode"))
        return
    if isinstance(value, CurlyBrackets):
        _render_element_to_chunks(value, out, allow_exec, globs, locs)
        return
    if isinstance(value, (list, tuple)):
        for item in value:
            _render_runtime_value_to_chunks(item, out, allow_exec, globs, locs)
        return
    if isinstance(value, Identifier | String | Number | RoundBrackets | SquareBrackets):
        out.append(html.escape(node_str(value), quote=False))
        return
    if isinstance(value, Node):
        out.append(html.escape(str(value), quote=False))
        return
    out.append(html.escape(str(value), quote=False))


HTML_VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}


def _render_element_to_chunks(
    n: Node,
    out: list[str],
    allow_exec: bool,
    globs: dict,
    locs: dict,
    html_mode: bool = False,
):
    if not isinstance(n, CurlyBrackets):
        raise Exception("Expected curly brackets at " + n.pos_str())
    if len(n.nodes) == 0:
        raise Exception("Empty curly brackets")

    reader = NodeReader(n.nodes)
    elem_name_node = reader.read()
    if isinstance(elem_name_node, Identifier):
        elem_name = elem_name_node.value
    elif isinstance(elem_name_node, String):
        elem_name = elem_name_node.value[1:-1]
    else:
        raise Exception("Expected identifier")

    out.append("<")
    out.append(elem_name)
    reader.skip_whitespace()

    next_node = reader.peek()
    if isinstance(next_node, SquareBrackets):
        reader.read()
        attr_nodes = operator_parse(regular(next_node.nodes))
        for attr_node in attr_nodes:
            if not isinstance(attr_node, BinOp) and not attr_node.type == "=":
                raise Exception("Expected attribute")
            name = node_str(attr_node.left)
            ar = attr_node.right
            if isinstance(ar, CurlyBrackets):
                if allow_exec and len(ar.nodes) >= 1 and get_identifier(ar.nodes[0], "$"):
                    ns = regular(ar.nodes[1:])
                    value = str(eval_nodes(operator_parse(ns)[0], None, globals() | globs, locals() | locs))
                else:
                    raise Exception("Expected attribute value")
            else:
                value = node_str(ar)
            out.append(" ")
            out.append(name)
            out.append('="')
            out.append(html.escape(value, quote=True))
            out.append('"')
        reader.skip_whitespace()

    children: list[str] = []
    while reader.has_more:
        next_node = reader.read()
        if isinstance(next_node, (list, tuple)):
            _render_runtime_value_to_chunks(next_node, children, allow_exec, globs, locs)
            continue

        if isinstance(next_node, CurlyBrackets):
            if allow_exec and len(next_node.nodes) >= 1 and get_identifier(next_node.nodes[0], "$"):
                ns = regular(next_node.nodes[1:])
                r = eval_nodes(operator_parse(ns)[0], None, globals() | globs, locals() | locs)
                _render_runtime_value_to_chunks(r, children, allow_exec, globs, locs)
            else:
                _render_element_to_chunks(next_node, children, allow_exec, globs, locs, html_mode)
        else:
            children.append(html.escape(_node_text(next_node), quote=False))

    if len(children) == 0:
        if html_mode and elem_name not in HTML_VOID_TAGS:
            out.append("></")
            out.append(elem_name)
            out.append(">")
            return
        out.append(" />")
        return

    out.append(">")
    out.extend(children)
    out.append("</")
    out.append(elem_name)
    out.append(">")


def parse(src: str, allow_exec: bool = False) -> ET.Element:
    return parse_element(_parsed_root_from_src(src), None, allow_exec)


def parse_to_xml(src: str, allow_exec: bool = False) -> str:
    return parse_node_to_xml(_parsed_root_from_src(src), allow_exec)


def render_src_to_element(
    src: str,
    allow_exec: bool = True,
    globs: dict | None = None,
    locs: dict | None = None,
) -> ET.Element:
    resolved_globs, resolved_locs = _resolve_scope(globs, locs)
    return parse_element(_parsed_root_from_src(src), None, allow_exec, resolved_globs, resolved_locs)


def render_src_to_xml(
    src: str,
    allow_exec: bool = True,
    globs: dict | None = None,
    locs: dict | None = None,
) -> str:
    resolved_globs, resolved_locs = _resolve_scope(globs, locs)
    return render_node_to_xml(_parsed_root_from_src(src), allow_exec, resolved_globs, resolved_locs)


def parse_node(
    node: Node,
    allow_exec: bool = False,
    globs: dict | None = None,
    locs: dict | None = None,
) -> ET.Element:
    return parse_element(node, None, allow_exec, globs or {}, locs or {})


def parse_node_to_xml(
    node: Node,
    allow_exec: bool = False,
    globs: dict | None = None,
    locs: dict | None = None,
) -> str:
    out: list[str] = []
    _render_element_to_chunks(node, out, allow_exec, globs or {}, locs or {}, False)
    return "".join(out)


def render_node_to_xml(
    node: Node,
    allow_exec: bool = True,
    globs: dict | None = None,
    locs: dict | None = None,
) -> str:
    resolved_globs, resolved_locs = _resolve_scope(globs, locs)
    return parse_node_to_xml(node, allow_exec, resolved_globs, resolved_locs)


def render_src_to_html_fast(
    src: str,
    allow_exec: bool = True,
    globs: dict | None = None,
    locs: dict | None = None,
) -> str:
    resolved_globs, resolved_locs = _resolve_scope(globs, locs)
    return render_node_to_html_fast(_parsed_root_from_src(src), allow_exec, resolved_globs, resolved_locs)


def render_node_to_html_fast(
    node: Node,
    allow_exec: bool = True,
    globs: dict | None = None,
    locs: dict | None = None,
) -> str:
    resolved_globs, resolved_locs = _resolve_scope(globs, locs)
    out: list[str] = []
    _render_element_to_chunks(node, out, allow_exec, resolved_globs, resolved_locs, True)
    return "".join(out)
