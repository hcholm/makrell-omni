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
