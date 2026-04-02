using System.Xml.Linq;
using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.Mrml;

public static class MrmlParser
{
    public static XDocument ParseSource(string source, MrmlParseOptions? options = null, DiagnosticBag? diagnostics = null)
    {
        options ??= MrmlParseOptions.Default;

        var nodes = BaseFormatParser.ParseStructure(source, options.BaseFormat, diagnostics);
        var rootNodes = FilterMrmlNodes(nodes);
        if (rootNodes.Count == 0)
        {
            throw new InvalidOperationException("MRML source is empty.");
        }

        var root = ParseElement(rootNodes[0], options);
        return new XDocument(root);
    }

    public static XElement ParseElement(Node node, MrmlParseOptions? options = null)
    {
        options ??= MrmlParseOptions.Default;

        if (node is not CurlyBracketsNode curly)
        {
            throw new InvalidOperationException("Expected curly brackets as MRML element root.");
        }

        var nodes = FilterMrmlNodes(curly.Nodes);
        if (nodes.Count == 0)
        {
            throw new InvalidOperationException("Empty curly brackets.");
        }

        var cursor = new NodeCursor(nodes);
        var nameNode = cursor.Read() ?? throw new InvalidOperationException("Expected element name.");
        var element = new XElement(ParseElementName(nameNode));

        cursor.SkipWhitespace();
        if (cursor.Peek() is SquareBracketsNode attributeBlock)
        {
            cursor.Read();
            ReadAttributes(element, attributeBlock, options);
            cursor.SkipWhitespace();
        }

        XNode? tailHolder = null;
        while (cursor.HasMore)
        {
            var next = cursor.Read()!;
            if (next is CurlyBracketsNode childCurly)
            {
                if (options.AllowExec && IsExecBlock(childCurly))
                {
                    throw new NotSupportedException("MRML executable embeds are not implemented yet in Makrell#.");
                }

                var child = ParseElement(childCurly, options);
                element.Add(child);
                tailHolder = child;
                continue;
            }

            AppendText(element, ref tailHolder, NodeToText(next));
        }

        return element;
    }

    private static void ReadAttributes(XElement element, SquareBracketsNode attributeBlock, MrmlParseOptions options)
    {
        var attrs = BaseFormatParser.ParseOperators(attributeBlock.Nodes);
        foreach (var attr in attrs)
        {
            if (attr is not BinOpNode { Operator: "=" } assignment)
            {
                throw new InvalidOperationException("Expected attribute assignment.");
            }

            var name = NodeToText(assignment.Left);
            var value = assignment.Right switch
            {
                CurlyBracketsNode curly when options.AllowExec && IsExecBlock(curly) =>
                    throw new NotSupportedException("MRML executable embeds are not implemented yet in Makrell#."),
                CurlyBracketsNode =>
                    throw new InvalidOperationException("Expected attribute value."),
                _ => NodeToText(assignment.Right),
            };

            element.SetAttributeValue(name, value);
        }
    }

    private static string ParseElementName(Node node) =>
        node switch
        {
            IdentifierNode identifier => identifier.Value,
            StringNode str => TrimQuotes(str.Value),
            _ => throw new InvalidOperationException("Expected identifier or string element name."),
        };

    private static string NodeToText(Node node)
    {
        return node switch
        {
            IdentifierNode identifier => identifier.Value,
            StringNode str => TrimQuotes(str.Value),
            NumberNode number => number.Value + number.Suffix,
            WhitespaceNode whitespace => whitespace.Value,
            RoundBracketsNode round => "(" + string.Concat(FilterMrmlNodes(round.Nodes).Select(NodeToText)) + ")",
            SquareBracketsNode square => "[" + string.Concat(FilterMrmlNodes(square.Nodes).Select(NodeToText)) + "]",
            OperatorNode op => op.Value,
            _ => node.ToString() ?? string.Empty,
        };
    }

    private static bool IsExecBlock(CurlyBracketsNode curly)
    {
        var nodes = FilterMrmlNodes(curly.Nodes);
        return nodes.Count > 0
            && nodes[0] is IdentifierNode identifier
            && identifier.Value == "$";
    }

    private static string TrimQuotes(string raw) => raw.Length >= 2 ? raw[1..^1] : raw;

    private static IReadOnlyList<Node> FilterMrmlNodes(IEnumerable<Node> nodes)
    {
        return nodes.Where(static node => node is not CommentNode and not UnknownNode).ToArray();
    }

    private static void AppendText(XElement element, ref XNode? tailHolder, string text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return;
        }

        if (tailHolder is null)
        {
            if (element.LastNode is XText existingText)
            {
                existingText.Value += text;
            }
            else
            {
                element.Add(new XText(text));
            }

            return;
        }

        if (tailHolder.NextNode is XText tailText)
        {
            tailText.Value += text;
            return;
        }

        tailHolder.AddAfterSelf(new XText(text));
    }
}
