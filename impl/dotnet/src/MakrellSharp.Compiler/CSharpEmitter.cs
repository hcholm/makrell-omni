using System.Text;
using MakrellSharp.Ast;

namespace MakrellSharp.Compiler;

internal static class CSharpEmitter
{
    public static string EmitModule(IReadOnlyList<Node> nodes)
    {
        var module = ExtractModuleImports(nodes);
        var state = new EmitterState();
        var body = EmitBlock(module.BodyNodes, state, autoReturn: true, indentLevel: 2);
        var usingDirectives = string.Join(
            Environment.NewLine,
            new[] { "using System;" }.Concat(module.UsingDirectives).Distinct(StringComparer.Ordinal));

        return usingDirectives +
            Environment.NewLine +
            Environment.NewLine +
            """
            public static class __MakrellModule
            {
                public static dynamic Run()
                {
            """ +
            body +
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

        if (TryEmitStatementForm(node, state, isLast, indentLevel, out var statementForm))
        {
            return statementForm;
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

        if (node is BinOpNode { Operator: "=" })
        {
            return EmitNonIdentifierAssignmentStatement((BinOpNode)node, state, isLast, indentLevel);
        }

        var expr = EmitExpression(node, state);
        if (CanEmitDirectExpressionStatement(node))
        {
            return isLast
                ? $"{Indent(indentLevel)}return {expr};"
                : $"{Indent(indentLevel)}{expr};";
        }

        return isLast
            ? $"{Indent(indentLevel)}return {expr};"
            : $"{Indent(indentLevel)}_ = {expr};";
    }

    private static bool TryEmitStatementForm(Node node, EmitterState state, bool isLast, int indentLevel, out string result)
    {
        result = string.Empty;

        if (node is not CurlyBracketsNode curly
            || curly.Nodes.Count == 0
            || curly.Nodes[0] is not IdentifierNode head)
        {
            return false;
        }

        result = head.Value switch
        {
            "import" => throw new InvalidOperationException("Import forms are currently supported only at module scope."),
            "importm" => throw new NotSupportedException("importm is not implemented yet in Makrell#."),
            "return" => EmitReturnStatement(curly, state, indentLevel),
            "when" => EmitWhenStatement(curly, state, isLast, indentLevel),
            "while" => EmitWhileStatement(curly, state, isLast, indentLevel),
            "for" => EmitForStatement(curly, state, isLast, indentLevel),
            _ => string.Empty,
        };

        return result.Length > 0;
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

    private static string EmitReturnStatement(CurlyBracketsNode curly, EmitterState state, int indentLevel)
    {
        var value = curly.Nodes.Count > 1 ? EmitExpression(curly.Nodes[1], state) : "null";
        return $"{Indent(indentLevel)}return {value};";
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
                "quote" => EmitQuote(curly.Nodes.Skip(1).ToArray(), state),
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

        if (curly.Nodes[^1] is not SquareBracketsNode argsNode)
        {
            throw new InvalidOperationException("Constructor arguments must be provided in square brackets.");
        }

        var typeNodes = curly.Nodes.Skip(1).Take(curly.Nodes.Count - 2).ToArray();
        var typeExpression = EmitTypeReference(typeNodes);
        if (TryEmitCollectionInitializer(typeNodes, argsNode, state, out var initializer))
        {
            return $"new {typeExpression} {initializer}";
        }

        var args = string.Join(", ", argsNode.Nodes.Select(arg => EmitExpression(arg, state)));
        return $"new {typeExpression}({args})";
    }

    private static string EmitQuote(
        IReadOnlyList<Node> nodes,
        EmitterState state,
        int quoteDepth = 0,
        bool allowSpecialForms = true)
    {
        return nodes.Count switch
        {
            0 => EmitQuotedNode(new IdentifierNode("null", SourceSpan.Empty), state, quoteDepth, allowSpecialForms),
            1 => EmitQuotedNode(nodes[0], state, quoteDepth, allowSpecialForms),
            _ => $"new object?[] {{ {string.Join(", ", nodes.Select(node => EmitQuotedNode(node, state, quoteDepth, allowSpecialForms)))} }}",
        };
    }

    private static string EmitCall(CurlyBracketsNode curly, EmitterState state)
    {
        var callee = EmitExpression(curly.Nodes[0], state);
        var args = string.Join(", ", curly.Nodes.Skip(1).Select(arg => EmitExpression(arg, state)));
        return $"{callee}({args})";
    }

    private static string EmitQuotedNode(
        Node node,
        EmitterState state,
        int quoteDepth = 0,
        bool allowSpecialForms = true)
    {
        if (allowSpecialForms && node is CurlyBracketsNode specialCurly)
        {
            if (IsUnquoteHead(specialCurly))
            {
                return quoteDepth > 0
                    ? EmitQuotedNode(specialCurly, state, quoteDepth, allowSpecialForms: false)
                    : EmitUnquote(specialCurly, state);
            }

            if (IsQuoteHead(specialCurly))
            {
                return EmitQuote(specialCurly.Nodes.Skip(1).ToArray(), state, quoteDepth + 1, allowSpecialForms);
            }
        }

        return node switch
        {
            IdentifierNode identifier => $"new global::MakrellSharp.Ast.IdentifierNode({Quote(identifier.Value)}, global::MakrellSharp.Ast.SourceSpan.Empty)",
            StringNode str => $"new global::MakrellSharp.Ast.StringNode({Quote(str.Value)}, {Quote(str.Suffix)}, global::MakrellSharp.Ast.SourceSpan.Empty)",
            NumberNode number => $"new global::MakrellSharp.Ast.NumberNode({Quote(number.Value)}, {Quote(number.Suffix)}, global::MakrellSharp.Ast.SourceSpan.Empty)",
            OperatorNode op => $"new global::MakrellSharp.Ast.OperatorNode({Quote(op.Value)}, global::MakrellSharp.Ast.SourceSpan.Empty)",
            CommentNode comment => $"new global::MakrellSharp.Ast.CommentNode({Quote(comment.Value)}, global::MakrellSharp.Ast.SourceSpan.Empty)",
            WhitespaceNode whitespace => $"new global::MakrellSharp.Ast.WhitespaceNode({Quote(whitespace.Value)}, global::MakrellSharp.Ast.SourceSpan.Empty)",
            UnknownNode unknown => $"new global::MakrellSharp.Ast.UnknownNode({Quote(unknown.Value)}, global::MakrellSharp.Ast.SourceSpan.Empty)",
            BinOpNode binOp => $"new global::MakrellSharp.Ast.BinOpNode({EmitQuotedNode(binOp.Left, state, quoteDepth, allowSpecialForms)}, {Quote(binOp.Operator)}, {EmitQuotedNode(binOp.Right, state, quoteDepth, allowSpecialForms)}, global::MakrellSharp.Ast.SourceSpan.Empty)",
            SequenceNode sequence => EmitQuotedSequence(
                "SequenceNode",
                sequence.Nodes,
                sequence.OriginalNodes.Count > 0 ? sequence.OriginalNodes : sequence.Nodes,
                state,
                quoteDepth,
                allowSpecialForms),
            RoundBracketsNode round => EmitQuotedSequence(
                "RoundBracketsNode",
                round.Nodes,
                round.OriginalNodes.Count > 0 ? round.OriginalNodes : round.Nodes,
                state,
                quoteDepth,
                allowSpecialForms),
            SquareBracketsNode square => EmitQuotedSequence(
                "SquareBracketsNode",
                square.Nodes,
                square.OriginalNodes.Count > 0 ? square.OriginalNodes : square.Nodes,
                state,
                quoteDepth,
                allowSpecialForms),
            CurlyBracketsNode curly => EmitQuotedSequence(
                "CurlyBracketsNode",
                curly.Nodes,
                curly.OriginalNodes.Count > 0 ? curly.OriginalNodes : curly.Nodes,
                state,
                quoteDepth,
                allowSpecialForms),
            _ => throw new InvalidOperationException($"Unsupported quoted node: {node.GetType().Name}"),
        };
    }

    private static string EmitQuotedSequence(
        string typeName,
        IReadOnlyList<Node> nodes,
        IReadOnlyList<Node> originalNodes,
        EmitterState state,
        int quoteDepth,
        bool allowSpecialForms)
    {
        var quotedNodes = $"new global::MakrellSharp.Ast.Node[] {{ {string.Join(", ", nodes.Select(node => EmitQuotedNode(node, state, quoteDepth, allowSpecialForms)))} }}";
        var quotedOriginalNodes = $"new global::MakrellSharp.Ast.Node[] {{ {string.Join(", ", originalNodes.Select(node => EmitQuotedNode(node, state, quoteDepth, allowSpecialForms)))} }}";
        return $"new global::MakrellSharp.Ast.{typeName}({quotedNodes}, {quotedOriginalNodes}, global::MakrellSharp.Ast.SourceSpan.Empty)";
    }

    private static bool IsQuoteHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "quote" };

    private static bool IsUnquoteHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "unquote" or "$" };

