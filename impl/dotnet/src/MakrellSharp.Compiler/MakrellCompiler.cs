using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.Compiler;

public static class MakrellCompiler
{
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

    public static object? RunAssembly(string assemblyPath)
    {
        using var module = LoadAssembly(assemblyPath);
        return module.Run();
    }
}
