namespace MakrellSharp.Compiler;

public sealed record MakrellCompilerOptions
{
    public MacroRegistry Macros { get; init; } = new();
}
