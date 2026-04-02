using MakrellSharp.Ast;

namespace MakrellSharp.BaseFormat;

public static class OperatorParser
{
    public static IReadOnlyList<Node> Parse(
        IReadOnlyList<Node> nodes,
        Func<string, (int Precedence, Associativity Associativity)>? precedenceLookup = null)
    {
        ArgumentNullException.ThrowIfNull(nodes);

        precedenceLookup ??= OperatorTable.Lookup;

        var output = new List<Node>();
        var opStack = new Stack<OperatorNode>();
        var lastWasNotOperator = true;

        foreach (var rawNode in nodes)
        {
            var node = Transform(rawNode, precedenceLookup);
            if (node is OperatorNode op)
            {
                var (currentPrecedence, _) = precedenceLookup(op.Value);
                while (opStack.Count > 0)
                {
                    var top = opStack.Peek();
                    var (stackPrecedence, stackAssociativity) = precedenceLookup(top.Value);
                    if (stackPrecedence > currentPrecedence
                        || (stackPrecedence == currentPrecedence && stackAssociativity == Associativity.Left))
                    {
                        ApplyOne(output, opStack);
                    }
                    else
                    {
                        break;
                    }
                }

                opStack.Push(op);
                lastWasNotOperator = false;
                continue;
            }

            if (lastWasNotOperator)
            {
                ApplyAll(output, opStack);
            }

            output.Add(node);
            lastWasNotOperator = true;
        }

        ApplyAll(output, opStack);
        return output;
    }

    private static void ApplyAll(List<Node> output, Stack<OperatorNode> opStack)
    {
        while (opStack.Count > 0)
        {
            ApplyOne(output, opStack);
        }
    }

    private static void ApplyOne(List<Node> output, Stack<OperatorNode> opStack)
    {
        if (output.Count < 2 || opStack.Count == 0)
        {
            throw new InvalidOperationException("Malformed expression.");
        }

        var right = output[^1];
        output.RemoveAt(output.Count - 1);
        var left = output[^1];
        output.RemoveAt(output.Count - 1);
        var op = opStack.Pop();
        output.Add(new BinOpNode(left, op.Value, right, new SourceSpan(left.Span.Start, right.Span.End)));
    }

    private static Node Transform(Node node, Func<string, (int Precedence, Associativity Associativity)> precedenceLookup)
    {
        return node switch
        {
            SequenceNode sequence => sequence with { Nodes = Parse(sequence.Nodes, precedenceLookup) },
            RoundBracketsNode round => round with { Nodes = Parse(round.Nodes, precedenceLookup) },
            SquareBracketsNode square => square with { Nodes = Parse(square.Nodes, precedenceLookup) },
            CurlyBracketsNode curly => curly with { Nodes = Parse(curly.Nodes, precedenceLookup) },
            _ => node,
        };
    }
}
