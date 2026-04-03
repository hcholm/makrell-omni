using MakrellSharp.BaseFormat;

namespace MakrellSharp.Mrtd;

public sealed class MrtdParseOptions
{
    public static MrtdParseOptions Default { get; } = new();

    public BaseFormatParseOptions BaseFormat { get; init; } = BaseFormatParseOptions.Default;

    public IReadOnlySet<string> Profiles { get; init; } = new HashSet<string>(StringComparer.Ordinal);

    public bool HasProfile(string profile) => Profiles.Contains(profile);
}
