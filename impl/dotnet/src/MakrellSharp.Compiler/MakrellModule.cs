using System.Reflection;
using System.Runtime.Loader;

namespace MakrellSharp.Compiler;

public sealed class MakrellModule : IDisposable
{
    private readonly AssemblyLoadContext? loadContext;
    private readonly MethodInfo runMethod;

    internal MakrellModule(Assembly assembly, AssemblyLoadContext? loadContext)
    {
        Assembly = assembly ?? throw new ArgumentNullException(nameof(assembly));
        this.loadContext = loadContext;

        var moduleType = assembly.GetType("__MakrellModule")
            ?? throw new InvalidOperationException("Generated module type not found.");
        runMethod = moduleType.GetMethod("Run", BindingFlags.Public | BindingFlags.Static)
            ?? throw new InvalidOperationException("Generated Run method not found.");
    }

    public Assembly Assembly { get; }

    public object? Run() => runMethod.Invoke(null, null);

    public void Dispose()
    {
        loadContext?.Unload();
    }
}
