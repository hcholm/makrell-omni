import ast as py
from makrell.ast import (BinOp, CurlyBrackets, Identifier, Sequence, Node)
from makrell.baseformat import (ParseError, deparen)
from makrell.makrellpy._compiler_common import CompilerContext, stmt_wrap, transfer_pos
from makrell.tokeniser import regular
from makrell.parsing import (get_binop, get_square_brackets, get_identifier)
from .py_primitives import bin_ops, bool_ops, compare_ops
import makrell.makrellpy.pyast_builder as pb


def compile_binop(n: BinOp, cc: CompilerContext, compile_mr) -> py.AST | list[py.AST] | None:
    left = n.left
    right = n.right
    op = n.op

    # recurse through this
    def c(n: Node) -> py.expr:  # py.AST | list[py.AST] | None:
        pa = compile_mr(n, cc)
        if pa is not None:
            if isinstance(pa, list):
                for p in pa:
                    transfer_pos(n, p)
            else:
                transfer_pos(n, pa)
        return pa  # type: ignore

    def mr_binop(left: Node, op: str, right: Node) -> py.AST | list[py.AST] | None:

        if op in cc.meta.symbols:
            mop = cc.meta.symbols[op]  # lambda
            return pb.call(mop, [c(left), c(right)])

        match op:
            case "->":
                name = cc.gensym()
                if aid := get_identifier(left):
                    args = aid.value
                elif (asb := get_square_brackets(left)) != None:
                    args = [n.value for n in regular(asb.nodes)]
                else:
                    raise Exception(f"Invalid left side of ->: {left} {type(left)}")
                
                if isinstance(right, Sequence) and len(right.nodes) > 1 and get_identifier(right.nodes[0], "do"):
                    cc.push_fun_defs_scope()
                    rnodes = regular(right.nodes)
                    # body = stmt_wrap([c(n) for n in cc.operator_parse(rnodes[1:])])
                    stmts = stmt_wrap([c(n) for n in cc.operator_parse(rnodes[1:])])
                    fun_defs = cc.pop_fun_defs_scope()
                    body = fun_defs + stmts
                    f = pb.function_def(name, args, body)
                    cc.add_to_fun_defs_scope(f)
                    return pb.name_ld(name)
                else:
                    return pb.lambda_(args, c(right))

            case "@":
                right = deparen(right)
                if get_binop(right, ".."):
                    slice = c(right)
                    s = pb.subscript_ld(c(left), pb.slice(slice))
                else:
                    s = pb.subscript_ld(c(left), c(right))
                return s
            
            case "..":
                return pb.slice(c(left), c(right))
            
            case ".":
                return py.Attribute(c(left), right.value, py.Load())
            
            case "=":
                c_left = c(left)
                c_left.ctx = py.Store()
                return pb.assign([c_left], c(right))
            
            case "|":
                rewrite = CurlyBrackets([right, left])
                return c(rewrite)
            
            case "|*":
                values = c(left)
                f = c(right)
                return pb.call('map', [f, values])
            
            case "\\":
                rewrite = CurlyBrackets([left, right])
                return c(rewrite)
            
            case "*\\":
                values = c(right)
                f = c(left)
                return pb.call('map', [f, values])
            
            case "~=" | "!~=":
                py_value = c(left)
                py_pattern = c(cc.meta.quote(right))
                # call_func = py.Name("makrell.makrellpy.patmatch.match", py.Load())
                r = pb.call('match', [py_value, py_pattern])
                if op == "!~=":
                    r = pb.unaryop(pb.not_(), r)
                return r

            case _:
                return None

    def plus_with_string_coercion(left_node: Node, right_node: Node) -> py.expr:
        # Evaluate both sides once, then coerce to string only when one side is str.
        l_name = "__mr_l__"
        r_name = "__mr_r__"
        l_ref = py.Name(l_name, py.Load())
        r_ref = py.Name(r_name, py.Load())
        str_test = py.BoolOp(py.Or(), [
            py.Call(py.Name("isinstance", py.Load()), [l_ref, py.Name("str", py.Load())], []),
            py.Call(py.Name("isinstance", py.Load()), [r_ref, py.Name("str", py.Load())], []),
        ])
        string_add = py.BinOp(
            py.Call(py.Name("str", py.Load()), [l_ref], []),
            py.Add(),
            py.Call(py.Name("str", py.Load()), [r_ref], []),
        )
        normal_add = py.BinOp(l_ref, py.Add(), r_ref)
        body = py.IfExp(str_test, string_add, normal_add)
        lam = py.Lambda(
            py.arguments(args=[py.arg(l_name), py.arg(r_name)],
                         posonlyargs=[], kwonlyargs=[], kw_defaults=[], defaults=[]),
            body
        )
        return py.Call(lam, [c(left_node), c(right_node)], [])

    # python operator
    if op == "+":
        return plus_with_string_coercion(left, right)
    if op in bin_ops:
        return pb.binop(c(left), bin_ops[op], c(right))
    elif op in bool_ops:
        n._type = Identifier("bool")
        return pb.boolop(bool_ops[op], [c(left), c(right)])
    elif op in compare_ops:
        return pb.compare(c(left), [compare_ops[op]], [c(right)])
    elif op in cc.operators:
        # makrell operator
        return mr_binop(left, op, right)
    else:
        # ?
        r = mr_binop(left, op, right)
        if r:
            return r
        raise ParseError(f"Unknown operator: {op}")
