using System.Reflection;
using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.Compiler;

internal sealed class MetaProcessor
{
    private readonly MacroRegistry registry;
    private readonly string source;
    private readonly Dictionary<string, object?> symbols = new(StringComparer.Ordinal);
    private readonly HashSet<string> importedAssemblyPaths = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<string> replaySources = [];

    public MetaProcessor(MacroRegistry registry, string source)
    {
        this.registry = registry ?? throw new ArgumentNullException(nameof(registry));
        this.source = source ?? throw new ArgumentNullException(nameof(source));
        InitializeBuiltins();
    }

    public IReadOnlyList<string> ReplaySources => replaySources;

    public IReadOnlyList<Node> Process(IReadOnlyList<Node> nodes)
    {
        ArgumentNullException.ThrowIfNull(nodes);

        return ProcessNodes(nodes, collectReplaySources: true);
    }

    private IReadOnlyList<Node> ProcessNodes(IReadOnlyList<Node> nodes, bool collectReplaySources)
    {
        var output = new List<Node>();
        foreach (var node in nodes)
        {
            if (TryImportMeta(node, collectReplaySources)
                || TryDefineMacro(node, collectReplaySources)
                || TryExecuteMetaBlock(node, collectReplaySources))
            {
                continue;
            }

            output.Add(SubstituteRuntimeNode(node));
        }

        return output;
    }

    private bool TryDefineMacro(Node node, bool collectReplaySources)
    {
        if (node is not CurlyBracketsNode curly
            || curly.Nodes.Count < 4
            || curly.Nodes[0] is not IdentifierNode { Value: "def" }
            || curly.Nodes[1] is not IdentifierNode { Value: "macro" }
            || curly.Nodes[2] is not IdentifierNode name
            || curly.Nodes[3] is not SquareBracketsNode parameters)
        {
            return false;
        }

        if (collectReplaySources)
        {
            RecordReplaySource(curly);
        }

        var parameterNames = parameters.Nodes
            .Select(static parameter => parameter as IdentifierNode ?? throw new InvalidOperationException("Macro parameters must be identifiers."))
            .Select(static parameter => parameter.Value)
            .ToArray();
        var body = BaseFormatParser.ParseOperators(curly.Nodes.Skip(4).ToArray());

        registry.RegisterNative(name.Value, (invocation, _) => ExecuteDefinedMacro(parameterNames, body, invocation));
        return true;
    }

    private bool TryExecuteMetaBlock(Node node, bool collectReplaySources)
    {
        if (node is not CurlyBracketsNode curly
            || curly.Nodes.Count == 0
            || curly.Nodes[0] is not IdentifierNode { Value: "meta" })
        {
            return false;
        }

        if (collectReplaySources)
        {
            RecordReplaySource(curly);
        }

        var statements = BaseFormatParser.ParseOperators(curly.Nodes.Skip(1).ToArray());
        _ = ExecuteStatements(statements);
        return true;
    }

    private bool TryImportMeta(Node node, bool collectReplaySources)
    {
        if (node is not CurlyBracketsNode curly
            || curly.Nodes.Count < 2
            || curly.Nodes[0] is not IdentifierNode { Value: "importm" })
        {
            return false;
        }

        if (collectReplaySources)
        {
            RecordReplaySource(curly);
        }

        foreach (var imported in curly.Nodes.Skip(1))
        {
            var path = imported as StringNode
                ?? throw new InvalidOperationException("importm currently expects string literal assembly paths.");
            ReplayImportedAssembly(EvaluateString(path));
        }

        return true;
    }

    private object? ExecuteStatements(IEnumerable<Node> nodes)
    {
        object? last = null;
        foreach (var node in nodes)
        {
            last = ExecuteStatement(node);
        }

        return last;
    }

    private object? ExecuteStatement(Node node)
    {
        switch (node)
        {
            case CurlyBracketsNode curly when TryExecuteNamedFunctionDefinition(curly):
                return null;
            case CurlyBracketsNode curly when IsWhenHead(curly):
                return ExecuteWhen(curly);
            case CurlyBracketsNode curly when IsWhileHead(curly):
                return ExecuteWhile(curly);
            case CurlyBracketsNode curly when IsForHead(curly):
                return ExecuteFor(curly);
            case CurlyBracketsNode curly when IsBreakHead(curly):
                throw new MetaBreak();
            case CurlyBracketsNode curly when IsContinueHead(curly):
                throw new MetaContinue();
            case CurlyBracketsNode curly when IsReturnHead(curly):
                throw new MetaReturn(EvaluateReturnValue(curly));
            case BinOpNode { Operator: "=" } assignment when assignment.Left is IdentifierNode identifier:
                var assigned = EvaluateExpression(assignment.Right);
                symbols[identifier.Value] = assigned;
                return assigned;
            case SequenceNode sequence:
                return ExecuteStatements(sequence.Nodes);
            default:
                return EvaluateExpression(node);
        }
    }

    private object? EvaluateExpression(Node node)
    {
        return node switch
        {
            IdentifierNode identifier => EvaluateIdentifier(identifier),
            NumberNode number => EvaluateNumber(number),
            StringNode str => EvaluateString(str),
            SquareBracketsNode square => EvaluateSquare(square),
            RoundBracketsNode round => EvaluateRound(round),
            CurlyBracketsNode curly => EvaluateCurly(curly),
            BinOpNode binOp => EvaluateBinary(binOp),
            _ => throw new InvalidOperationException($"Unsupported meta expression node: {node.GetType().Name}"),
        };
    }

