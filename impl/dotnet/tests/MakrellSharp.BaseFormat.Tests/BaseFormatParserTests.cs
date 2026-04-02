using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.BaseFormat.Tests;

public sealed class BaseFormatParserTests
{
    [Fact]
    public void Tokenizer_ParsesIdentifiersStringsNumbersAndComments()
    {
        const string source = """
        owner "Rena"tag
        count -42ms # note
        """;

        var tokens = Tokenizer.Tokenize(source);

        Assert.Collection(
            RegularNodes.Filter(tokens),
            token => Assert.IsType<IdentifierNode>(token),
            token =>
            {
                var str = Assert.IsType<StringNode>(token);
                Assert.Equal("\"Rena\"", str.Value);
                Assert.Equal("tag", str.Suffix);
            },
            token => Assert.IsType<IdentifierNode>(token),
            token =>
            {
                var number = Assert.IsType<NumberNode>(token);
                Assert.Equal("-42", number.Value);
                Assert.Equal("ms", number.Suffix);
            });
    }

    [Fact]
    public void BracketParser_BuildsNestedBracketTree()
    {
        const string source = "{a [2 3] {b c}}";

        var nodes = BaseFormatParser.ParseStructure(source);
        var root = Assert.Single(nodes);
        var curly = Assert.IsType<CurlyBracketsNode>(root);

        Assert.Collection(
            curly.Nodes,
            node => Assert.IsType<IdentifierNode>(node),
            node => Assert.IsType<SquareBracketsNode>(node),
            node => Assert.IsType<CurlyBracketsNode>(node));
    }

    [Fact]
    public void OperatorParser_RespectsPrecedence()
    {
        const string source = "a + b * c";

        var parsed = BaseFormatParser.ParseAll(source);
        var root = Assert.Single(parsed);
        var binOp = Assert.IsType<BinOpNode>(root);

        Assert.Equal("+", binOp.Operator);
        Assert.IsType<IdentifierNode>(binOp.Left);

        var nested = Assert.IsType<BinOpNode>(binOp.Right);
        Assert.Equal("*", nested.Operator);
    }

    [Fact]
    public void OperatorParser_RespectsRightAssociativeAssignment()
    {
        const string source = "a = b = c";

        var parsed = BaseFormatParser.ParseAll(source);
        var root = Assert.IsType<BinOpNode>(Assert.Single(parsed));

        Assert.Equal("=", root.Operator);
        Assert.IsType<IdentifierNode>(root.Left);

        var nested = Assert.IsType<BinOpNode>(root.Right);
        Assert.Equal("=", nested.Operator);
    }

    [Fact]
    public void BracketParser_ReportsUnmatchedOpeningBracket()
    {
        const string source = "{a [2 3";
        var diagnostics = new DiagnosticBag();

        _ = BaseFormatParser.ParseStructure(source, diagnostics: diagnostics);

        Assert.True(diagnostics.HasErrors);
        Assert.Contains(diagnostics.Items, item => item.Code == "MBF001");
    }

    [Fact]
    public void BracketParser_ThrowsOnMismatchedClosingBracket()
    {
        const string source = "{a [2 3}";

        var exception = Assert.Throws<InvalidOperationException>(() => BaseFormatParser.ParseStructure(source));

        Assert.Contains("Mismatched closing bracket", exception.Message);
    }

    [Fact]
    public void ParseStructure_StripsWhitespaceNodesByDefault()
    {
        const string source = "{a  b}";

        var nodes = BaseFormatParser.ParseStructure(source);
        var root = Assert.IsType<CurlyBracketsNode>(Assert.Single(nodes));

        Assert.DoesNotContain(root.Nodes, static node => node is WhitespaceNode);
    }

    [Fact]
    public void ParseStructure_CanPreserveWhitespaceNodes()
    {
        const string source = "{a  b}";

        var nodes = BaseFormatParser.ParseStructure(
            source,
            new BaseFormatParseOptions { PreserveWhitespaceNodes = true });

        var root = Assert.IsType<CurlyBracketsNode>(Assert.Single(nodes));

        Assert.Collection(
            root.Nodes,
            node => Assert.IsType<IdentifierNode>(node),
            node =>
            {
                var whitespace = Assert.IsType<WhitespaceNode>(node);
                Assert.Equal("  ", whitespace.Value);
            },
            node => Assert.IsType<IdentifierNode>(node));
    }

    [Fact]
    public void ParseStructure_DefaultNodesStillRetainOriginalWhitespaceForMacros()
    {
        const string source = "{macro  a}";

        var nodes = BaseFormatParser.ParseStructure(source);
        var root = Assert.IsType<CurlyBracketsNode>(Assert.Single(nodes));

        Assert.DoesNotContain(root.Nodes, static node => node is WhitespaceNode);
        Assert.Contains(root.OriginalNodes, static node => node is WhitespaceNode { Value: "  " });
    }

    [Fact]
    public void ParseStructure_PreservesWhitespaceInsideNestedEmbeddedForms()
    {
        const string source = "{fun render [] {div a  b}}";

        var nodes = BaseFormatParser.ParseStructure(
            source,
            new BaseFormatParseOptions { PreserveWhitespaceNodes = true });

        var outer = Assert.IsType<CurlyBracketsNode>(Assert.Single(nodes));
        var embedded = outer.Nodes.OfType<CurlyBracketsNode>().Last();

        Assert.Contains(embedded.Nodes, static node => node is WhitespaceNode { Value: " " });
        Assert.Contains(embedded.Nodes, static node => node is WhitespaceNode { Value: "  " });
        Assert.Equal(embedded.Nodes.Count, embedded.OriginalNodes.Count);
    }

    [Fact]
    public void Tokenizer_SupportsUnicodeOperatorRuns()
    {
        const string source = "a 😵 b 😐 c";

        var parsed = BaseFormatParser.ParseAll(source);
        var root = Assert.IsType<BinOpNode>(Assert.Single(parsed));

        Assert.Equal("😐", root.Operator);
        Assert.IsType<BinOpNode>(root.Left);
    }
}
