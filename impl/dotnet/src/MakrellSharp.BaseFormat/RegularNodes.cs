using MakrellSharp.Ast;

namespace MakrellSharp.BaseFormat;

public static class RegularNodes
{
    public static IReadOnlyList<Node> Filter(IEnumerable<Node> nodes, bool recurse = false)
    {
        return recurse
            ? nodes.Where(IsRegular).Select(Rewrite).ToArray()
            : nodes.Where(IsRegular).ToArray();
    }

    public static bool IsRegular(Node node) =>
        node is not CommentNode and not WhitespaceNode and not UnknownNode;

    public static IReadOnlyList<Node> RemoveWhitespace(IEnumerable<Node> nodes, bool recurse = false)
    {
        return recurse
            ? nodes.Where(static node => node is not WhitespaceNode).Select(RemoveWhitespaceRecursive).ToArray()
            : nodes.Where(static node => node is not WhitespaceNode).ToArray();
    }

    private static Node Rewrite(Node node)
    {
        return node switch
        {
            SequenceNode sequence => sequence with { Nodes = Filter(sequence.OriginalNodes, recurse: true) },
            RoundBracketsNode round => round with { Nodes = Filter(round.OriginalNodes, recurse: true) },
            SquareBracketsNode square => square with { Nodes = Filter(square.OriginalNodes, recurse: true) },
            CurlyBracketsNode curly => curly with { Nodes = Filter(curly.OriginalNodes, recurse: true) },
            BinOpNode binOp => binOp with
            {
                Left = Rewrite(binOp.Left),
                Right = Rewrite(binOp.Right),
            },
            _ => node,
        };
    }

    private static Node RemoveWhitespaceRecursive(Node node)
    {
        return node switch
        {
            SequenceNode sequence => sequence with { Nodes = RemoveWhitespace(sequence.OriginalNodes, recurse: true) },
            RoundBracketsNode round => round with { Nodes = RemoveWhitespace(round.OriginalNodes, recurse: true) },
            SquareBracketsNode square => square with { Nodes = RemoveWhitespace(square.OriginalNodes, recurse: true) },
            CurlyBracketsNode curly => curly with { Nodes = RemoveWhitespace(curly.OriginalNodes, recurse: true) },
            BinOpNode binOp => binOp with
            {
                Left = RemoveWhitespaceRecursive(binOp.Left),
                Right = RemoveWhitespaceRecursive(binOp.Right),
            },
            _ => node,
        };
    }
}
