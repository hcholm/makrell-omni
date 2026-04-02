using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.Compiler;

public static class MakrellCompiler
{
    public static MakrellCompilationResult CompileToCSharp(string source, MakrellCompilerOptions? options = null)
    {
        options ??= new MakrellCompilerOptions();

        var structured = BaseFormatParser.ParseStructure(source);
        var expanded = new MacroExpander(options.Macros).Expand(structured);
        var parsed = BaseFormatParser.ParseOperators(expanded);
        var csharp = CSharpEmitter.EmitModule(parsed);
        return new MakrellCompilationResult(csharp);
    }

    public static MakrellAssemblyImage CompileToAssemblyImage(string source, MakrellCompilerOptions? options = null)
    {
        var compilation = CompileToCSharp(source, options);
        return RoslynExecutor.Compile(compilation.CSharpSource);
    }

    public static MakrellModule LoadModule(string source, MakrellCompilerOptions? options = null)
    {
        var image = CompileToAssemblyImage(source, options);
        return RoslynExecutor.Load(image);
    }

    public static object? Run(string source, MakrellCompilerOptions? options = null)
    {
        using var module = LoadModule(source, options);
        return module.Run();
    }
}
