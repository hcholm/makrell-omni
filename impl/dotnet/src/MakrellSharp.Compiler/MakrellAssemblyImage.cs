namespace MakrellSharp.Compiler;

public sealed record MakrellAssemblyImage(
    string CSharpSource,
    byte[] PeBytes,
    byte[] PdbBytes);
