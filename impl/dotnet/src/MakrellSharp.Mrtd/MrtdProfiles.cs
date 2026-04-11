namespace MakrellSharp.Mrtd;

public static class MrtdProfiles
{
    public const string BasicSuffixProfile = "basic-suffix-profile";

    [Obsolete("The basic suffix profile is part of MRTD core in the current spec. Use BasicSuffixProfile only if you need a symbolic compatibility name.")]
    public const string ExtendedScalars = "extended-scalars";
}
