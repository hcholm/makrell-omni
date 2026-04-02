using MakrellSharp.Ast;

namespace MakrellSharp.Compiler.Tests;

public sealed class MakrellCompilerTests
{
    [Fact]
    public void Run_EvaluatesAssignmentAndArithmetic()
    {
        var result = MakrellCompiler.Run(
            """
            a = 2 + 3
            a * 4
            """);

        Assert.Equal(20, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_EvaluatesIfExpression()
    {
        var result = MakrellCompiler.Run("""{if 2 < 3 "yes" "no"}""");

        Assert.Equal("yes", result);
    }

    [Fact]
    public void Run_EvaluatesWhenStatement()
    {
        var result = MakrellCompiler.Run(
            """
            value = 1
            {when true
                value = 2}
            value
            """);

        Assert.Equal(2, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_EvaluatesWhileStatement()
    {
        var result = MakrellCompiler.Run(
            """
            n = 3
            total = 0
            {while n > 0
                total = total + n
                n = n - 1}
            total
            """);

        Assert.Equal(6, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_EvaluatesForStatement()
    {
        var result = MakrellCompiler.Run(
            """
            total = 0
            {for item [1 2 3 4]
                total = total + item}
            total
            """);

        Assert.Equal(10, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_EvaluatesNamedFunctionAndCall()
    {
        var result = MakrellCompiler.Run(
            """
            {fun add [x y]
                x + y}
            {add 2 3}
            """);

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_EvaluatesPipeCalls()
    {
        var result = MakrellCompiler.Run(
            """
            {fun add3 [x]
                x + 3}
            2 | add3
            """);

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_ConstructsDotNetObjects()
    {
        var result = MakrellCompiler.Run(
            """
            sb = {new System.Text.StringBuilder ["Mak"]}
            {sb.Append "rell#"}
            {sb.ToString}
            """);

        Assert.Equal("Makrell#", result);
    }

    [Fact]
    public void Run_ImportsNamespaceForTypeResolution()
    {
        var result = MakrellCompiler.Run(
            """
            {import System.Text}
            sb = {new StringBuilder ["Mak"]}
            {sb.Append "rell#"}
            {sb.ToString}
            """);

        Assert.Equal("Makrell#", result);
    }

    [Fact]
    public void Run_ImportsSpecificTypesWithAtSyntax()
    {
        var result = MakrellCompiler.Run(
            """
            {import System.Text@[Encoding]}
            Encoding.UTF8.WebName
            """);

        Assert.Equal("utf-8", result);
    }

    [Fact]
    public void Run_ImportsFullyQualifiedTypeAsAlias()
    {
        var result = MakrellCompiler.Run(
            """
            {import System.Text.StringBuilder}
            sb = {new StringBuilder []}
            {sb.Append "Makrell#"}
            {sb.ToString}
            """);

        Assert.Equal("Makrell#", result);
    }

    [Fact]
    public void Run_QuoteNumber_ReturnsAstNumberNode()
    {
        var result = Assert.IsType<NumberNode>(MakrellCompiler.Run("{quote 2}"));

        Assert.Equal(new NumberNode("2", string.Empty, SourceSpan.Empty), result);
    }

    [Fact]
    public void Run_QuoteString_ReturnsAstStringNode()
    {
        var result = Assert.IsType<StringNode>(MakrellCompiler.Run("{quote \"asd\"}"));

        Assert.Equal(new StringNode("\"asd\"", string.Empty, SourceSpan.Empty), result);
    }

    [Fact]
    public void Run_QuoteList_ReturnsAstSquareBracketsNode()
    {
        var result = Assert.IsType<SquareBracketsNode>(MakrellCompiler.Run("{quote [2]}"));

        Assert.Collection(
            result.Nodes,
            node => Assert.Equal(new NumberNode("2", string.Empty, SourceSpan.Empty), Assert.IsType<NumberNode>(node)));
        Assert.Collection(
            result.OriginalNodes,
            node => Assert.Equal(new NumberNode("2", string.Empty, SourceSpan.Empty), Assert.IsType<NumberNode>(node)));
    }

    [Fact]
    public void Run_QuoteCurly_ReturnsAstCurlyBracketsNode()
    {
        var result = Assert.IsType<CurlyBracketsNode>(MakrellCompiler.Run("{quote {f}}"));

        Assert.Collection(
            result.Nodes,
            node => Assert.Equal(new IdentifierNode("f", SourceSpan.Empty), Assert.IsType<IdentifierNode>(node)));
    }

    [Fact]
    public void Run_QuoteMultipleValues_ReturnsQuotedArray()
    {
        var result = Assert.IsType<object?[]>(MakrellCompiler.Run("{quote 2 3}"));

        Assert.Collection(
            result,
            item => Assert.Equal(new NumberNode("2", string.Empty, SourceSpan.Empty), Assert.IsType<NumberNode>(item)),
            item => Assert.Equal(new NumberNode("3", string.Empty, SourceSpan.Empty), Assert.IsType<NumberNode>(item)));
    }

    [Fact]
    public void Run_QuoteNestedQuote_UnwrapsInnerQuoteSyntax()
    {
        var result = Assert.IsType<NumberNode>(MakrellCompiler.Run("{quote {quote 2}}"));

        Assert.Equal(new NumberNode("2", string.Empty, SourceSpan.Empty), result);
    }

    [Fact]
    public void Run_QuoteUnquote_EvaluatesInnerExpression()
    {
        var result = MakrellCompiler.Run("{quote {unquote 2 + 3}}");

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_QuoteDollar_EvaluatesInnerExpression()
    {
        var result = MakrellCompiler.Run("{quote {$ 2 + 3}}");

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_QuoteQuote_KeepsNestedUnquoteSyntax()
    {
        var result = Assert.IsType<CurlyBracketsNode>(MakrellCompiler.Run("{quote {quote {unquote 2}}}"));

        Assert.Collection(
            result.Nodes,
            node => Assert.Equal(new IdentifierNode("unquote", SourceSpan.Empty), Assert.IsType<IdentifierNode>(node)),
            node => Assert.Equal(new NumberNode("2", string.Empty, SourceSpan.Empty), Assert.IsType<NumberNode>(node)));
    }

    [Fact]
    public void Run_QuoteQuote_KeepsNestedDollarSyntax()
    {
        var result = Assert.IsType<CurlyBracketsNode>(MakrellCompiler.Run("{quote {quote {$ 2}}}"));

        Assert.Collection(
            result.Nodes,
            node => Assert.Equal(new IdentifierNode("$", SourceSpan.Empty), Assert.IsType<IdentifierNode>(node)),
            node => Assert.Equal(new NumberNode("2", string.Empty, SourceSpan.Empty), Assert.IsType<NumberNode>(node)));
    }

    [Fact]
    public void Run_MetaCanBindQuotedValuesIntoRuntimeCode()
    {
        var result = MakrellCompiler.Run(
            """
            {meta
                mb = {quote 2}}
            a = mb
            a
            """);

        Assert.Equal(2, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_MetaScopeIsSharedAcrossBlocks()
    {
        var result = MakrellCompiler.Run(
            """
            {meta
                a = 3}
            {meta
                b = a + 2}
            b
            """);

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_MetaQuoteUnquoteCanUseMetaValues()
    {
        var result = MakrellCompiler.Run(
            """
            {meta
                a = 5
                c = {quote {unquote a}}}
            c
            """);

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void CompileToCSharp_StripsMetaBlocksFromRuntimeOutput()
    {
        var compilation = MakrellCompiler.CompileToCSharp(
            """
            {meta
                a = 3}
            2 + 3
            """);

        Assert.DoesNotContain("meta", compilation.CSharpSource, StringComparison.Ordinal);
        Assert.Contains("return (2 + 3);", compilation.CSharpSource, StringComparison.Ordinal);
    }

    [Fact]
    public void Run_DefMacro_CanExpandQuotedExpression()
    {
        var result = MakrellCompiler.Run(
            """
            {def macro incr [ns]
                ns = {regular ns}
                {quote {unquote ns@0} + 1}}
            {incr 4}
            """);

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_DefMacro_CanUseRegularOnOriginalArguments()
    {
        var result = MakrellCompiler.Run(
            """
            {def macro second [ns]
                ns = {regular ns}
                {quote {unquote ns@1}}}
            {second 2   3}
            """);

        Assert.Equal(3, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_DefMacro_CanUseSharedMetaValues()
    {
        var result = MakrellCompiler.Run(
            """
            {meta
                a = 2}
            {def macro adda [ns]
                ns = {regular ns}
                {quote {unquote ns@0} + {unquote a}}}
            {adda 5}
            """);

        Assert.Equal(7, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_MetaFunction_CanBeCalledInsideMeta()
    {
        var result = MakrellCompiler.Run(
            """
            {meta
                {fun add1 [x]
                    x + 1}
                a = {add1 4}}
            a
            """);

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_MetaWhile_AndWhen_WorkInsideCompileTimeExecution()
    {
        var result = MakrellCompiler.Run(
            """
            {meta
                i = 0
                total = 0
                {while i < 4
                    {when true
                        total = total + i}
                    i = i + 1}}
            total
            """);

        Assert.Equal(6, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_DefMacro_CanUseMetaHelperFunction()
    {
        var result = MakrellCompiler.Run(
            """
            {meta
                {fun add1 [x]
                    x + 1}}
            {def macro incr2 [ns]
                ns = {regular ns}
                {quote {unquote {add1 ns@0}}}}
            {incr2 4}
            """);

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void LoadModule_CompilesAndRunsCollectibleAssembly()
    {
        using var module = MakrellCompiler.LoadModule(
            """
            value = 4 + 5
            value
            """);

        Assert.Equal(9, Convert.ToInt32(module.Run()));
    }

    [Fact]
    public void Run_RunsNativeMacrosBeforeEmission()
    {
        var registry = new MacroRegistry();
        registry.RegisterNative("emitfive", (_, _) =>
        {
            return
            [
                new NumberNode("5", string.Empty, SourceSpan.Empty),
            ];
        });

        var result = MakrellCompiler.Run("{emitfive}", new MakrellCompilerOptions { Macros = registry });

        Assert.Equal(5, Convert.ToInt32(result));
    }
}