    private object? EvaluateIdentifier(IdentifierNode identifier)
    {
        return identifier.Value switch
        {
            "true" => true,
            "false" => false,
            "null" => null,
            _ when symbols.TryGetValue(identifier.Value, out var value) => value,
            _ => throw new InvalidOperationException($"Unknown meta identifier '{identifier.Value}'."),
        };
    }

    private static object EvaluateNumber(NumberNode number)
    {
        if (!string.IsNullOrEmpty(number.Suffix))
        {
            throw new NotSupportedException("Number suffixes are not implemented in meta expressions yet.");
        }

        return number.Value.Contains('.') || number.Value.Contains('e') || number.Value.Contains('E')
            ? double.Parse(number.Value, System.Globalization.CultureInfo.InvariantCulture)
            : long.Parse(number.Value, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static string EvaluateString(StringNode str)
    {
        var inner = str.Value.Length >= 2 ? str.Value[1..^1] : str.Value;
        return inner
            .Replace("\\\"", "\"", StringComparison.Ordinal)
            .Replace("\\\\", "\\", StringComparison.Ordinal);
    }

    private object? EvaluateRound(RoundBracketsNode round)
    {
        var parsed = BaseFormatParser.ParseOperators(round.Nodes);
        return parsed.Count switch
        {
            0 => null,
            1 => EvaluateExpression(parsed[0]),
            _ => parsed.Select(EvaluateExpression).ToArray(),
        };
    }

    private object? EvaluateCurly(CurlyBracketsNode curly)
    {
        if (curly.Nodes.Count == 0)
        {
            return null;
        }

        if (curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode head)
        {
            if (head.Value == "quote")
            {
                return QuoteFromMeta(curly.Nodes.Skip(1).ToArray());
            }

            if (head.Value == "regular")
            {
                if (curly.Nodes.Count != 2)
                {
                    throw new InvalidOperationException("regular expects exactly one argument in meta expressions.");
                }

                return RegularizeMetaValue(EvaluateExpression(curly.Nodes[1]));
            }

            if (head.Value == "len")
            {
                if (curly.Nodes.Count != 2)
                {
                    throw new InvalidOperationException("len expects exactly one argument in meta expressions.");
                }

                return GetMetaLength(EvaluateExpression(curly.Nodes[1]));
            }

            if (head.Value == "if")
            {
                return EvaluateIf(curly);
            }

            if (head.Value == "match")
            {
                return EvaluateMatch(curly);
            }
        }

        var callable = EvaluateExpression(curly.Nodes[0]);
        var arguments = curly.Nodes.Skip(1).Select(EvaluateExpression).ToArray();
        return InvokeCallable(callable, arguments);
    }

    private object? EvaluateBinary(BinOpNode binOp)
    {
        if (binOp.Operator == ".")
        {
            return EvaluateMemberAccess(binOp);
        }

        if (binOp.Operator == "~=")
        {
            return MakrellCompilerRuntime.PatternMatches(EvaluateExpression(binOp.Left), binOp.Right);
        }

        if (binOp.Operator == "!~=")
        {
            return !MakrellCompilerRuntime.PatternMatches(EvaluateExpression(binOp.Left), binOp.Right);
        }

        var left = EvaluateExpression(binOp.Left);
        var right = EvaluateExpression(binOp.Right);

        return binOp.Operator switch
        {
            "+" => Add(left, right),
            "-" => Subtract(left, right),
            "*" => Multiply(left, right),
            "/" => Divide(left, right),
            "@" => EvaluateIndex(left, right),
            "&&" => IsTruthy(left) && IsTruthy(right),
            "||" => IsTruthy(left) || IsTruthy(right),
            "==" => Equals(left, right),
            "!=" => !Equals(left, right),
            "<" => Compare(left, right) < 0,
            ">" => Compare(left, right) > 0,
            "<=" => Compare(left, right) <= 0,
            ">=" => Compare(left, right) >= 0,
            _ => throw new NotSupportedException($"Binary operator '{binOp.Operator}' is not implemented in meta expressions yet."),
        };
    }

    private object? EvaluateSquare(SquareBracketsNode square)
    {
        var values = new List<object?>(square.Nodes.Count);
        foreach (var node in square.Nodes)
        {
            values.Add(EvaluateExpression(node));
        }

        return values;
    }

    private object? EvaluateMemberAccess(BinOpNode binOp)
    {
        var left = EvaluateExpression(binOp.Left);
        if (binOp.Right is not IdentifierNode member)
        {
            throw new InvalidOperationException("Meta member access expects an identifier on the right-hand side.");
        }

        return GetMemberValue(left, member.Value);
    }

    private object? InvokeCallable(object? callable, IReadOnlyList<object?> arguments)
    {
        return callable switch
        {
            MetaFunction function => InvokeFunction(function, arguments),
            MetaBuiltin builtin => builtin.Implementation(arguments),
            MetaConstructor constructor => constructor.Implementation(arguments),
            _ => throw new InvalidOperationException("Meta expression head is not callable."),
        };
    }

    private object? GetMemberValue(object? target, string memberName)
    {
        ArgumentNullException.ThrowIfNull(target);

        if (TryGetListMethod(target, memberName, out var listMethod))
        {
            return listMethod;
        }

        var type = target.GetType();
        var resolvedName = ResolveMemberName(type, memberName);

        var property = type.GetProperty(resolvedName, BindingFlags.Instance | BindingFlags.Public);
        if (property is not null)
        {
            return property.GetValue(target);
        }

        var field = type.GetField(resolvedName, BindingFlags.Instance | BindingFlags.Public);
        if (field is not null)
        {
            return field.GetValue(target);
        }

        throw new InvalidOperationException($"Unknown meta member '{memberName}' on type '{type.Name}'.");
    }

    private static string ResolveMemberName(Type type, string memberName)
    {
        if (type.GetProperty(memberName, BindingFlags.Instance | BindingFlags.Public) is not null
            || type.GetField(memberName, BindingFlags.Instance | BindingFlags.Public) is not null)
        {
            return memberName;
        }

        var pascalName = ToPascalCase(memberName);
        if (type.GetProperty(pascalName, BindingFlags.Instance | BindingFlags.Public) is not null
            || type.GetField(pascalName, BindingFlags.Instance | BindingFlags.Public) is not null)
        {
            return pascalName;
        }

        return memberName;
    }

    private static string ToPascalCase(string value)
    {
        return string.IsNullOrEmpty(value)
            ? value
            : char.ToUpperInvariant(value[0]) + value[1..];
    }

    private static bool TryGetListMethod(object target, string memberName, out MetaBuiltin builtin)
    {
        if (target is IList<object?> list)
        {
            switch (memberName)
            {
                case "append":
                case "push":
                    builtin = new MetaBuiltin(arguments =>
                    {
                        foreach (var argument in arguments)
                        {
                            list.Add(argument);
                        }

                        return list;
                    });
                    return true;
                case "pop":
                    builtin = new MetaBuiltin(_ =>
                    {
                        if (list.Count == 0)
                        {
                            throw new InvalidOperationException("Cannot pop from an empty meta list.");
                        }

                        var last = list[^1];
                        list.RemoveAt(list.Count - 1);
                        return last;
                    });
                    return true;
            }
        }

        builtin = null!;
        return false;
    }

    private void InitializeBuiltins()
    {
        symbols["isinstance"] = new MetaBuiltin(IsInstance);
        symbols["BinOp"] = new MetaConstructor(typeof(BinOpNode), CreateBinOp);
        symbols["CurlyBrackets"] = new MetaConstructor(typeof(CurlyBracketsNode), arguments => CreateBracket(arguments, static nodes => new CurlyBracketsNode(nodes, nodes, SourceSpan.Empty)));
        symbols["SquareBrackets"] = new MetaConstructor(typeof(SquareBracketsNode), arguments => CreateBracket(arguments, static nodes => new SquareBracketsNode(nodes, nodes, SourceSpan.Empty)));
        symbols["RoundBrackets"] = new MetaConstructor(typeof(RoundBracketsNode), arguments => CreateBracket(arguments, static nodes => new RoundBracketsNode(nodes, nodes, SourceSpan.Empty)));

        symbols["Identifier"] = typeof(IdentifierNode);
        symbols["String"] = typeof(StringNode);
        symbols["Number"] = typeof(NumberNode);
        symbols["Operator"] = typeof(OperatorNode);
    }

    private static object? IsInstance(IReadOnlyList<object?> arguments)
    {
        var type = arguments.Count == 2
            ? arguments[1] switch
            {
                Type directType => directType,
                MetaConstructor constructor => constructor.NodeType,
                _ => null,
            }
            : null;

        if (type is null)
        {
            throw new InvalidOperationException("isinstance expects a value and a node/type symbol.");
        }

        return arguments[0] is not null && type.IsInstanceOfType(arguments[0]);
    }

    private static object? CreateBinOp(IReadOnlyList<object?> arguments)
    {
        if (arguments.Count != 3)
        {
            throw new InvalidOperationException("BinOp expects left node, operator text, and right node.");
        }

        var op = NormalizeScalar(arguments[1]) as string
            ?? throw new InvalidOperationException("BinOp operator must be a string.");
        return new BinOpNode(ToAstNode(arguments[0]), op, ToAstNode(arguments[2]), SourceSpan.Empty);
    }

    private static object? CreateBracket(
        IReadOnlyList<object?> arguments,
        Func<IReadOnlyList<Node>, Node> factory)
    {
        if (arguments.Count != 1)
        {
            throw new InvalidOperationException("Bracket constructors expect exactly one node-sequence argument.");
        }

        return factory(CoerceNodes(arguments[0]));
    }

    private static IReadOnlyList<Node> CoerceNodes(object? value)
    {
        return value switch
        {
            Node node => [node],
            IReadOnlyList<Node> nodes => nodes.ToArray(),
            IEnumerable<Node> nodes => nodes.ToArray(),
            IReadOnlyList<object?> objects => objects.Select(ToAstNode).ToArray(),
            IEnumerable<object?> objects => objects.Select(ToAstNode).ToArray(),
            _ => throw new InvalidOperationException("Expected a node sequence."),
        };
    }

    private object? QuoteFromMeta(IReadOnlyList<Node> nodes, int quoteDepth = 0, bool allowSpecialForms = true)
    {
        var parsed = BaseFormatParser.ParseOperators(nodes);
        return parsed.Count switch
        {
            0 => QuoteValue(null, quoteDepth + 1, allowSpecialForms),
            1 => QuoteValue(parsed[0], quoteDepth + 1, allowSpecialForms),
            _ => parsed.Select(node => QuoteValue(node, quoteDepth + 1, allowSpecialForms)).ToArray(),
        };
    }

    private object? QuoteValue(object? value, int quoteDepth = 0, bool allowSpecialForms = true)
    {
        if (allowSpecialForms && value is CurlyBracketsNode curly)
        {
            if (IsUnquoteHead(curly))
            {
                if (quoteDepth > 1)
                {
                    return QuoteNode(curly, quoteDepth, allowSpecialForms: false);
                }

                var parsed = BaseFormatParser.ParseOperators(curly.Nodes.Skip(1).ToArray());
                if (parsed.Count == 0)
                {
                    return new IdentifierNode("null", SourceSpan.Empty);
                }

                var unquoted = EvaluateExpression(parsed[0]);
                return QuoteValue(unquoted, quoteDepth: 0, allowSpecialForms);
            }

            if (IsQuoteHead(curly))
            {
                return QuoteFromMeta(curly.Nodes.Skip(1).ToArray(), quoteDepth, allowSpecialForms);
            }
        }

        return value switch
        {
            null => new IdentifierNode("null", SourceSpan.Empty),
            bool b => new IdentifierNode(b ? "true" : "false", SourceSpan.Empty),
            long l => new NumberNode(l.ToString(System.Globalization.CultureInfo.InvariantCulture), string.Empty, SourceSpan.Empty),
            int i => new NumberNode(i.ToString(System.Globalization.CultureInfo.InvariantCulture), string.Empty, SourceSpan.Empty),
            double d => new NumberNode(d.ToString(System.Globalization.CultureInfo.InvariantCulture), string.Empty, SourceSpan.Empty),
            string s => new StringNode(QuoteStringLiteral(s), string.Empty, SourceSpan.Empty),
            Node node => QuoteNode(node, quoteDepth, allowSpecialForms),
            object?[] array => new SquareBracketsNode(
                array.Select(item => ToAstNode(item)).ToArray(),
                array.Select(item => ToAstNode(item)).ToArray(),
                SourceSpan.Empty),
            IEnumerable<object?> sequence => new SquareBracketsNode(
                sequence.Select(item => ToAstNode(item)).ToArray(),
                sequence.Select(item => ToAstNode(item)).ToArray(),
                SourceSpan.Empty),
            _ => throw new InvalidOperationException($"Unsupported quoted meta value type: {value.GetType().Name}"),
        };
    }

    private Node QuoteNode(Node node, int quoteDepth, bool allowSpecialForms)
    {
        if (allowSpecialForms && node is CurlyBracketsNode specialCurly)
        {
            if (IsUnquoteHead(specialCurly))
            {
                if (quoteDepth > 1)
                {
                    return QuoteNode(specialCurly, quoteDepth, allowSpecialForms: false);
                }

                var parsed = BaseFormatParser.ParseOperators(specialCurly.Nodes.Skip(1).ToArray());
                if (parsed.Count == 0)
                {
                    return new IdentifierNode("null", SourceSpan.Empty);
                }

                return ToAstNode(EvaluateExpression(parsed[0]));
            }

            if (IsQuoteHead(specialCurly))
            {
                return ToAstNode(QuoteFromMeta(specialCurly.Nodes.Skip(1).ToArray(), quoteDepth, allowSpecialForms));
            }
        }

        return node switch
        {
            IdentifierNode identifier => new IdentifierNode(identifier.Value, SourceSpan.Empty),
            StringNode str => new StringNode(str.Value, str.Suffix, SourceSpan.Empty),
            NumberNode number => new NumberNode(number.Value, number.Suffix, SourceSpan.Empty),
            OperatorNode op => new OperatorNode(op.Value, SourceSpan.Empty),
            CommentNode comment => new CommentNode(comment.Value, SourceSpan.Empty),
            WhitespaceNode whitespace => new WhitespaceNode(whitespace.Value, SourceSpan.Empty),
            UnknownNode unknown => new UnknownNode(unknown.Value, SourceSpan.Empty),
            BinOpNode binOp => new BinOpNode(
                QuoteNode(binOp.Left, quoteDepth, allowSpecialForms),
                binOp.Operator,
                QuoteNode(binOp.Right, quoteDepth, allowSpecialForms),
                SourceSpan.Empty),
            SequenceNode sequence => new SequenceNode(
                sequence.Nodes.Select(child => QuoteNode(child, quoteDepth, allowSpecialForms)).ToArray(),
                sequence.OriginalNodes.Select(child => QuoteNode(child, quoteDepth, allowSpecialForms)).ToArray(),
                SourceSpan.Empty),
            RoundBracketsNode round => new RoundBracketsNode(
                round.Nodes.Select(child => QuoteNode(child, quoteDepth, allowSpecialForms)).ToArray(),
                round.OriginalNodes.Select(child => QuoteNode(child, quoteDepth, allowSpecialForms)).ToArray(),
                SourceSpan.Empty),
            SquareBracketsNode square => new SquareBracketsNode(
                square.Nodes.Select(child => QuoteNode(child, quoteDepth, allowSpecialForms)).ToArray(),
                square.OriginalNodes.Select(child => QuoteNode(child, quoteDepth, allowSpecialForms)).ToArray(),
                SourceSpan.Empty),
            CurlyBracketsNode curly => new CurlyBracketsNode(
                curly.Nodes.Select(child => QuoteNode(child, quoteDepth, allowSpecialForms)).ToArray(),
                curly.OriginalNodes.Select(child => QuoteNode(child, quoteDepth, allowSpecialForms)).ToArray(),
                SourceSpan.Empty),
            _ => throw new InvalidOperationException($"Unsupported quoted node type: {node.GetType().Name}"),
        };
    }

    private Node SubstituteRuntimeNode(Node node)
    {
        if (node is IdentifierNode identifier
            && symbols.TryGetValue(identifier.Value, out var value)
            && CanSubstituteRuntimeValue(value))
        {
            return ToAstNode(value);
        }

        return node switch
        {
            SequenceNode sequence => sequence with
            {
                Nodes = sequence.Nodes.Select(SubstituteRuntimeNode).ToArray(),
                OriginalNodes = sequence.OriginalNodes.Select(SubstituteRuntimeOriginalNode).ToArray(),
            },
            RoundBracketsNode round => round with
            {
                Nodes = round.Nodes.Select(SubstituteRuntimeNode).ToArray(),
                OriginalNodes = round.OriginalNodes.Select(SubstituteRuntimeOriginalNode).ToArray(),
            },
            SquareBracketsNode square => square with
            {
                Nodes = square.Nodes.Select(SubstituteRuntimeNode).ToArray(),
                OriginalNodes = square.OriginalNodes.Select(SubstituteRuntimeOriginalNode).ToArray(),
            },
            CurlyBracketsNode curly when IsQuoteHead(curly) => curly,
            CurlyBracketsNode curly => curly with
            {
                Nodes = curly.Nodes.Select(SubstituteRuntimeNode).ToArray(),
                OriginalNodes = curly.OriginalNodes.Select(SubstituteRuntimeOriginalNode).ToArray(),
            },
            BinOpNode binOp => binOp with
            {
                Left = SubstituteRuntimeNode(binOp.Left),
                Right = SubstituteRuntimeNode(binOp.Right),
            },
            _ => node,
        };
    }

    private Node SubstituteRuntimeOriginalNode(Node node)
    {
        return node is IdentifierNode identifier
            && symbols.TryGetValue(identifier.Value, out var value)
            && CanSubstituteRuntimeValue(value)
            ? ToAstNode(value)
            : SubstituteRuntimeNode(node);
    }

    private static bool CanSubstituteRuntimeValue(object? value)
    {
        return value switch
        {
            null => true,
            bool => true,
            long => true,
            int => true,
            double => true,
            string => true,
            Node => true,
            object?[] array => array.All(CanSubstituteRuntimeValue),
            IEnumerable<Node> => true,
            IEnumerable<object?> objects => objects.All(CanSubstituteRuntimeValue),
            _ => false,
        };
    }

    private static Node ToAstNode(object? value)
    {
        return value switch
        {
            null => new IdentifierNode("null", SourceSpan.Empty),
            bool b => new IdentifierNode(b ? "true" : "false", SourceSpan.Empty),
            long l => new NumberNode(l.ToString(System.Globalization.CultureInfo.InvariantCulture), string.Empty, SourceSpan.Empty),
            int i => new NumberNode(i.ToString(System.Globalization.CultureInfo.InvariantCulture), string.Empty, SourceSpan.Empty),
            double d => new NumberNode(d.ToString(System.Globalization.CultureInfo.InvariantCulture), string.Empty, SourceSpan.Empty),
            string s => new StringNode(QuoteStringLiteral(s), string.Empty, SourceSpan.Empty),
            Node node => node,
            object?[] array => new SquareBracketsNode(
                array.Select(ToAstNode).ToArray(),
                array.Select(ToAstNode).ToArray(),
                SourceSpan.Empty),
            IEnumerable<object?> sequence => new SquareBracketsNode(
                sequence.Select(ToAstNode).ToArray(),
                sequence.Select(ToAstNode).ToArray(),
                SourceSpan.Empty),
            _ => throw new InvalidOperationException($"Unsupported meta substitution value type: {value.GetType().Name}"),
        };
    }

    private static object? Add(object? left, object? right)
    {
        left = NormalizeScalar(left);
        right = NormalizeScalar(right);

        if (TryAsSequence(left, out var leftSequence) && TryAsSequence(right, out var rightSequence))
        {
            return leftSequence.Concat(rightSequence).ToArray();
        }

        if (left is string || right is string)
        {
            return Convert.ToString(left, System.Globalization.CultureInfo.InvariantCulture)
                + Convert.ToString(right, System.Globalization.CultureInfo.InvariantCulture);
        }

        if (IsFloating(left) || IsFloating(right))
        {
            return Convert.ToDouble(left, System.Globalization.CultureInfo.InvariantCulture)
                + Convert.ToDouble(right, System.Globalization.CultureInfo.InvariantCulture);
        }

        return Convert.ToInt64(left, System.Globalization.CultureInfo.InvariantCulture)
            + Convert.ToInt64(right, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static object? Subtract(object? left, object? right)
    {
        left = NormalizeScalar(left);
        right = NormalizeScalar(right);

        if (IsFloating(left) || IsFloating(right))
        {
            return Convert.ToDouble(left, System.Globalization.CultureInfo.InvariantCulture)
                - Convert.ToDouble(right, System.Globalization.CultureInfo.InvariantCulture);
        }

        return Convert.ToInt64(left, System.Globalization.CultureInfo.InvariantCulture)
            - Convert.ToInt64(right, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static object? Multiply(object? left, object? right)
    {
        left = NormalizeScalar(left);
        right = NormalizeScalar(right);

        if (IsFloating(left) || IsFloating(right))
        {
            return Convert.ToDouble(left, System.Globalization.CultureInfo.InvariantCulture)
                * Convert.ToDouble(right, System.Globalization.CultureInfo.InvariantCulture);
        }

        return Convert.ToInt64(left, System.Globalization.CultureInfo.InvariantCulture)
            * Convert.ToInt64(right, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static object? Divide(object? left, object? right)
    {
        left = NormalizeScalar(left);
        right = NormalizeScalar(right);

        return Convert.ToDouble(left, System.Globalization.CultureInfo.InvariantCulture)
            / Convert.ToDouble(right, System.Globalization.CultureInfo.InvariantCulture);
    }

    private static int Compare(object? left, object? right)
    {
        left = NormalizeScalar(left);
        right = NormalizeScalar(right);

        if (left is string ls && right is string rs)
        {
            return string.CompareOrdinal(ls, rs);
        }

        var leftNumber = Convert.ToDouble(left, System.Globalization.CultureInfo.InvariantCulture);
        var rightNumber = Convert.ToDouble(right, System.Globalization.CultureInfo.InvariantCulture);
        return leftNumber.CompareTo(rightNumber);
    }

    private static bool IsFloating(object? value) =>
        NormalizeScalar(value) is double or float or decimal;

    private bool TryExecuteNamedFunctionDefinition(CurlyBracketsNode curly)
    {
        if (curly.Nodes.Count < 4
            || curly.Nodes[0] is not IdentifierNode { Value: "fun" }
            || curly.Nodes[1] is not IdentifierNode name
            || curly.Nodes[2] is not SquareBracketsNode parameters)
        {
            return false;
        }

        var parameterNames = parameters.Nodes
            .Select(static parameter => parameter as IdentifierNode ?? throw new InvalidOperationException("Meta function parameters must be identifiers."))
            .Select(static parameter => parameter.Value)
            .ToArray();
        var body = BaseFormatParser.ParseOperators(curly.Nodes.Skip(3).ToArray());
        symbols[name.Value] = new MetaFunction(parameterNames, body);
        return true;
    }

    private object? ExecuteWhen(CurlyBracketsNode curly)
    {
        if (curly.Nodes.Count < 2)
        {
            throw new InvalidOperationException("when expects a condition and optional body.");
        }

        if (IsTruthy(EvaluateExpression(curly.Nodes[1])))
        {
            return ExecuteStatements(curly.Nodes.Skip(2));
        }

        return null;
    }

    private object? ExecuteWhile(CurlyBracketsNode curly)
    {
        if (curly.Nodes.Count < 2)
        {
            throw new InvalidOperationException("while expects a condition and optional body.");
        }

        object? last = null;
        while (IsTruthy(EvaluateExpression(curly.Nodes[1])))
        {
            try
            {
                last = ExecuteStatements(curly.Nodes.Skip(2));
            }
            catch (MetaContinue)
            {
                continue;
            }
            catch (MetaBreak)
            {
                break;
            }
        }

        return last;
    }

    private object? ExecuteFor(CurlyBracketsNode curly)
    {
        if (curly.Nodes.Count < 3 || curly.Nodes[1] is not IdentifierNode loopVariable)
        {
            throw new InvalidOperationException("for expects a loop variable, iterable, and optional body.");
        }

        var snapshot = CaptureSymbols([loopVariable.Value]);
        object? last = null;

        try
        {
            foreach (var item in Enumerate(EvaluateExpression(curly.Nodes[2])))
            {
                symbols[loopVariable.Value] = item;
                try
                {
                    last = ExecuteStatements(curly.Nodes.Skip(3));
                }
                catch (MetaContinue)
                {
                    continue;
                }
                catch (MetaBreak)
                {
                    break;
                }
            }

            return last;
        }
        finally
        {
            RestoreSymbols(snapshot);
        }
    }

    private object? EvaluateIf(CurlyBracketsNode curly)
    {
        var parts = curly.Nodes.Skip(1).ToArray();
        return parts.Length switch
        {
            0 => null,
            1 => EvaluateExpression(parts[0]),
            _ => EvaluateIfParts(parts, 0),
        };
    }

    private object? EvaluateIfParts(IReadOnlyList<Node> parts, int index)
    {
        if (index >= parts.Count)
        {
            return null;
        }

        if (index == parts.Count - 1)
        {
            return EvaluateExpression(parts[index]);
        }

        return IsTruthy(EvaluateExpression(parts[index]))
            ? EvaluateExpression(parts[index + 1])
            : EvaluateIfParts(parts, index + 2);
    }

    private object? EvaluateMatch(CurlyBracketsNode curly)
    {
        if (curly.Nodes.Count < 3)
        {
            throw new InvalidOperationException("match form must be {match value pattern} or {match value pattern result ...}.");
        }

        var value = EvaluateExpression(curly.Nodes[1]);
        if (curly.Nodes.Count == 3)
        {
            return MakrellCompilerRuntime.PatternMatches(value, curly.Nodes[2]);
        }

        var clauseNodes = curly.Nodes.Skip(2).ToArray();
        if (clauseNodes.Length % 2 != 0)
        {
            throw new InvalidOperationException("match form requires pattern/result pairs.");
        }

        for (var i = 0; i < clauseNodes.Length; i += 2)
        {
            var match = MakrellCompilerRuntime.MatchWithBindings(value, clauseNodes[i]);
            if (!match.IsMatch)
            {
                continue;
            }

            var bindings = match.Bindings;
            var clauseResult = clauseNodes[i + 1];
            if (TryGetGuardedMatchClause(clauseResult, out var guardNode, out var guardedResultNodes))
            {
                var guardPassed = EvaluateWithBindings(bindings, () => IsTruthy(EvaluateExpression(guardNode)));
                if (!guardPassed)
                {
                    continue;
                }

                return EvaluateWithBindings(bindings, () => EvaluateMatchClauseResult(guardedResultNodes));
            }

            return EvaluateWithBindings(bindings, () => EvaluateMatchClauseResult([clauseResult]));
        }

        return null;
    }

    private object? EvaluateMatchClauseResult(IReadOnlyList<Node> resultNodes)
    {
        return resultNodes.Count switch
        {
            0 => null,
            1 when resultNodes[0] is SequenceNode sequence => ExecuteStatements(sequence.Nodes),
            1 => EvaluateExpression(resultNodes[0]),
            _ => ExecuteStatements(resultNodes),
        };
    }

    private T EvaluateWithBindings<T>(IReadOnlyDictionary<string, object?> bindings, Func<T> action)
    {
        var snapshots = CaptureSymbols(bindings.Keys);
        try
        {
            foreach (var binding in bindings)
            {
                symbols[binding.Key] = binding.Value;
            }

            return action();
        }
        finally
        {
            RestoreSymbols(snapshots);
        }
    }

    private object? InvokeFunction(MetaFunction function, IReadOnlyList<object?> arguments)
    {
        var namesToRestore = function.ParameterNames
            .Concat(CollectAssignedNames(function.Body))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        var snapshots = CaptureSymbols(namesToRestore);

        try
        {
            for (var i = 0; i < function.ParameterNames.Count; i += 1)
            {
                symbols[function.ParameterNames[i]] = i < arguments.Count ? arguments[i] : null;
            }

            try
            {
                return ExecuteStatements(function.Body);
            }
            catch (MetaReturn ret)
            {
                return ret.Value;
            }
        }
        finally
        {
            RestoreSymbols(snapshots);
        }
    }

    private object? EvaluateReturnValue(CurlyBracketsNode curly)
    {
        if (curly.Nodes.Count <= 1)
        {
            return null;
        }

        var parsed = BaseFormatParser.ParseOperators(curly.Nodes.Skip(1).ToArray());
        return parsed.Count switch
        {
            0 => null,
            1 => EvaluateExpression(parsed[0]),
            _ => parsed.Select(EvaluateExpression).ToArray(),
        };
    }

    private static bool IsTruthy(object? value)
    {
        value = NormalizeScalar(value);

        return value switch
        {
            null => false,
            false => false,
            true => true,
            string text => text.Length > 0,
            Array array => array.Length > 0,
            ICollection<Node> nodes => nodes.Count > 0,
            ICollection<object?> objects => objects.Count > 0,
            IEnumerable<Node> nodes => nodes.Any(),
            IEnumerable<object?> objects => objects.Any(),
            long l => l != 0,
            int i => i != 0,
            double d => d != 0d,
            _ => true,
        };
    }

    private IReadOnlyList<Node> ExecuteDefinedMacro(
        IReadOnlyList<string> parameterNames,
        IReadOnlyList<Node> body,
        MacroInvocation invocation)
    {
        var namesToRestore = parameterNames
            .Concat(CollectAssignedNames(body))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        var snapshots = CaptureSymbols(namesToRestore);

        try
        {
            if (parameterNames.Count == 1)
            {
                symbols[parameterNames[0]] = invocation.OriginalArguments.ToArray();
            }
            else
            {
                for (var i = 0; i < parameterNames.Count; i += 1)
                {
                    symbols[parameterNames[i]] = i < invocation.RegularArguments.Count
                        ? invocation.RegularArguments[i]
                        : null;
                }
            }

            var result = ExecuteStatements(body);
            return CoerceMacroResult(result);
        }
        finally
        {
            RestoreSymbols(snapshots);
        }
    }

    private List<SymbolSnapshot> CaptureSymbols(IEnumerable<string> names)
    {
        var snapshots = new List<SymbolSnapshot>();
        foreach (var name in names)
        {
            snapshots.Add(symbols.TryGetValue(name, out var value)
                ? new SymbolSnapshot(name, true, value)
                : new SymbolSnapshot(name, false, null));
        }

        return snapshots;
    }

    private void RestoreSymbols(IEnumerable<SymbolSnapshot> snapshots)
    {
        foreach (var snapshot in snapshots)
        {
            if (snapshot.Exists)
            {
                symbols[snapshot.Name] = snapshot.Value;
            }
            else
            {
                symbols.Remove(snapshot.Name);
            }
        }
    }

    private static IEnumerable<string> CollectAssignedNames(IEnumerable<Node> nodes)
    {
        foreach (var node in nodes)
        {
            foreach (var name in CollectAssignedNames(node))
            {
                yield return name;
            }
        }
    }

    private static IEnumerable<string> CollectAssignedNames(Node node)
    {
        switch (node)
        {
            case BinOpNode { Operator: "=" } assignment when assignment.Left is IdentifierNode identifier:
                yield return identifier.Value;
                foreach (var nested in CollectAssignedNames(assignment.Right))
                {
                    yield return nested;
                }

                yield break;
            case SequenceNode sequence:
                foreach (var nested in CollectAssignedNames(sequence.Nodes))
                {
                    yield return nested;
                }

                yield break;
            case RoundBracketsNode round:
                foreach (var nested in CollectAssignedNames(round.Nodes))
                {
                    yield return nested;
                }

                yield break;
            case SquareBracketsNode square:
                foreach (var nested in CollectAssignedNames(square.Nodes))
                {
                    yield return nested;
                }

                yield break;
            case CurlyBracketsNode curly:
                foreach (var nested in CollectAssignedNames(curly.Nodes))
                {
                    yield return nested;
                }

                yield break;
            case BinOpNode binOp:
                foreach (var nested in CollectAssignedNames(binOp.Left))
                {
                    yield return nested;
                }

                foreach (var nested in CollectAssignedNames(binOp.Right))
                {
                    yield return nested;
                }

                yield break;
        }
    }

    private static IReadOnlyList<Node> CoerceMacroResult(object? result)
    {
        return result switch
        {
            null => Array.Empty<Node>(),
            Node node => [node],
            IEnumerable<Node> nodes => nodes.ToArray(),
            object?[] array when array.All(static item => item is Node) => array.Cast<Node>().ToArray(),
            _ => throw new InvalidOperationException($"Macro result must be a node or node sequence, found {result.GetType().Name}."),
        };
    }

    private static object? RegularizeMetaValue(object? value)
    {
        return value switch
        {
            IReadOnlyList<Node> nodes => RegularNodes.Filter(nodes).ToArray(),
            IEnumerable<Node> nodes => RegularNodes.Filter(nodes).ToArray(),
            object?[] array when array.All(static item => item is Node) => RegularNodes.Filter(array.Cast<Node>()).ToArray(),
            _ => throw new InvalidOperationException("regular expects a node sequence."),
        };
    }

    private static long GetMetaLength(object? value)
    {
        return value switch
        {
            string text => text.Length,
            Array array => array.Length,
            IReadOnlyCollection<Node> nodes => nodes.Count,
            IReadOnlyCollection<object?> objects => objects.Count,
            ICollection<Node> nodes => nodes.Count,
            ICollection<object?> objects => objects.Count,
            IEnumerable<Node> nodes => nodes.Count(),
            IEnumerable<object?> objects => objects.Count(),
            _ => throw new InvalidOperationException("len expects a sized value."),
        };
    }

    private static object? EvaluateIndex(object? left, object? right)
    {
        var index = Convert.ToInt32(right, System.Globalization.CultureInfo.InvariantCulture);

        return left switch
        {
            object?[] array => array[index],
            IReadOnlyList<Node> nodes => nodes[index],
            IReadOnlyList<object?> objects => objects[index],
            IList<Node> nodes => nodes[index],
            IList<object?> objects => objects[index],
            string text => text[index].ToString(),
            _ => throw new InvalidOperationException("Index operator expects an indexable value."),
        };
    }

    private static bool TryAsSequence(object? value, out object?[] sequence)
    {
        switch (value)
        {
            case null:
            case string:
            case Node:
                sequence = Array.Empty<object?>();
                return false;
            case object?[] array:
                sequence = array;
                return true;
            case IEnumerable<Node> nodes:
                sequence = nodes.Cast<object?>().ToArray();
                return true;
            case IEnumerable<object?> objects:
                sequence = objects.ToArray();
                return true;
            default:
                sequence = Array.Empty<object?>();
                return false;
        }
    }

    private static object? NormalizeScalar(object? value)
    {
        return value switch
        {
            NumberNode number => EvaluateNumber(number),
            StringNode str => EvaluateString(str),
            IdentifierNode { Value: "true" } => true,
            IdentifierNode { Value: "false" } => false,
            IdentifierNode { Value: "null" } => null,
            _ => value,
        };
    }

    private void ReplayImportedAssembly(string assemblyPath)
    {
        var fullPath = Path.GetFullPath(assemblyPath);
        if (!importedAssemblyPaths.Add(fullPath))
        {
            return;
        }

        var assembly = Assembly.LoadFrom(fullPath);
        var importedSources = MakrellMetaManifest.GetSources(assembly);
        foreach (var importedSource in importedSources)
        {
            var parsed = BaseFormatParser.ParseStructure(importedSource);
            _ = ProcessNodes(parsed, collectReplaySources: false);
        }
    }

    private void RecordReplaySource(Node node)
    {
        var start = node.Span.Start.Index;
        var end = node.Span.End.Index;
        if (start < 0 || end < start || end > source.Length)
        {
            return;
        }

        replaySources.Add(source[start..end]);
    }

    private static bool IsQuoteHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "quote" };

    private static bool IsUnquoteHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "unquote" or "$" };

    private static bool IsForHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "for" };

    private static bool IsWhenHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "when" };

    private static bool IsWhileHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "while" };

    private static bool IsBreakHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "break" };

    private static bool IsContinueHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "continue" };

