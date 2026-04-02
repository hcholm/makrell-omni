using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;
using MakrellSharp.Compiler;

namespace MakrellSharp.Compiler.Tests;

public sealed class MacroExpanderTests
{
    [Fact]
    public void NativeMacro_ReceivesOriginalWhitespaceNodes()
    {
        var registry = new MacroRegistry();
        registry.RegisterNative("inspect", (invocation, _) =>
        {
            var sawWhitespace = invocation.OriginalArguments.Any(static node => node is WhitespaceNode);
            return
            [
                new IdentifierNode(sawWhitespace ? "saw_ws" : "missing_ws", SourceSpan.Empty),
            ];
        });

        var parsed = BaseFormatParser.ParseStructure("{inspect  a}");
        var expander = new MacroExpander(registry);

        var expanded = expander.Expand(parsed);
        var result = Assert.IsType<IdentifierNode>(Assert.Single(expanded));
        Assert.Equal("saw_ws", result.Value);
    }

    [Fact]
    public void NativeMacro_CanChooseWhitespaceInsensitiveRegularization()
    {
        var registry = new MacroRegistry();
        registry.RegisterNative("countargs", (invocation, context) =>
        {
            var regular = context.Regularize(invocation.OriginalArguments);
            return
            [
                new NumberNode(regular.Count.ToString(), string.Empty, SourceSpan.Empty),
            ];
        });

        var parsed = BaseFormatParser.ParseStructure("{countargs  a  b}");
        var expander = new MacroExpander(registry);

        var expanded = expander.Expand(parsed);
        var result = Assert.IsType<NumberNode>(Assert.Single(expanded));
        Assert.Equal("2", result.Value);
    }

    [Fact]
    public void MacroExpansion_IsRecursive()
    {
        var registry = new MacroRegistry();
        registry.RegisterNative("inner", (_, _) =>
        [
            new IdentifierNode("done", SourceSpan.Empty),
        ]);
        registry.RegisterNative("outer", (_, _) =>
        [
            new CurlyBracketsNode(
                [new IdentifierNode("inner", SourceSpan.Empty)],
                [new IdentifierNode("inner", SourceSpan.Empty)],
                SourceSpan.Empty),
        ]);

        var parsed = BaseFormatParser.ParseStructure("{outer}");
        var expander = new MacroExpander(registry);

        var expanded = expander.Expand(parsed);
        var result = Assert.IsType<IdentifierNode>(Assert.Single(expanded));
        Assert.Equal("done", result.Value);
    }

    [Fact]
    public void NonMacroCurly_RewritesNestedChildrenOnly()
    {
        var registry = new MacroRegistry();
        registry.RegisterNative("emit", (_, _) =>
        [
            new IdentifierNode("value", SourceSpan.Empty),
        ]);

        var parsed = BaseFormatParser.ParseStructure("{wrap {emit}}");
        var expander = new MacroExpander(registry);

        var expanded = expander.Expand(parsed);
        var outer = Assert.IsType<CurlyBracketsNode>(Assert.Single(expanded));
        Assert.Collection(
            outer.Nodes,
            node => Assert.Equal("wrap", Assert.IsType<IdentifierNode>(node).Value),
            node => Assert.Equal("value", Assert.IsType<IdentifierNode>(node).Value));
        Assert.IsType<CurlyBracketsNode>(outer.OriginalNodes.Last());
    }
}
