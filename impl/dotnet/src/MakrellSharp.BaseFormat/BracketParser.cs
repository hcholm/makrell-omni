using MakrellSharp.Ast;

namespace MakrellSharp.BaseFormat;

public static class BracketParser
{
    public static IReadOnlyList<Node> Parse(IReadOnlyList<Node> tokens, DiagnosticBag? diagnostics = null)
    {
        ArgumentNullException.ThrowIfNull(tokens);

        diagnostics ??= new DiagnosticBag();

        var frames = new Stack<Frame>();
        frames.Push(new Frame(null, null, []));

        foreach (var token in tokens)
        {
            switch (token)
            {
                case LeftBracketNode left:
                    frames.Push(new Frame(left, left.Value, []));
                    break;

                case RightBracketNode right:
                    if (frames.Count == 1)
                    {
                        throw new InvalidOperationException($"Unexpected closing bracket {right.Value}.");
                    }

                    var frame = frames.Pop();
                    if (!Matches(frame.OpenBracket, right.Value))
                    {
                        throw new InvalidOperationException($"Mismatched closing bracket {right.Value}.");
                    }

                    var node = MakeBracketNode(frame.OpenBracket!.Value, frame.Nodes, new SourceSpan(frame.OpenNode!.Span.Start, right.Span.End));
                    frames.Peek().Nodes.Add(node);
                    break;

                default:
                    frames.Peek().Nodes.Add(token);
                    break;
            }
        }

        if (frames.Count > 1)
        {
            var last = frames.Peek();
            diagnostics.Error("MBF001", "Unmatched opening bracket.", last.OpenNode?.Span);
        }

        return frames.First().Nodes;
    }

    private static bool Matches(char? open, char close) =>
        (open, close) switch
        {
            ('(', ')') => true,
            ('[', ']') => true,
            ('{', '}') => true,
            _ => false,
        };

    private static BracketNode MakeBracketNode(char open, IReadOnlyList<Node> nodes, SourceSpan span) =>
        open switch
        {
            '(' => new RoundBracketsNode(nodes.ToArray(), nodes.ToArray(), span),
            '[' => new SquareBracketsNode(nodes.ToArray(), nodes.ToArray(), span),
            '{' => new CurlyBracketsNode(nodes.ToArray(), nodes.ToArray(), span),
            _ => throw new InvalidOperationException($"Unknown opening bracket {open}."),
        };

    private sealed class Frame(LeftBracketNode? openNode, char? openBracket, List<Node> nodes)
    {
        public LeftBracketNode? OpenNode { get; } = openNode;

        public char? OpenBracket { get; } = openBracket;

        public List<Node> Nodes { get; } = nodes;
    }
}
