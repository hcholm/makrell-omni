from __future__ import annotations

from dataclasses import fields, is_dataclass
from typing import Any

from makrell.ast import (
    BinOp,
    CurlyBrackets,
    Identifier,
    Node,
    Number,
    RoundBrackets,
    SquareBrackets,
    String,
)
from makrell.baseformat import operator_parse, src_to_baseformat
from makrell.parsing import python_value
from makrell.tokeniser import regular


def _matches_simple(value: Any, patt: Node) -> bool:
    if isinstance(patt, Identifier):
        if patt.value == "_":
            return True
        if patt.value == "true":
            return value is True
        if patt.value == "false":
            return value is False
        if patt.value == "null":
            return value is None
        return value == patt.value
    if isinstance(patt, Number):
        return value == python_value(patt)
    if isinstance(patt, String):
        return value == python_value(patt)
    if isinstance(patt, RoundBrackets):
        pns = operator_parse(regular(patt.nodes))
        if len(pns) == 0:
            return value is None
        if len(pns) == 1:
            return _matches_simple(value, pns[0])
        return any(_matches_simple(value, pn) for pn in pns)
    if isinstance(patt, CurlyBrackets):
        return match_regular_pattern(value, patt)
    if isinstance(patt, BinOp) and patt.op == "|":
        return _matches_simple(value, patt.left) or _matches_simple(value, patt.right)
    if isinstance(patt, BinOp) and patt.op == "=":
        # binding-compatible syntax: name=pattern
        return _matches_simple(value, patt.right)
    return False


def _node_to_dotted_name(n: Node) -> str | None:
    if isinstance(n, Identifier):
        return n.value
    if isinstance(n, BinOp) and n.op == ".":
        left = _node_to_dotted_name(n.left)
        right = _node_to_dotted_name(n.right)
        if left is None or right is None:
            return None
        return f"{left}.{right}"
    return None


def _matches_type_node(value: Any, type_node: Node) -> bool:
    dotted = _node_to_dotted_name(type_node)
    if dotted is None:
        return False

    builtin_types = {
        "int": int,
        "str": str,
        "float": float,
        "bool": bool,
        "list": list,
        "dict": dict,
        "tuple": tuple,
        "set": set,
        "object": object,
    }
    if dotted in builtin_types:
        return isinstance(value, builtin_types[dotted])

    for cls in type(value).__mro__:
        if cls.__name__ == dotted:
            return True
        qual = cls.__qualname__
        if qual == dotted:
            return True
        full = f"{cls.__module__}.{qual}"
        if full == dotted:
            return True
    return False


def _get_positional_fields(value: Any) -> list[str]:
    match_args = getattr(type(value), "__match_args__", None)
    if isinstance(match_args, (tuple, list)):
        names = [n for n in match_args if isinstance(n, str)]
        if len(names) == len(match_args):
            return names
    if is_dataclass(value):
        return [f.name for f in fields(value)]
    return []


def match_type_pattern(value: Any, pattern: Node) -> bool:
    if not isinstance(pattern, CurlyBrackets):
        return False
    pnodes = regular(pattern.nodes)
    if len(pnodes) < 2:
        return False
    if not isinstance(pnodes[0], Identifier) or pnodes[0].value != "$type":
        return False
    if not _matches_type_node(value, pnodes[1]):
        return False

    pos_nodes: list[Node] | None = None
    kw_nodes: list[BinOp] = []

    for extra in pnodes[2:]:
        if not isinstance(extra, SquareBrackets):
            return False
        parts = operator_parse(regular(extra.nodes))
        if len(parts) == 0:
            continue
        all_kw = all(isinstance(p, BinOp) and p.op == "=" for p in parts)
        any_kw = any(isinstance(p, BinOp) and p.op == "=" for p in parts)
        if any_kw and not all_kw:
            return False
        if all_kw:
            for p in parts:
                assert isinstance(p, BinOp)
                if not isinstance(p.left, Identifier):
                    return False
                kw_nodes.append(p)
        else:
            if pos_nodes is not None:
                return False
            pos_nodes = parts

    if pos_nodes is not None:
        field_names = _get_positional_fields(value)
        if len(field_names) < len(pos_nodes):
            return False
        for i, patt in enumerate(pos_nodes):
            field_name = field_names[i]
            if not hasattr(value, field_name):
                return False
            attr_value = getattr(value, field_name)
            if not _matches_simple(attr_value, patt):
                return False

    for p in kw_nodes:
        assert isinstance(p.left, Identifier)
        field_name = p.left.value
        if not hasattr(value, field_name):
            return False
        attr_value = getattr(value, field_name)
        if not _matches_simple(attr_value, p.right):
            return False

    return True


def _quant_bounds(qn: Node) -> tuple[int, int | None] | None:
    if isinstance(qn, RoundBrackets):
        qns = operator_parse(regular(qn.nodes))
        if len(qns) == 1:
            return _quant_bounds(qns[0])
    if isinstance(qn, Number):
        return int(float(qn.value)), int(float(qn.value))
    if isinstance(qn, Identifier):
        qv = qn.value[1:] if qn.value.startswith("$") else qn.value
        if qv == "maybe":
            return 0, 1
        if qv == "some":
            return 1, None
        if qv == "any":
            return 0, None
    if isinstance(qn, BinOp) and qn.op == "..":
        if isinstance(qn.left, Number) and isinstance(qn.right, Number):
            return int(float(qn.left.value)), int(float(qn.right.value))
    return None


def match_regular_pattern(value: Any, pattern: Node) -> bool:
    if not isinstance(value, list):
        return False
    if not isinstance(pattern, CurlyBrackets):
        return False

    pnodes = regular(pattern.nodes)
    if len(pnodes) == 0:
        return False
    if not isinstance(pnodes[0], Identifier) or pnodes[0].value != "$r":
        return False
    if len(pnodes) > 1:
        pnodes = [pnodes[0], *operator_parse(pnodes[1:])]

    def match_from(vi: int, i: int) -> bool:
        if i >= len(pnodes):
            return vi == len(value)

        pn = pnodes[i]
        if isinstance(pn, Identifier) and pn.value == "$rest":
            return True

        if isinstance(pn, BinOp) and pn.op == "*":
            bounds = _quant_bounds(pn.left)
            if bounds is None:
                return False
            min_count, max_count = bounds
            max_try = len(value) - vi if max_count is None else min(max_count, len(value) - vi)
            for count in range(min_count, max_try + 1):
                ok = True
                for k in range(count):
                    if not _matches_simple(value[vi + k], pn.right):
                        ok = False
                        break
                if ok and match_from(vi + count, i + 1):
                    return True
            return False

        if vi >= len(value):
            return False
        if not _matches_simple(value[vi], pn):
            return False
        return match_from(vi + 1, i + 1)

    return match_from(0, 1)


def match_regular_pattern_src(value: Any, pattern_src: str) -> bool:
    ns = regular(src_to_baseformat(pattern_src))
    if len(ns) != 1:
        return False
    return match_regular_pattern(value, ns[0])


def match_type_pattern_src(value: Any, pattern_src: str) -> bool:
    ns = regular(src_to_baseformat(pattern_src))
    if len(ns) != 1:
        return False
    return match_type_pattern(value, ns[0])
