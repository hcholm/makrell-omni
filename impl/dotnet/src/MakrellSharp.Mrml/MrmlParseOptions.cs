using MakrellSharp.BaseFormat;

namespace MakrellSharp.Mrml;

public sealed record MrmlParseOptions
{
    public static MrmlParseOptions Default { get; } = new();

    public bool AllowExec { get; init; }

    public BaseFormatParseOptions BaseFormat { get; init; } = new() { PreserveWhitespaceNodes = true };
}
