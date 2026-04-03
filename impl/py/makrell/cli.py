import os
import json
import re
import sys

here_dir = os.path.dirname(os.path.realpath(__file__))
root_dir = os.path.join(here_dir, "..", "..")
sys.path.append(root_dir)

import importlib
from makrell.baseformat import src_to_baseformat
from makrell.parsing import Diagnostics
from makrell.tokeniser import regular
from makrell.makrellpy._compile import compile_mr
from makrell.makrellpy.compiler import exec_file, eval_src, nodes_to_module
from makrell.makrellpy._compiler_common import CompilerContext
import makrell.makrellpy.repl as repl
import makrell


def print_help():
    print("usage: makrell [-h] [-m] [-c CODE] [FILE]")
    print("       makrell check FILE [--json]")


def _node_range(node):
    if node is None:
        return None

    start_line = getattr(node, "_start_line", 0) or 1
    start_column = getattr(node, "_start_column", 0) or 1
    end_line = getattr(node, "_end_line", 0) or start_line
    end_column = getattr(node, "_end_column", 0) or start_column
    return {
        "start": {"line": start_line, "column": start_column},
        "end": {"line": end_line, "column": end_column},
    }


def _diagnostic_to_dict(item, phase):
    return {
        "phase": phase,
        "code": item.code,
        "message": item.message,
        "severity": item.severity.name.lower(),
        "range": _node_range(item.node),
    }


def _generic_diagnostic(message, phase="compile"):
    range_match = re.search(r"at\s+(\d+):(\d+)", message)
    range_ = None
    if range_match:
        line = int(range_match.group(1))
        column = int(range_match.group(2))
        range_ = {
            "start": {"line": line, "column": column},
            "end": {"line": line, "column": column},
        }

    return {
        "phase": phase,
        "code": None,
        "message": message,
        "severity": "error",
        "range": range_,
    }


def check_src(text: str):
    parse_diag = Diagnostics()
    parsed = src_to_baseformat(text, parse_diag)
    diagnostics = [_diagnostic_to_dict(item, "baseformat") for item in parse_diag.items]
    if parse_diag.has_errors():
        return diagnostics

    cc = CompilerContext(compile_mr)
    try:
        nodes_to_module(regular(parsed), cc=cc)
    except Exception as ex:
        if cc.diag.items:
            diagnostics.extend(_diagnostic_to_dict(item, "compile") for item in cc.diag.items)
        else:
            diagnostics.append(_generic_diagnostic(str(ex)))
        return diagnostics

    diagnostics.extend(_diagnostic_to_dict(item, "compile") for item in cc.diag.items)
    return diagnostics


def check_file(path: str, as_json: bool = False):
    with open(path, encoding="utf-8") as f:
        diagnostics = check_src(f.read())
    ok = len([d for d in diagnostics if d["severity"] == "error"]) == 0

    if as_json:
        print(json.dumps({"ok": ok, "diagnostics": diagnostics}, indent=2))
    elif ok:
        print("OK")
    else:
        for item in diagnostics:
            start = item["range"]["start"] if item["range"] else None
            where = f" {start['line']}:{start['column']}" if start else ""
            code = f" {item['code']}" if item["code"] is not None else ""
            print(f"{item['severity']}{where}{code} {item['message']}")

    return 0 if ok else 1


def main():
    args = sys.argv[1:]

    if len(args) == 0:
        repl.run()
        return
    
    if args[0] == "-m" and len(args) == 2:
        sys.path.append('.')
        print("importlib.import_module", args[1])
        importlib.import_module(args[1])
        return
    
    if args[0] == "-c" and len(args) == 2:
        r = eval_src(args[1])
        if r is not None:
            print(r)
        return
    
    if args[0] == "-h" or args[0] == "--help":
        print_help()
        return

    if args[0] == "-v" or args[0] == "--version":
        print(f"Makrell: {makrell.__version__}")
        return

    if args[0] == "check" and len(args) in [2, 3]:
        as_json = len(args) == 3 and args[2] == "--json"
        if len(args) == 3 and not as_json:
            print_help()
            sys.exit(1)
        sys.exit(check_file(args[1], as_json))
    
    if len(args) == 1:
        exec_file(args[0])
        return
    
    print_help()


if __name__ == '__main__':
    main()
