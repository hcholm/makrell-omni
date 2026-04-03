using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;
using System.Threading.Tasks;

namespace MakrellSharp.Compiler;

public static class MakrellCompiler
{
    public static MakrellCheckResult Check(string source, MakrellCompilerOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(source);

        options ??= new MakrellCompilerOptions();
        var diagnostics = new List<MakrellDiagnostic>();

        var baseFormatDiagnostics = new DiagnosticBag();
        IReadOnlyList<Node> structured;
        try
        {
            structured = BaseFormatParser.ParseStructure(source, diagnostics: baseFormatDiagnostics);
        }
        catch (Exception ex)
        {
            diagnostics.Add(new MakrellDiagnostic("baseformat", "MBF000", ex.Message));
            return new MakrellCheckResult(false, diagnostics);
        }

        diagnostics.AddRange(
            baseFormatDiagnostics.Items.Select(static item =>
                new MakrellDiagnostic("baseformat", item.Code, item.Message, MakrellDiagnosticSeverity.Error, item.Span)));

        if (baseFormatDiagnostics.HasErrors)
        {
            return new MakrellCheckResult(false, diagnostics);
        }

        var metaProcessor = new MetaProcessor(options.Macros, source);
        IReadOnlyList<Node> metaProcessed;
        try
        {
            metaProcessed = metaProcessor.Process(structured);
        }
        catch (Exception ex)
        {
            diagnostics.Add(new MakrellDiagnostic("meta", "META001", ex.Message));
            return new MakrellCheckResult(false, diagnostics);
        }

        IReadOnlyList<Node> expanded;
        try
        {
            expanded = new MacroExpander(options.Macros).Expand(metaProcessed);
        }
        catch (Exception ex)
        {
            diagnostics.Add(new MakrellDiagnostic("macro", "MACRO001", ex.Message));
            return new MakrellCheckResult(false, diagnostics);
        }

        IReadOnlyList<Node> parsed;
        try
        {
            parsed = BaseFormatParser.ParseOperators(expanded);
        }
        catch (Exception ex)
        {
            diagnostics.Add(new MakrellDiagnostic("operators", "OP001", ex.Message));
            return new MakrellCheckResult(false, diagnostics);
        }

        string csharp;
        try
        {
            csharp = CSharpEmitter.EmitModule(parsed);
        }
        catch (Exception ex)
        {
            diagnostics.Add(new MakrellDiagnostic("emit", "CSHARP001", ex.Message));
            return new MakrellCheckResult(false, diagnostics);
        }

        diagnostics.AddRange(RoslynExecutor.Check(csharp, metaProcessor.ReplaySources));
        var success = !diagnostics.Any(static diagnostic => diagnostic.Severity == MakrellDiagnosticSeverity.Error);
        return new MakrellCheckResult(success, diagnostics, csharp);
    }

    public static MakrellCompilationResult CompileToCSharp(string source, MakrellCompilerOptions? options = null)
    {
        options ??= new MakrellCompilerOptions();

        var structured = BaseFormatParser.ParseStructure(source);
        var metaProcessor = new MetaProcessor(options.Macros, source);
        var metaProcessed = metaProcessor.Process(structured);
        var expanded = new MacroExpander(options.Macros).Expand(metaProcessed);
        var parsed = BaseFormatParser.ParseOperators(expanded);
        var csharp = CSharpEmitter.EmitModule(parsed);
        return new MakrellCompilationResult(csharp, metaProcessor.ReplaySources);
    }

    public static MakrellAssemblyImage CompileToAssemblyImage(string source, MakrellCompilerOptions? options = null)
    {
        var compilation = CompileToCSharp(source, options);
        return RoslynExecutor.Compile(compilation.CSharpSource, compilation.MetaSources);
    }

    public static MakrellModule LoadModule(string source, MakrellCompilerOptions? options = null)
    {
        var image = CompileToAssemblyImage(source, options);
        return RoslynExecutor.Load(image);
    }

    public static MakrellModule LoadAssembly(string assemblyPath)
    {
        return RoslynExecutor.LoadFromFile(assemblyPath);
    }

    public static IReadOnlyList<string> GetAssemblyMetaSources(string assemblyPath)
    {
        using var module = LoadAssembly(assemblyPath);
        return module.GetMetaSources();
    }

    public static object? Run(string source, MakrellCompilerOptions? options = null)
    {
        using var module = LoadModule(source, options);
        return module.Run();
    }

    public static async Task<object?> RunAsync(string source, MakrellCompilerOptions? options = null)
    {
        using var module = LoadModule(source, options);
        return await module.RunAsync();
    }

    public static object? RunAssembly(string assemblyPath)
    {
        using var module = LoadAssembly(assemblyPath);
        return module.Run();
    }

    public static async Task<object?> RunAssemblyAsync(string assemblyPath)
    {
        using var module = LoadAssembly(assemblyPath);
        return await module.RunAsync();
    }
}
