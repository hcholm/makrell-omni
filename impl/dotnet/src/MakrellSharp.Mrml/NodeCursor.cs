using MakrellSharp.Ast;

namespace MakrellSharp.Mrml;

internal sealed class NodeCursor(IReadOnlyList<Node> nodes)
{
    private int index;

    public bool HasMore => index < nodes.Count;

    public Node? Peek() => HasMore ? nodes[index] : null;

    public Node? Read()
    {
        if (!HasMore)
        {
            return null;
        }

        return nodes[index++];
    }

    public void SkipWhitespace()
    {
        while (Peek() is WhitespaceNode)
        {
            index += 1;
        }
    }
}
