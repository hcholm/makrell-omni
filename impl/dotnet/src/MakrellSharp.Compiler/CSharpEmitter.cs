using System.Text;
using MakrellSharp.Ast;

namespace MakrellSharp.Compiler;

internal static class CSharpEmitter
{
    public static string EmitModule(IReadOnlyList<Node> nodes)
    {
        var state = new EmitterState();
        var body = EmitBlock(nodes, state, autoReturn: true, indentLevel: 2);

        return
            """
            using System;

            public static class __MakrellModule
            {
                public static dynamic Run()
                {
            """
            + body +
            """
                }
            }
            """;
    }

    private static string EmitBlock(IReadOnlyList<Node> nodes, EmitterState state, bool autoReturn, int indentLevel)
    {
        var lines = new List<string>();
        for (var i = 0; i < nodes.Count; i += 1)
        {
            var isLast = autoReturn && i == nodes.Count - 1;
            var emitted = EmitStatement(nodes[i], state, isLast, indentLevel);
            if (!string.IsNullOrWhiteSpace(emitted))
            {
                lines.Add(emitted);
            }
        }

        if (lines.Count == 0 && autoReturn)
        {
            lines.Add($"{Indent(indentLevel)}return null;");
        }

        return string.Join(Environment.NewLine, lines) + Environment.NewLine;
    }

    private static string EmitStatement(Node node, EmitterState state, bool isLast, int indentLevel)
    {
        if (TryEmitNamedFunction(node, state, isLast, indentLevel, out var functionStatement))
        {
            return functionStatement;
        }

        if (node is BinOpNode { Operator: "=" } assignment && assignment.Left is IdentifierNode identifier)
        {
            var rhs = EmitExpression(assignment.Right, state);
            var declared = state.Declare(identifier.Value);
            var prefix = declared ? "dynamic " : string.Empty;
            var assign = $"{Indent(indentLevel)}{prefix}{identifier.Value} = {rhs};";
            return isLast
                ? assign + Environment.NewLine + $"{Indent(indentLevel)}return {identifier.Value};"
                : assign;
        }

        if (node is CurlyBracketsNode curly
            && curly.Nodes.Count > 0
            && curly.Nodes[0] is IdentifierNode { Value: "return" })
        {
            var value = curly.Nodes.Count > 1 ? EmitExpression(curly.Nodes[1], state) : "null";
            return $"{Indent(indentLevel)}return {value};";
        }

        var expr = EmitExpression(node, state);
        return isLast
            ? $"{Indent(indentLevel)}return {expr};"
            : $"{Indent(indentLevel)}_ = {expr};";
    }

    private static bool TryEmitNamedFunction(Node node, EmitterState state, bool isLast, int indentLevel, out string result)
    {
        result = string.Empty;

        if (node is not CurlyBracketsNode curly
            || curly.Nodes.Count < 4
            || curly.Nodes[0] is not IdentifierNode { Value: "fun" }
            || curly.Nodes[1] is not IdentifierNode name
            || curly.Nodes[2] is not SquareBracketsNode argsNode)
        {
            return false;
        }

        var parameters = argsNode.Nodes
            .Select(static arg => arg as IdentifierNode ?? throw new InvalidOperationException("Function parameters must be identifiers."))
            .ToArray();

        var innerState = new EmitterState();
        foreach (var parameter in parameters)
        {
            innerState.Declare(parameter.Value);
        }

        var funcType = GetFuncType(parameters.Length);
        var lambdaParameters = string.Join(", ", parameters.Select(static parameter => $"dynamic {parameter.Value}"));
        var lambdaBody = EmitLambdaBody(curly.Nodes.Skip(3).ToArray(), innerState, indentLevel + 2);
        state.Declare(name.Value);

        var builder = new StringBuilder();
        builder.Append($"{Indent(indentLevel)}dynamic {name.Value} = ({funcType})(({lambdaParameters}) =>");
        builder.AppendLine();
        builder.Append($"{Indent(indentLevel)}{{");
        builder.AppendLine();
        builder.Append(lambdaBody);
        builder.Append($"{Indent(indentLevel)}}});");
        if (isLast)
        {
            builder.AppendLine();
            builder.Append($"{Indent(indentLevel)}return {name.Value};");
        }

        result = builder.ToString();
        return true;
    }

