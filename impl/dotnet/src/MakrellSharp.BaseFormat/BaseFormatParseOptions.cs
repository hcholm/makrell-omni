namespace MakrellSharp.BaseFormat;

public sealed record BaseFormatParseOptions
{
    public static BaseFormatParseOptions Default { get; } = new();

    // Embedded sublanguages such as MRML may depend on literal whitespace,
    // so callers must be able to retain whitespace nodes in the parsed tree.
    public bool PreserveWhitespaceNodes { get; init; }
}
