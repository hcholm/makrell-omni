using MakrellSharp.Ast;

namespace MakrellSharp.BaseFormat;

public static class BaseFormatParser
{
    public static IReadOnlyList<Node> ParseStructure(
        string source,
        BaseFormatParseOptions? options = null,
        DiagnosticBag? diagnostics = null)
    {
        options ??= BaseFormatParseOptions.Default;
        var tokens = Tokenizer.Tokenize(source);
        var nodes = BracketParser.Parse(tokens, diagnostics);
        return options.PreserveWhitespaceNodes
            ? nodes
            : RegularNodes.RemoveWhitespace(nodes, recurse: true);
    }

    public static IReadOnlyList<Node> ParseOperators(
        IEnumerable<Node> nodes,
        Func<string, (int Precedence, Associativity Associativity)>? precedenceLookup = null)
    {
        return OperatorParser.Parse(RegularNodes.Filter(nodes), precedenceLookup);
    }

    public static IReadOnlyList<Node> ParseAll(
        string source,
        BaseFormatParseOptions? options = null,
        DiagnosticBag? diagnostics = null)
    {
        var parsed = ParseStructure(source, options, diagnostics);
        return ParseOperators(parsed);
    }
}
