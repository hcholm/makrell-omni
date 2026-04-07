import re
import inspect
from typing import Any
from makrell.ast import Identifier, Number, Sequence, SquareBrackets, CurlyBrackets, Node, String
from makrell.makrellpy.compiler import eval_nodes
import makrell.baseformat as mp
from makrell.tokeniser import regular
from makrell.parsing import get_identifier, python_value, pairwise


class MronObject:
    def __init__(self, data: dict[str, Any]):
        self._data = data

    def __getattr__(self, name: str) -> Any:
        return self._data[name]

    def __getitem__(self, name: str) -> Any:
        return self._data[name]

    def __str__(self) -> str:
        return str(self._data)

    def __repr__(self) -> str:
        return repr(self._data)
    
    def __iter__(self):
        return iter(self._data)
    
    def __eq__(self, other: object) -> bool:
        if isinstance(other, MronObject):
            return self._data == other._data
        if isinstance(other, dict):
            return self._data == other
        return False


rx_int = re.compile(r'^-?\d+$')


def to_plain_dict(m: dict[str, Any]) -> dict[str, Any]:
    return {k: to_plain(v) for k, v in m.items()}


def to_plain(v: Any) -> Any:
    if hasattr(v, "_data"):
        return to_plain_dict(v._data)
    if isinstance(v, dict):
        return to_plain_dict(v)
    if isinstance(v, list):
        return [to_plain(item) for item in v]
    return v


def parse_token(n: Node, allow_exec: bool = False,
                globs: dict | None = None, locs: dict | None = None) -> Any:
    if isinstance(n, Identifier):
        return n.value
    elif isinstance(n, String):
        return python_value(n)
    elif isinstance(n, Number):
        return python_value(n)
    elif isinstance(n, CurlyBrackets):
        if allow_exec and len(n.nodes) >= 2 and get_identifier(n.nodes[0], "$"):
            r = eval_nodes(mp.operator_parse(n.nodes[1:])[0], None, globals() | (globs or {}), locals() | (locs or {}))
            return r
        return parse_token_pairs(regular(n.nodes), allow_exec, globs, locs)
    elif isinstance(n, SquareBrackets):
        return [parse_token(ni, allow_exec, globs, locs) for ni in regular(n.nodes)]
    elif isinstance(n, Sequence):
        return parse_token_pairs(regular(n.nodes), allow_exec, globs, locs)
    else:
        raise Exception(f"Unknown node type: {type(n)}")
    

def parse_token_pairs(ns: list[Node], allow_exec: bool = False,
                      globs: dict | None = None, locs: dict | None = None) -> MronObject:
    pairs = pairwise(ns)
    d = {
        parse_token(k, allow_exec, globs, locs): parse_token(v, allow_exec, globs, locs)
        for k, v in pairs
    }
    return MronObject(d)


def parse_nodes(ns: list[Node], allow_exec: bool = False,
                globs: dict | None = None, locs: dict | None = None) -> MronObject | Any:
    if len(ns) == 0:
        return None
    if len(ns) == 1:
        v = parse_token(ns[0], allow_exec, globs, locs)
        return v
    if len(ns) % 2 == 0:
        return parse_token_pairs(ns, allow_exec, globs, locs)


def parse_src(text: str, allow_exec: bool = False,
              globs: dict | None = None, locs: dict | None = None) -> MronObject | Any:
    tokens = regular(mp.src_to_tokens(text))
    ns = mp.nodes_to_baseformat(tokens)
    if len(ns) == 0:
        return None
    if len(ns) == 1:
        v = parse_token(ns[0], allow_exec, globs, locs)
        return v
    if len(ns) % 2 == 0:
        return parse_token_pairs(ns, allow_exec, globs, locs)
    raise Exception(f"Illegal number ({len(ns)}) of root level expressions")


def parse_file(path: str, allow_exec: bool = False) -> MronObject | Any:
    with open(path, encoding='utf-8') as f:
        src = f.read()
        return parse_src(src, allow_exec)


def read_src(text: str, allow_exec: bool = False,
             globs: dict | None = None, locs: dict | None = None) -> Any:
    return to_plain(parse_src(text, allow_exec, globs, locs))


def read_file(path: str, allow_exec: bool = False) -> Any:
    return to_plain(parse_file(path, allow_exec))


def render_src(text: str, allow_exec: bool = True,
               globs: dict | None = None, locs: dict | None = None) -> MronObject | Any:
    if globs is None or locs is None:
        frame = inspect.currentframe()
        assert frame is not None
        caller = frame.f_back
        assert caller is not None
        if globs is None:
            globs = caller.f_globals
        if locs is None:
            locs = caller.f_locals
    return parse_src(text, allow_exec, globs, locs)
