using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.Compiler;

public sealed class MacroContext
{
    public IReadOnlyList<Node> Regularize(IEnumerable<Node> nodes, bool recurse = false) =>
        RegularNodes.Filter(nodes, recurse);

    public IReadOnlyList<Node> RemoveWhitespace(IEnumerable<Node> nodes, bool recurse = false) =>
        RegularNodes.RemoveWhitespace(nodes, recurse);

    public IReadOnlyList<Node> Parse(string source, BaseFormatParseOptions? options = null, DiagnosticBag? diagnostics = null) =>
        BaseFormatParser.ParseStructure(source, options, diagnostics);

    public IReadOnlyList<Node> OperatorParse(IEnumerable<Node> nodes) =>
        BaseFormatParser.ParseOperators(nodes);
}
