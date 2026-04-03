using System.Text.Json.Nodes;
using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.Mrtd;

internal static class MrtdJsonValueConverter
{
    public static JsonNode? ParseValue(Node node)
    {
        var scalar = MrtdScalarConverter.ConvertScalar(node, MrtdParseOptions.Default);
        if (node is IdentifierNode or StringNode or NumberNode)
        {
            return JsonValue.Create(scalar);
        }

        return node switch
        {
            SquareBracketsNode square => ParseArray(square),
            CurlyBracketsNode curly => ParseObject(RegularNodes.Filter(curly.Nodes).ToArray()),
            SequenceNode sequence => ParseObject(RegularNodes.Filter(sequence.Nodes).ToArray()),
            _ => throw new InvalidOperationException($"Unsupported MRTD value node: {node.GetType().Name}"),
        };
    }

    public static JsonObject ParseObject(IReadOnlyList<Node> nodes)
    {
        if (nodes.Count % 2 != 0)
        {
            throw new InvalidOperationException("MRTD object values require key/value pairs.");
        }

        var obj = new JsonObject();
        for (var i = 0; i < nodes.Count; i += 2)
        {
            var key = ParseKey(nodes[i]);
            obj[key] = ParseValue(nodes[i + 1]);
        }

        return obj;
    }

    private static JsonArray ParseArray(SquareBracketsNode square)
    {
        var array = new JsonArray();
        foreach (var child in RegularNodes.Filter(square.Nodes))
        {
            array.Add(ParseValue(child));
        }

        return array;
    }

    private static string ParseKey(Node node)
    {
        return MrtdScalarConverter.ConvertScalar(node, MrtdParseOptions.Default) switch
        {
            null => throw new InvalidOperationException("MRTD object key cannot be null."),
            string key => key,
            _ => throw new InvalidOperationException("MRTD object key must be a string-compatible scalar."),
        };
    }
}
