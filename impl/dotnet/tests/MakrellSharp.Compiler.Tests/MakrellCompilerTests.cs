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
    public void Run_EvaluatesMatchExpression_WithLiteralsAndWildcard()
    {
        var result = MakrellCompiler.Run(
            """
            {match 3
                2
                    "two"
                3
                    "three"
                _
                    "other"}
            """);

        Assert.Equal("three", result);
    }

    [Fact]
    public void Run_EvaluatesMatchExpression_WithListPatterns()
    {
        var result = MakrellCompiler.Run(
            """
            {match [2 3]
                []
                    "empty"
                [_]
                    "one"
                [_ _]
                    "two"}
            """);

        Assert.Equal("two", result);
    }

    [Fact]
    public void Run_EvaluatesMatchExpression_WithTypePatterns()
    {
        var result = MakrellCompiler.Run(
            """
            {match 2
                _:string
                    "string"
                _:int
                    "int"
                _
                    "other"}
            """);

        Assert.Equal("int", result);
    }

    [Fact]
    public void Run_EvaluatesMatchShortForm_AsBoolean()
    {
        var result = MakrellCompiler.Run("{match [2 3] [_ _]}");

        Assert.True(Convert.ToBoolean(result));
    }

    [Fact]
    public void Run_EvaluatesPatternMatchOperators()
    {
        var result = MakrellCompiler.Run(
            """
            a = [2 3] ~= [_ _]
            b = [2 3] !~= [_]
            a && b
            """);

        Assert.True(Convert.ToBoolean(result));
    }

    [Fact]
    public void Run_EvaluatesMatchExpression_WithSelfPatternTruthiness()
    {
        var result = MakrellCompiler.Run(
            """
            {match [null]
                $
                    "self"
                _
                    "other"}
            """);

        Assert.Equal("self", result);
    }

    [Fact]
    public void Run_EvaluatesMatchExpression_WithCompositePatterns()
    {
        var result = MakrellCompiler.Run(
            """
            {match 2
                _:string & $ < 3
                    "string"
                _:int & $ < 3
                    "int"
                _
                    "other"}
            """);

        Assert.Equal("int", result);
    }

    [Fact]
    public void Run_EvaluatesMatchShortForm_WithCompositeListPattern()
    {
        var result = MakrellCompiler.Run("{match [2 3] [_ $ > 2 & $ < 5]}");

        Assert.True(Convert.ToBoolean(result));
    }

    [Fact]
    public void Run_EvaluatesMatchExpression_WithTypeConstructorPattern_TypeOnly()
    {
        var result = MakrellCompiler.Run(
            """
            date = {new System.DateTime [2024 6 7]}
            {match date
                {$type System.DateTime}
                    "date"
                _
                    "other"}
            """);

        Assert.Equal("date", result);
    }

    [Fact]
    public void Run_EvaluatesMatchExpression_WithTypeConstructorPattern_KeywordProperties()
    {
        var result = MakrellCompiler.Run(
            """
            date = {new System.DateTime [2024 6 7]}
            {match date
                {$type System.DateTime [Year=2024 Month=6 Day=7]}
                    "date"
                _
                    "other"}
            """);

        Assert.Equal("date", result);
    }

    [Fact]
    public void Run_EvaluatesMatchExpression_WithTypeConstructorPattern_PositionalTuple()
    {
        var result = MakrellCompiler.Run(
            """
            pair = {new (System.ValueTuple string int) ["mak" 2]}
            {match pair
                {$type System.ValueTuple ["mak" 2]}
                    "pair"
                _
                    "other"}
            """);

        Assert.Equal("pair", result);
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
    public void Run_EvaluatesIndexOperator_OnArrayLiteral()
    {
        var result = MakrellCompiler.Run("[10 20 30] @ 1");

        Assert.Equal(20, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_EvaluatesIndexOperator_OnString()
    {
        var result = MakrellCompiler.Run("\"abc\" @ 1");

        Assert.Equal("b", result);
    }

    [Fact]
    public void Run_EvaluatesIndexOperator_WithNegativeIndex()
    {
        var result = MakrellCompiler.Run("[10 20 30] @ -1");

        Assert.Equal(30, Convert.ToInt32(result));
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
    public void Run_CoercesMakrellIntegers_ForClrConstructors()
    {
        var result = MakrellCompiler.Run(
            """
            sb = {new System.Text.StringBuilder [2 10]}
            sb.MaxCapacity
            """);

        Assert.Equal(10, Convert.ToInt32(result));
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
    public void Run_ConstructsGenericListThroughImportedNamespace()
    {
        var result = MakrellCompiler.Run(
            """
            {import System.Collections.Generic}
            items = {new (list string) ["Mak" "rell#"]}
            items @ 1
            """);

        Assert.Equal("rell#", result);
    }

    [Fact]
    public void Run_CallsStaticClrMethods()
    {
        var result = MakrellCompiler.Run(
            """
            {import System.Collections.Generic}
            items = {new (list string) ["Mak" "rell#"]}
            {String.Join "" items}
            """);

        Assert.Equal("Makrell#", result);
    }

    [Fact]
    public void Run_CallsGenericStaticClrMethods_WithoutArguments()
    {
        var result = MakrellCompiler.Run(
            """
            empty = {Array.Empty@(string)}
            empty.Length
            """);

        Assert.Equal(0, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_CallsGenericStaticClrMethods_WithArguments()
    {
        var result = MakrellCompiler.Run(
            """
            {import System.Linq}
            repeated = {Enumerable.Repeat@(string) "ha" 3}
            {String.Join "" repeated}
            """);

        Assert.Equal("hahaha", result);
    }

    [Fact]
    public void Run_CallsGenericInstanceClrMethods_WithMakrellFunctionDelegate()
    {
        var result = MakrellCompiler.Run(
            """
            items = {new (list string) ["mak" "rell"]}
            upper = {items.ConvertAll@(string) {fun [x] {x.ToUpperInvariant}}}
            {String.Join "" upper}
            """);

        Assert.Equal("MAKRELL", result);
    }

    [Fact]
    public void Run_CoercesMakrellIntegers_ForStaticClrMethodOverloads()
    {
        var result = MakrellCompiler.Run(
            """
            {import System.Text@[Encoding]}
            codepage = 65001
            enc = {Encoding.GetEncoding codepage}
            enc.WebName
            """);

        Assert.Equal("utf-8", result);
    }

    [Fact]
    public void Run_ConstructsTypedArrays()
    {
        var result = MakrellCompiler.Run(
            """
            items = {new (array string) ["Mak" "rell#"]}
            items @ 1
            """);

        Assert.Equal("rell#", result);
    }

    [Fact]
    public void Run_PassesTypedArraysToClrCalls()
    {
        var result = MakrellCompiler.Run(
            """
            items = {new (array string) ["Mak" "rell#"]}
            {String.Join "" items}
            """);

        Assert.Equal("Makrell#", result);
    }

    [Fact]
    public void Run_ConstructsFullyQualifiedGenericDictionary()
    {
        var result = MakrellCompiler.Run(
            """
            dict = {new (System.Collections.Generic.Dictionary string int) [["a" 2]]}
            dict @ "a"
            """);

        Assert.Equal(2, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_AssignsClrProperties()
    {
        var result = MakrellCompiler.Run(
            """
            {import System.Text}
            sb = {new StringBuilder []}
            sb.Capacity = 32
            sb.Capacity
            """);

        Assert.Equal(32, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_CoercesMakrellIntegers_ForClrMethodOverloads()
    {
        var result = MakrellCompiler.Run(
            """
            {import System.Text}
            sb = {new StringBuilder ["bc"]}
            {sb.Insert 0 "A"}
            {sb.ToString}
            """);

        Assert.Equal("Abc", result);
    }

    [Fact]
    public void Run_AssignsIndex_OnGenericList()
    {
        var result = MakrellCompiler.Run(
            """
            items = {new (list string) ["a" "b"]}
            items @ 1 = "c"
            items @ 1
            """);

        Assert.Equal("c", result);
    }

    [Fact]
    public void Run_AssignsIndex_OnDictionary()
    {
        var result = MakrellCompiler.Run(
            """
            dict = {new (dict string int) []}
            dict @ "a" = 4
            dict @ "a"
            """);

        Assert.Equal(4, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_AssignsIndex_OnTypedArray()
    {
        var result = MakrellCompiler.Run(
            """
            items = {new (array string) ["a" "b"]}
            items @ 1 = "c"
            items @ 1
            """);

        Assert.Equal("c", result);
    }

    [Fact]
    public void Run_ImportsConstructedGenericTypeAlias()
    {
        var result = MakrellCompiler.Run(
            """
            {import (list string)}
            items = {new List ["Makrell#"]}
            items @ 0
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
    public void Run_EvaluatesIndexOperator_OnAstNodeCollection()
    {
        var result = MakrellCompiler.Run(
            """
            q = {quote [2 3]}
            q.Nodes @ 1
            """);

        Assert.Equal(new NumberNode("3", string.Empty, SourceSpan.Empty), Assert.IsType<NumberNode>(result));
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
    public void Run_MetaFor_CanIterateCompileTimeValues()
    {
        var result = MakrellCompiler.Run(
            """
            {meta
                total = 0
                {for item [1 2 3 4]
                    total = total + item}}
            total
            """);

        Assert.Equal(10, Convert.ToInt32(result));
    }

    [Fact]
    public void Run_MetaBreakAndContinue_WorkInsideLoops()
    {
        var result = MakrellCompiler.Run(
            """
            {meta
                total = 0
                {for item [1 2 3 4 5]
                    {when item == 3
                        {continue}}
                    {when item == 5
                        {break}}
                    total = total + item}}
            total
            """);

        Assert.Equal(7, Convert.ToInt32(result));
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
    public void Run_DefMacro_CanUseMetaForLoop()
    {
        var result = MakrellCompiler.Run(
            """
            {def macro last [ns]
                ns = {regular ns}
                last = 0
                {for n ns
                    last = n}
                {quote {unquote last}}}
            {last 2 3 5}
            """);

        Assert.Equal(5, Convert.ToInt32(result));
    }

    [Fact]
    public void CompileToAssemblyImage_PreservesReplayableMetaSources()
    {
        var image = MakrellCompiler.CompileToAssemblyImage(
            """
            {meta
                a = 2}
            {def macro incr [ns]
                ns = {regular ns}
                {quote {unquote ns@0} + {unquote a}}}
            {incr 3}
            """);

        Assert.Contains(image.MetaSources, source => source.Contains("{meta", StringComparison.Ordinal));
        Assert.Contains(image.MetaSources, source => source.Contains("{def macro incr", StringComparison.Ordinal));
    }

    [Fact]
    public void LoadModule_ExposesEmbeddedMetaSources()
    {
        using var module = MakrellCompiler.LoadModule(
            """
            {meta
                a = 2}
            {def macro incr [ns]
                ns = {regular ns}
                {quote {unquote ns@0} + {unquote a}}}
            5
            """);

        var metaSources = module.GetMetaSources();

        Assert.Contains(metaSources, source => source.Contains("{meta", StringComparison.Ordinal));
        Assert.Contains(metaSources, source => source.Contains("{def macro incr", StringComparison.Ordinal));
    }

    [Fact]
    public void Run_Importm_ReplaysMacrosFromCompiledAssembly()
    {
        var image = MakrellCompiler.CompileToAssemblyImage(
            """
            {meta
                a = 2}
            {def macro incr [ns]
                ns = {regular ns}
                {quote {unquote ns@0} + {unquote a}}}
            0
            """);

        var directory = Path.Combine(Path.GetTempPath(), "makrellsharp-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        var assemblyPath = Path.Combine(directory, "macro-module.dll");

        try
        {
            File.WriteAllBytes(assemblyPath, image.PeBytes);

            var result = MakrellCompiler.Run(
                $$"""
                {importm "{{assemblyPath.Replace("\\", "\\\\", StringComparison.Ordinal)}}"}
                {incr 5}
                """);

            Assert.Equal(7, Convert.ToInt32(result));
        }
        finally
        {
            try
            {
                if (Directory.Exists(directory))
                {
                    Directory.Delete(directory, recursive: true);
                }
            }
            catch (UnauthorizedAccessException)
            {
                // The test imports the assembly through the default load context,
                // so Windows may keep the file locked for the remainder of the run.
            }
        }
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
    public void Run_WrapsClrRuntimeFailuresWithGeneratedSourceContext()
    {
        var exception = Assert.Throws<MakrellRuntimeException>(() => MakrellCompiler.Run(
            """
            {import System.Text}
            sb = {new StringBuilder []}
            {sb.NoSuchMethod}
            """));

        Assert.Contains("Makrell# runtime execution failed", exception.Message, StringComparison.Ordinal);
        Assert.Contains("NoSuchMethod", exception.Message, StringComparison.Ordinal);
        Assert.Contains("__MakrellModule", exception.CSharpSource, StringComparison.Ordinal);
        Assert.Contains("InvokeMember(sb, \"NoSuchMethod\"", exception.CSharpSource, StringComparison.Ordinal);
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