    private static string EmitLambdaBody(IReadOnlyList<Node> bodyNodes, EmitterState state, int indentLevel)
    {
        return EmitBlock(bodyNodes, state, autoReturn: true, indentLevel);
    }

    private static string EmitExpression(Node node, EmitterState state)
    {
        return node switch
        {
            IdentifierNode identifier => identifier.Value switch
            {
                "true" => "true",
                "false" => "false",
                "null" => "null",
                _ => identifier.Value,
            },
            StringNode str => string.IsNullOrEmpty(str.Suffix)
                ? str.Value
                : $"MakrellSharp.Compiler.MakrellCompilerRuntime.StringLiteral({str.Value}, {Quote(str.Suffix)})",
            NumberNode number => string.IsNullOrEmpty(number.Suffix)
                ? number.Value
                : $"MakrellSharp.Compiler.MakrellCompilerRuntime.NumberLiteral({Quote(number.Value)}, {Quote(number.Suffix)})",
            SquareBracketsNode square => $"new object?[] {{ {string.Join(", ", square.Nodes.Select(child => EmitExpression(child, state)))} }}",
            RoundBracketsNode round => EmitRound(round, state),
            CurlyBracketsNode curly => EmitCurly(curly, state),
            BinOpNode binOp => EmitBinOp(binOp, state),
            OperatorNode op => Quote(op.Value),
            _ => throw new InvalidOperationException($"Unsupported expression node: {node.GetType().Name}"),
        };
    }

    private static string EmitRound(RoundBracketsNode round, EmitterState state)
    {
        return round.Nodes.Count switch
        {
            0 => "null",
            1 => $"({EmitExpression(round.Nodes[0], state)})",
            _ => $"new object?[] {{ {string.Join(", ", round.Nodes.Select(child => EmitExpression(child, state)))} }}",
        };
    }

    private static string EmitCurly(CurlyBracketsNode curly, EmitterState state)
    {
        if (curly.Nodes.Count == 0)
        {
            return "null";
        }

        if (curly.Nodes[0] is IdentifierNode identifier)
        {
            return identifier.Value switch
            {
                "if" => EmitIf(curly.Nodes.Skip(1).ToArray(), state),
                "do" => EmitDo(curly.Nodes.Skip(1).ToArray(), state),
                "fun" => EmitAnonymousFunction(curly, state),
                "new" => EmitNew(curly, state),
                _ => EmitCall(curly, state),
            };
        }

        return EmitCall(curly, state);
    }

    private static string EmitIf(IReadOnlyList<Node> parts, EmitterState state)
    {
        return parts.Count switch
        {
            0 => "null",
            1 => EmitExpression(parts[0], state),
            _ => WalkIf(parts, state, 0),
        };
    }

    private static string WalkIf(IReadOnlyList<Node> parts, EmitterState state, int index)
    {
        if (index >= parts.Count)
        {
            return "null";
        }

        if (index == parts.Count - 1)
        {
            return EmitExpression(parts[index], state);
        }

        var condition = EmitExpression(parts[index], state);
        var whenTrue = EmitExpression(parts[index + 1], state);
        var whenFalse = WalkIf(parts, state, index + 2);
        return $"({condition} ? {whenTrue} : {whenFalse})";
    }

    private static string EmitDo(IReadOnlyList<Node> nodes, EmitterState state)
    {
        var inner = state.Fork();
        var body = EmitBlock(nodes, inner, autoReturn: true, indentLevel: 3);
        return "((Func<dynamic>)(() =>" + Environment.NewLine +
               Indent(2) + "{" + Environment.NewLine +
               body +
               Indent(2) + "}))()";
    }

    private static string EmitAnonymousFunction(CurlyBracketsNode curly, EmitterState state)
    {
        if (curly.Nodes.Count < 3 || curly.Nodes[1] is not SquareBracketsNode argsNode)
        {
            throw new InvalidOperationException("Anonymous function form must be {fun [args] ...}.");
        }

        var parameters = argsNode.Nodes
            .Select(static arg => arg as IdentifierNode ?? throw new InvalidOperationException("Function parameters must be identifiers."))
            .ToArray();

        var innerState = new EmitterState();
        foreach (var parameter in parameters)
        {
            innerState.Declare(parameter.Value);
        }

        var funcType = GetFuncType(parameters.Length);
        var lambdaParameters = string.Join(", ", parameters.Select(static parameter => $"dynamic {parameter.Value}"));
        var lambdaBody = EmitLambdaBody(curly.Nodes.Skip(2).ToArray(), innerState, 4);
        return $"({funcType})(({lambdaParameters}) =>" + Environment.NewLine +
               Indent(3) + "{" + Environment.NewLine +
               lambdaBody +
               Indent(3) + "})";
    }