    private static bool IsReturnHead(CurlyBracketsNode curly) =>
        curly.Nodes.Count > 0 && curly.Nodes[0] is IdentifierNode { Value: "return" };

    private static bool TryGetGuardedMatchClause(Node clauseResult, out Node guardNode, out IReadOnlyList<Node> guardedResultNodes)
    {
        if (clauseResult is CurlyBracketsNode
            {
                Nodes.Count: >= 3,
                Nodes:
                [
                    IdentifierNode { Value: "when" },
                    ..
                ]
            } guarded)
        {
            guardNode = guarded.Nodes[1];
            guardedResultNodes = guarded.Nodes.Skip(2).ToArray();
            return true;
        }

        guardNode = null!;
        guardedResultNodes = [];
        return false;
    }

    private static string QuoteStringLiteral(string text) =>
        "\"" + text.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal) + "\"";

    private static IEnumerable<object?> Enumerate(object? value)
    {
        return value switch
        {
            null => Array.Empty<object?>(),
            string text => text.Select(ch => (object?)ch.ToString()),
            object?[] array => array,
            IEnumerable<Node> nodes => nodes.Cast<object?>(),
            IEnumerable<object?> objects => objects,
            _ => throw new InvalidOperationException("for expects an enumerable value."),
        };
    }

    private sealed record SymbolSnapshot(string Name, bool Exists, object? Value);
    private sealed record MetaFunction(IReadOnlyList<string> ParameterNames, IReadOnlyList<Node> Body);
    private sealed record MetaBuiltin(Func<IReadOnlyList<object?>, object?> Implementation);
    private sealed record MetaConstructor(Type NodeType, Func<IReadOnlyList<object?>, object?> Implementation);
    private sealed class MetaReturn(object? value) : Exception
    {
        public object? Value { get; } = value;
    }
    private sealed class MetaBreak : Exception;
    private sealed class MetaContinue : Exception;
}
