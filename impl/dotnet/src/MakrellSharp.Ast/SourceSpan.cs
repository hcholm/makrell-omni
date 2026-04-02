namespace MakrellSharp.Ast;

public readonly record struct SourcePosition(int Index, int Line, int Column);

public readonly record struct SourceSpan(SourcePosition Start, SourcePosition End)
{
    public static SourceSpan Empty =>
        new(new SourcePosition(0, 1, 1), new SourcePosition(0, 1, 1));
}
