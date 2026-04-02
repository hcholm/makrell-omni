using System.Reflection;

namespace MakrellSharp.Compiler;

[AttributeUsage(AttributeTargets.Assembly, AllowMultiple = false)]
public sealed class MakrellMetaSourcesAttribute(params string[] sources) : Attribute
{
    public IReadOnlyList<string> Sources { get; } = sources;
}

public static class MakrellMetaManifest
{
    public static IReadOnlyList<string> GetSources(Assembly assembly)
    {
        ArgumentNullException.ThrowIfNull(assembly);

        return assembly.GetCustomAttribute<MakrellMetaSourcesAttribute>()?.Sources
            ?? Array.Empty<string>();
    }
}
