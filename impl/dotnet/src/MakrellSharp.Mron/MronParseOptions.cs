using MakrellSharp.BaseFormat;

namespace MakrellSharp.Mron;

public sealed record MronParseOptions
{
    public static MronParseOptions Default { get; } = new();

    public bool AllowExec { get; init; }

    public BaseFormatParseOptions BaseFormat { get; init; } = BaseFormatParseOptions.Default;
}