    private static string EmitUnquote(CurlyBracketsNode curly, EmitterState state)
    {
        if (curly.Nodes.Count <= 1)
        {
            return EmitQuotedNode(new IdentifierNode("null", SourceSpan.Empty), state);
        }

        if (curly.Nodes.Count == 2)
        {
            return EmitExpression(curly.Nodes[1], state);
        }

        return $"new object?[] {{ {string.Join(", ", curly.Nodes.Skip(1).Select(node => EmitExpression(node, state)))} }}";
    }

    private static string EmitBinOp(BinOpNode binOp, EmitterState state)
    {
        if (binOp.Operator == "=")
        {
            return EmitAssignment(binOp, state);
        }

        if (binOp.Operator == "|")
        {
            return EmitPipe(binOp.Left, binOp.Right, state);
        }

        if (binOp.Operator == "@")
        {
            return $"MakrellSharp.Compiler.MakrellCompilerRuntime.Index({EmitExpression(binOp.Left, state)}, {EmitExpression(binOp.Right, state)})";
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

    private static string EmitAssignment(BinOpNode binOp, EmitterState state)
    {
        var rhs = EmitExpression(binOp.Right, state);
        return binOp.Left switch
        {
            IdentifierNode identifier => $"({identifier.Value} = {rhs})",
            BinOpNode { Operator: "." } member => $"({EmitExpression(member.Left, state)}.{EmitExpression(member.Right, state)} = {rhs})",
            BinOpNode { Operator: "@" } index => $"MakrellSharp.Compiler.MakrellCompilerRuntime.SetIndex({EmitExpression(index.Left, state)}, {EmitExpression(index.Right, state)}, {rhs})",
            _ => throw new InvalidOperationException("Assignment target must be identifier, member access, or index access."),
        };
    }

    private static string EmitNonIdentifierAssignmentStatement(BinOpNode assignment, EmitterState state, bool isLast, int indentLevel)
    {
        var rhs = EmitExpression(assignment.Right, state);
        return assignment.Left switch
        {
            BinOpNode { Operator: "." } member => EmitMemberAssignmentStatement(member, rhs, isLast, indentLevel, state),
            BinOpNode { Operator: "@" } index => EmitIndexAssignmentStatement(index, rhs, isLast, indentLevel, state),
            _ => throw new InvalidOperationException("Assignment target must be identifier, member access, or index access."),
        };
    }

    private static string EmitMemberAssignmentStatement(BinOpNode member, string rhs, bool isLast, int indentLevel, EmitterState state)
    {
        var lhs = $"{EmitExpression(member.Left, state)}.{EmitExpression(member.Right, state)}";
        var assign = $"{Indent(indentLevel)}{lhs} = {rhs};";
        return isLast
            ? assign + Environment.NewLine + $"{Indent(indentLevel)}return {lhs};"
            : assign;
    }

    private static string EmitIndexAssignmentStatement(BinOpNode index, string rhs, bool isLast, int indentLevel, EmitterState state)
    {
        var setCall = $"MakrellSharp.Compiler.MakrellCompilerRuntime.SetIndex({EmitExpression(index.Left, state)}, {EmitExpression(index.Right, state)}, {rhs})";
        return isLast
            ? $"{Indent(indentLevel)}return {setCall};"
            : $"{Indent(indentLevel)}{setCall};";
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

    private static string EmitWhenStatement(CurlyBracketsNode curly, EmitterState state, bool isLast, int indentLevel)
    {
        if (curly.Nodes.Count < 2)
        {
            throw new InvalidOperationException("When form must be {when condition ...}.");
        }

        var condition = EmitExpression(curly.Nodes[1], state);
        var bodyState = state.Fork();
        var body = EmitBlock(curly.Nodes.Skip(2).ToArray(), bodyState, autoReturn: false, indentLevel + 1);
        var builder = new StringBuilder();
        builder.Append($"{Indent(indentLevel)}if ({condition})");
        builder.AppendLine();
        builder.Append($"{Indent(indentLevel)}{{");
        builder.AppendLine();
        builder.Append(body);
        builder.Append($"{Indent(indentLevel)}}}");
        if (isLast)
        {
            builder.AppendLine();
            builder.Append($"{Indent(indentLevel)}return null;");
        }

        return builder.ToString();
    }

    private static string EmitWhileStatement(CurlyBracketsNode curly, EmitterState state, bool isLast, int indentLevel)
    {
        if (curly.Nodes.Count < 2)
        {
            throw new InvalidOperationException("While form must be {while condition ...}.");
        }

        var condition = EmitExpression(curly.Nodes[1], state);
        var bodyState = state.Fork();
        var body = EmitBlock(curly.Nodes.Skip(2).ToArray(), bodyState, autoReturn: false, indentLevel + 1);
        var builder = new StringBuilder();
        builder.Append($"{Indent(indentLevel)}while ({condition})");
        builder.AppendLine();
        builder.Append($"{Indent(indentLevel)}{{");
        builder.AppendLine();
        builder.Append(body);
        builder.Append($"{Indent(indentLevel)}}}");
        if (isLast)
        {
            builder.AppendLine();
            builder.Append($"{Indent(indentLevel)}return null;");
        }

        return builder.ToString();
    }

    private static string EmitForStatement(CurlyBracketsNode curly, EmitterState state, bool isLast, int indentLevel)
    {
        if (curly.Nodes.Count < 3 || curly.Nodes[1] is not IdentifierNode loopVariable)
        {
            throw new InvalidOperationException("For form must be {for item iterable ...}.");
        }

        var iterable = EmitExpression(curly.Nodes[2], state);
        var bodyState = state.Fork();
        bodyState.Declare(loopVariable.Value);
        var body = EmitBlock(curly.Nodes.Skip(3).ToArray(), bodyState, autoReturn: false, indentLevel + 1);
        var builder = new StringBuilder();
        builder.Append($"{Indent(indentLevel)}foreach (dynamic {loopVariable.Value} in {iterable})");
        builder.AppendLine();
        builder.Append($"{Indent(indentLevel)}{{");
        builder.AppendLine();
        builder.Append(body);
        builder.Append($"{Indent(indentLevel)}}}");
        if (isLast)
        {
            builder.AppendLine();
            builder.Append($"{Indent(indentLevel)}return null;");
        }

        return builder.ToString();
    }

    private static ModuleImports ExtractModuleImports(IReadOnlyList<Node> nodes)
    {
        var usingDirectives = new List<string>();
        var bodyNodes = new List<Node>();

        foreach (var node in nodes)
        {
            if (TryExtractImportDirectives(node, usingDirectives))
            {
                continue;
            }

            bodyNodes.Add(node);
        }

        return new ModuleImports(usingDirectives, bodyNodes);
    }

    private static bool TryExtractImportDirectives(Node node, List<string> usingDirectives)
    {
        if (node is not CurlyBracketsNode curly
            || curly.Nodes.Count < 2
            || curly.Nodes[0] is not IdentifierNode head)
        {
            return false;
        }

        if (head.Value == "importm")
        {
            throw new NotSupportedException("importm is not implemented yet in Makrell#.");
        }

        if (head.Value != "import")
        {
            return false;
        }

        var parts = curly.Nodes.Skip(1).ToArray();
        for (var i = 0; i < parts.Length; i += 1)
        {
            if (parts[i] is BinOpNode { Operator: "@" } importFrom)
            {
                AppendImportDirective(importFrom, usingDirectives);
                continue;
            }

            if (i + 1 < parts.Length && parts[i + 1] is SquareBracketsNode genericArguments)
            {
                AppendImportDirective(parts[i], genericArguments, usingDirectives);
                i += 1;
                continue;
            }

            AppendImportDirective(parts[i], usingDirectives);
        }

        return true;
    }

    private static void AppendImportDirective(Node node, List<string> usingDirectives)
    {
        if (node is RoundBracketsNode)
        {
            var alias = GetTerminalIdentifier(node);
            var typeReference = EmitTypeReference([node]);
            usingDirectives.Add($"using {alias} = global::{typeReference};");
            return;
        }

        if (node is BinOpNode { Operator: "@" } importFrom)
        {
            var source = GetDottedPath(importFrom.Left);
            if (importFrom.Right is not SquareBracketsNode importedNames)
            {
                throw new InvalidOperationException("Import selection must use square brackets.");
            }

            foreach (var imported in importedNames.Nodes)
            {
                var name = imported as IdentifierNode
                    ?? throw new InvalidOperationException("Selected import names must be identifiers.");
                usingDirectives.Add($"using {name.Value} = global::{source}.{name.Value};");
            }

            return;
        }

        var path = GetDottedPath(node);
        var resolvedType = ResolveType(path);
        if (resolvedType is not null)
        {
            usingDirectives.Add($"using {resolvedType.Name} = global::{path};");
            return;
        }

        usingDirectives.Add($"using {path};");
    }

    private static void AppendImportDirective(Node node, SquareBracketsNode genericArguments, List<string> usingDirectives)
    {
        var alias = GetTerminalIdentifier(node);
        var typeReference = EmitTypeReference([node, genericArguments]);
        usingDirectives.Add($"using {alias} = global::{typeReference};");
    }

    private static string GetDottedPath(Node node)
    {
        return node switch
        {
            IdentifierNode identifier => identifier.Value,
            BinOpNode { Operator: "." } dotted => $"{GetDottedPath(dotted.Left)}.{GetDottedPath(dotted.Right)}",
            _ => throw new InvalidOperationException("Import path must be an identifier or dotted identifier."),
        };
    }

    private static string GetTerminalIdentifier(Node node)
    {
        return node switch
        {
            IdentifierNode identifier => GetTerminalIdentifier(MapTypeAlias(identifier.Value)),
            BinOpNode { Operator: "." } dotted => GetTerminalIdentifier(dotted.Right),
            RoundBracketsNode round when round.Nodes.Count > 0 => GetTerminalIdentifier(round.Nodes[0]),
            _ => throw new InvalidOperationException("Type path must end with an identifier."),
        };
    }

    private static string GetTerminalIdentifier(string path)
    {
        var lastDot = path.LastIndexOf('.');
        return lastDot >= 0 ? path[(lastDot + 1)..] : path;
    }

    private static Type? ResolveType(string fullName)
    {
        var resolved = Type.GetType(fullName, throwOnError: false);
        if (resolved is not null)
        {
            return resolved;
        }

        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
        {
            resolved = assembly.GetType(fullName, throwOnError: false);
            if (resolved is not null)
            {
                return resolved;
            }
        }

        return null;
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

    private static string EmitTypeReference(IReadOnlyList<Node> nodes)
    {
        if (nodes.Count == 0)
        {
            throw new InvalidOperationException("Type reference cannot be empty.");
        }

        if (nodes.Count == 1)
        {
            return EmitTypeReferenceNode(nodes[0]);
        }

        if (nodes.Count == 2 && nodes[1] is SquareBracketsNode genericArguments)
        {
            return EmitGenericTypeReference(nodes[0], genericArguments);
        }

        throw new InvalidOperationException("Unsupported type reference shape.");
    }

    private static string EmitTypeReferenceNode(Node node)
    {
        return node switch
        {
            IdentifierNode identifier => MapTypeAlias(identifier.Value),
            BinOpNode { Operator: "." } dotted => $"{EmitTypeReferenceNode(dotted.Left)}.{EmitTypeReferenceNode(dotted.Right)}",
            RoundBracketsNode round when round.Nodes.Count > 0 => EmitRoundTypeReference(round),
            SequenceNode sequence when sequence.Nodes.Count > 0 => EmitTypeReference(sequence.Nodes),
            _ => throw new InvalidOperationException($"Unsupported type reference node: {node.GetType().Name}"),
        };
    }

    private static string EmitRoundTypeReference(RoundBracketsNode round)
    {
        if (IsArrayTypeReference(round))
        {
            if (round.Nodes.Count != 2)
            {
                throw new InvalidOperationException("Array type references must be of the form (array Type).");
            }

            return $"{EmitTypeReferenceNode(round.Nodes[1])}[]";
        }

        var root = EmitTypeReferenceNode(round.Nodes[0]);
        if (round.Nodes.Count == 1)
        {
            return root;
        }

        var typeArguments = round.Nodes.Skip(1).Select(EmitTypeReferenceNode);
        return $"{root}<{string.Join(", ", typeArguments)}>";
    }

    private static bool TryEmitCollectionInitializer(
        IReadOnlyList<Node> typeNodes,
        SquareBracketsNode argsNode,
        EmitterState state,
        out string initializer)
    {
        initializer = string.Empty;
        var collectionKind = GetCollectionInitializerKind(typeNodes);
        if (collectionKind is null)
        {
            return false;
        }

        initializer = collectionKind switch
        {
            CollectionInitializerKind.Array => EmitArrayInitializer(argsNode, state),
            CollectionInitializerKind.List => EmitListInitializer(argsNode, state),
            CollectionInitializerKind.Dictionary => EmitDictionaryInitializer(argsNode, state),
            _ => string.Empty,
        };

        return initializer.Length > 0;
    }

    private static string EmitListInitializer(SquareBracketsNode argsNode, EmitterState state)
    {
        return "{ " + string.Join(", ", argsNode.Nodes.Select(arg => EmitExpression(arg, state))) + " }";
    }

    private static string EmitArrayInitializer(SquareBracketsNode argsNode, EmitterState state)
    {
        return "{ " + string.Join(", ", argsNode.Nodes.Select(arg => EmitExpression(arg, state))) + " }";
    }

    private static string EmitDictionaryInitializer(SquareBracketsNode argsNode, EmitterState state)
    {
        var entries = argsNode.Nodes.Select(arg =>
        {
            var pair = arg switch
            {
                SquareBracketsNode square when square.Nodes.Count == 2 => square.Nodes,
                RoundBracketsNode round when round.Nodes.Count == 2 => round.Nodes,
                SequenceNode sequence when sequence.Nodes.Count == 2 => sequence.Nodes,
                _ => throw new InvalidOperationException("Dictionary collection initializers must use two-item entries."),
            };

            return $"{{ {EmitExpression(pair[0], state)}, {EmitExpression(pair[1], state)} }}";
        });

        return "{ " + string.Join(", ", entries) + " }";
    }

    private static CollectionInitializerKind? GetCollectionInitializerKind(IReadOnlyList<Node> typeNodes)
    {
        if (typeNodes.Count == 0)
        {
            return null;
        }

        return GetCollectionInitializerKind(typeNodes[0]);
    }

    private static CollectionInitializerKind? GetCollectionInitializerKind(Node node)
    {
        if (node is RoundBracketsNode round && IsArrayTypeReference(round))
        {
            return CollectionInitializerKind.Array;
        }

        return GetTerminalIdentifier(node) switch
        {
            "List" => CollectionInitializerKind.List,
            "Dictionary" => CollectionInitializerKind.Dictionary,
            _ => null,
        };
    }

    private static bool IsArrayTypeReference(RoundBracketsNode round)
    {
        return round.Nodes.Count > 0
            && round.Nodes[0] is IdentifierNode { Value: "array" };
    }

    private static string EmitGenericTypeReference(Node root, SquareBracketsNode genericArguments)
    {
        var typeArguments = ParseTypeArguments(genericArguments.Nodes);
        return $"{EmitTypeReferenceNode(root)}<{string.Join(", ", typeArguments)}>";
    }

    private static IReadOnlyList<string> ParseTypeArguments(IReadOnlyList<Node> nodes)
    {
        var results = new List<string>();
        for (var i = 0; i < nodes.Count; i += 1)
        {
            if (i + 1 < nodes.Count && nodes[i + 1] is SquareBracketsNode genericArguments)
            {
                results.Add(EmitGenericTypeReference(nodes[i], genericArguments));
                i += 1;
                continue;
            }

            results.Add(EmitTypeReferenceNode(nodes[i]));
        }

        return results;
    }

    private static string MapTypeAlias(string value)
    {
        return value switch
        {
            "string" => "string",
            "bool" => "bool",
            "object" => "object",
            "long" => "long",
            "int" => "long",
            "double" => "double",
            "float" => "double",
            "decimal" => "decimal",
            "list" => "System.Collections.Generic.List",
            "dictionary" => "System.Collections.Generic.Dictionary",
            "dict" => "System.Collections.Generic.Dictionary",
            _ => value,
        };
    }

    private static bool CanEmitDirectExpressionStatement(Node node)
    {
        return node switch
        {
            CurlyBracketsNode => true,
            BinOpNode { Operator: "|" } => true,
            _ => false,
        };
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

    private enum CollectionInitializerKind
    {
        Array,
        List,
        Dictionary,
    }

    private sealed record ModuleImports(
        IReadOnlyList<string> UsingDirectives,
        IReadOnlyList<Node> BodyNodes);
}
