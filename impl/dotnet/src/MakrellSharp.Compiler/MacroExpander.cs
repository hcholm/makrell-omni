using MakrellSharp.Ast;

namespace MakrellSharp.Compiler;

public sealed class MacroExpander
{
    private readonly MacroRegistry registry;
    private readonly MacroContext context;

    public MacroExpander(MacroRegistry registry, MacroContext? context = null)
    {
        this.registry = registry ?? throw new ArgumentNullException(nameof(registry));
        this.context = context ?? new MacroContext();
    }

    public IReadOnlyList<Node> Expand(IEnumerable<Node> nodes)
    {
        ArgumentNullException.ThrowIfNull(nodes);

        var output = new List<Node>();
        foreach (var node in nodes)
        {
            output.AddRange(ExpandNode(node));
        }

        return output;
    }

    private IReadOnlyList<Node> ExpandNode(Node node)
    {
        if (node is CurlyBracketsNode curly && TryExpandMacroInvocation(curly, out var expanded))
        {
            return Expand(expanded);
        }

        return
        [
            node switch
            {
                SequenceNode sequence => sequence with { Nodes = Expand(sequence.Nodes) },
                RoundBracketsNode round => round with { Nodes = Expand(round.Nodes) },
                SquareBracketsNode square => square with { Nodes = Expand(square.Nodes) },
                CurlyBracketsNode nestedCurly => nestedCurly with { Nodes = Expand(nestedCurly.Nodes) },
                BinOpNode binOp => binOp with
                {
                    Left = ExpandSingle(binOp.Left),
                    Right = ExpandSingle(binOp.Right),
                },
                _ => node,
            }
        ];
    }

    private Node ExpandSingle(Node node)
    {
        var expanded = ExpandNode(node);
        return expanded.Count switch
        {
            0 => throw new InvalidOperationException("Macro expansion cannot remove a required child node."),
            1 => expanded[0],
            _ => new SequenceNode(expanded, expanded, node.Span),
        };
    }

    private bool TryExpandMacroInvocation(CurlyBracketsNode curly, out IReadOnlyList<Node> expanded)
    {
        expanded = Array.Empty<Node>();

        if (curly.Nodes.Count == 0 || curly.Nodes[0] is not IdentifierNode nameNode)
        {
            return false;
        }

        if (!registry.TryGetNative(nameNode.Value, out var macro))
        {
            return false;
        }

        var originalIndex = FindHeadIndex(curly.OriginalNodes, nameNode);
        var originalArguments = originalIndex >= 0
            ? curly.OriginalNodes.Skip(originalIndex + 1).ToArray()
            : curly.OriginalNodes.ToArray();

        var invocation = new MacroInvocation(
            nameNode.Value,
            curly,
            curly.Nodes.Skip(1).ToArray(),
            originalArguments);

        expanded = macro(invocation, context);
        return true;
    }

    private static int FindHeadIndex(IReadOnlyList<Node> originalNodes, Node head)
    {
        for (var i = 0; i < originalNodes.Count; i += 1)
        {
            if (ReferenceEquals(originalNodes[i], head))
            {
                return i;
            }
        }

        return -1;
    }
}
