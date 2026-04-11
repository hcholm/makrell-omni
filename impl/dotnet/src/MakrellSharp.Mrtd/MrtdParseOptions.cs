using MakrellSharp.BaseFormat;

namespace MakrellSharp.Mrtd;

public sealed class MrtdParseOptions
{
    public static MrtdParseOptions Default { get; } = new();

    public BaseFormatParseOptions BaseFormat { get; init; } = BaseFormatParseOptions.Default;

    // Reserved for future optional MRTD extensions. The current shared basic
    // suffix profile is part of core MRTD parsing and does not need to be
    // enabled here.
    public IReadOnlySet<string> Profiles { get; init; } = new HashSet<string>(StringComparer.Ordinal);

    public bool HasProfile(string profile) => Profiles.Contains(profile);
}