    private static string EmitNew(CurlyBracketsNode curly, EmitterState state)
    {
        if (curly.Nodes.Count < 3)
        {
            throw new InvalidOperationException("Constructor form must be {new Type [args...]}.");
        }

        if (curly.Nodes[2] is not SquareBracketsNode argsNode)
        {
            throw new InvalidOperationException("Constructor arguments must be provided in square brackets.");
        }

        var typeExpression = EmitExpression(curly.Nodes[1], state);
        var args = string.Join(", ", argsNode.Nodes.Select(arg => EmitExpression(arg, state)));
        return $"new {typeExpression}({args})";
    }

    private static string EmitCall(CurlyBracketsNode curly, EmitterState state)
    {
        var callee = EmitExpression(curly.Nodes[0], state);
        var args = string.Join(", ", curly.Nodes.Skip(1).Select(arg => EmitExpression(arg, state)));
        return $"{callee}({args})";
    }

    private static string EmitBinOp(BinOpNode binOp, EmitterState state)
    {
        if (binOp.Operator == "=")
        {
            return binOp.Left is IdentifierNode identifier
                ? $"({identifier.Value} = {EmitExpression(binOp.Right, state)})"
                : throw new InvalidOperationException("Assignment target must be identifier.");
        }

        if (binOp.Operator == "|")
        {
            return EmitPipe(binOp.Left, binOp.Right, state);
        }

        if (binOp.Operator == ".")
        {
            return $"{EmitExpression(binOp.Left, state)}.{EmitExpression(binOp.Right, state)}";
        }

        if (binOp.Operator == "->")
        {
            return EmitLambda(binOp, state);
        }

        return $"({EmitExpression(binOp.Left, state)} {binOp.Operator} {EmitExpression(binOp.Right, state)})";
    }

    private static string EmitPipe(Node left, Node right, EmitterState state)
    {
        var leftExpr = EmitExpression(left, state);
        return right switch
        {
            IdentifierNode identifier => $"{identifier.Value}({leftExpr})",
            CurlyBracketsNode curly when curly.Nodes.Count > 0 =>
                $"{EmitExpression(curly.Nodes[0], state)}({string.Join(", ", new[] { leftExpr }.Concat(curly.Nodes.Skip(1).Select(arg => EmitExpression(arg, state))))})",
            _ => $"{EmitExpression(right, state)}({leftExpr})",
        };
    }

    private static string EmitLambda(BinOpNode binOp, EmitterState state)
    {
        var parameters = binOp.Left switch
        {
            IdentifierNode identifier => new[] { identifier },
            SquareBracketsNode square => square.Nodes.Select(static node => node as IdentifierNode ?? throw new InvalidOperationException("Lambda parameters must be identifiers.")).ToArray(),
            _ => throw new InvalidOperationException("Lambda parameters must be identifiers or square-bracket list."),
        };

        var funcType = GetFuncType(parameters.Length);
        var parameterList = string.Join(", ", parameters.Select(static parameter => $"dynamic {parameter.Value}"));
        var innerState = new EmitterState();
        foreach (var parameter in parameters)
        {
            innerState.Declare(parameter.Value);
        }

        var body = EmitExpression(binOp.Right, innerState);
        return $"({funcType})(({parameterList}) => {body})";
    }

    private static string GetFuncType(int parameterCount)
    {
        if (parameterCount > 16)
        {
            throw new InvalidOperationException("Only up to 16 function parameters are supported in the initial compiler slice.");
        }

        var genericArgs = Enumerable.Repeat("dynamic", parameterCount + 1);
        return $"Func<{string.Join(", ", genericArgs)}>";
    }

    private static string Quote(string value) =>
        "\"" + value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal) + "\"";

    private static string Indent(int level) => new(' ', level * 4);

    private sealed class EmitterState
    {
        private readonly HashSet<string> declared = new(StringComparer.Ordinal);

        public bool Declare(string name) => declared.Add(name);

        public EmitterState Fork()
        {
            var fork = new EmitterState();
            foreach (var item in declared)
            {
                fork.declared.Add(item);
            }

            return fork;
        }
    }
}
