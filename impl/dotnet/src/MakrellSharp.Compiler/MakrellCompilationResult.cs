namespace MakrellSharp.Compiler;

public sealed record MakrellCompilationResult(
    string CSharpSource,
    IReadOnlyList<string> MetaSources);
