using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MakrellSharp.Mron;

public static class MronParser
{
    public static JsonDocument ParseSource(string source, MronParseOptions? options = null, DiagnosticBag? diagnostics = null)
    {
        options ??= MronParseOptions.Default;
        var nodes = BaseFormatParser.ParseStructure(source, options.BaseFormat, diagnostics);
        return ParseNodes(nodes, options);
    }

    public static JsonDocument ParseNodes(IEnumerable<Node> nodes, MronParseOptions? options = null)
    {
        options ??= MronParseOptions.Default;
        var regularNodes = RegularNodes.Filter(nodes).ToArray();
        var node = ParseRoot(regularNodes, options);
        return ToJsonDocument(node);
    }

    private static JsonNode? ParseRoot(IReadOnlyList<Node> nodes, MronParseOptions options)
    {
        return nodes.Count switch
        {
            0 => null,
            1 => ParseValue(nodes[0], options),
            _ when nodes.Count % 2 == 0 => ParseObject(nodes, options),
            _ => throw new InvalidOperationException($"Illegal number ({nodes.Count}) of root level expressions"),
        };
    }

    private static JsonNode? ParseValue(Node node, MronParseOptions options)
    {
        var scalar = MronScalarConverter.ConvertScalar(node);
        if (node is IdentifierNode or StringNode or NumberNode)
        {
            return JsonValue.Create(scalar);
        }

        return node switch
        {
            SquareBracketsNode square => ParseArray(square, options),
            CurlyBracketsNode curly => ParseCurly(curly, options),
            SequenceNode sequence => ParseObject(RegularNodes.Filter(sequence.Nodes), options),
            _ => throw new InvalidOperationException($"Unknown node type: {node.GetType().Name}"),
        };
    }

    private static JsonArray ParseArray(SquareBracketsNode square, MronParseOptions options)
    {
        var array = new JsonArray();
        foreach (var child in RegularNodes.Filter(square.Nodes))
        {
            array.Add(ParseValue(child, options));
        }

        return array;
    }

    private static JsonNode? ParseCurly(CurlyBracketsNode curly, MronParseOptions options)
    {
        var nodes = RegularNodes.Filter(curly.Nodes).ToArray();
        if (options.AllowExec
            && nodes.Length >= 1
            && nodes[0] is IdentifierNode identifier
            && identifier.Value == "$")
        {
            throw new NotSupportedException("MRON executable embeds are not implemented yet in Makrell#.");
        }

        return ParseObject(nodes, options);
    }

    private static JsonObject ParseObject(IReadOnlyList<Node> nodes, MronParseOptions options)
    {
        if (nodes.Count % 2 != 0)
        {
            throw new InvalidOperationException("Odd number of tokens");
        }

        var obj = new JsonObject();
        for (var i = 0; i < nodes.Count; i += 2)
        {
            var key = ParseKey(nodes[i]);
            var value = ParseValue(nodes[i + 1], options);
            obj[key] = value;
        }

        return obj;
    }

    private static string ParseKey(Node node)
    {
        return MronScalarConverter.ConvertScalar(node) switch
        {
            null => throw new InvalidOperationException("MRON object key cannot be null."),
            string key => key,
            _ => throw new InvalidOperationException("MRON object key must be a string-compatible scalar."),
        };
    }

    private static JsonDocument ToJsonDocument(JsonNode? node)
    {
        if (node is null)
        {
            return JsonDocument.Parse("null");
        }

        return JsonDocument.Parse(node.ToJsonString());
    }
}
