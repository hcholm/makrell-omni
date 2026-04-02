using System.Reflection;
using System.Runtime.Loader;

namespace MakrellSharp.Compiler;

public sealed class MakrellModule : IDisposable
{
    private readonly AssemblyLoadContext? loadContext;
    private readonly MethodInfo runMethod;
    private readonly string cSharpSource;

    internal MakrellModule(Assembly assembly, AssemblyLoadContext? loadContext, string cSharpSource)
    {
        Assembly = assembly ?? throw new ArgumentNullException(nameof(assembly));
        this.loadContext = loadContext;
        this.cSharpSource = cSharpSource ?? throw new ArgumentNullException(nameof(cSharpSource));

        var moduleType = assembly.GetType("__MakrellModule")
            ?? throw new InvalidOperationException("Generated module type not found.");
        runMethod = moduleType.GetMethod("Run", BindingFlags.Public | BindingFlags.Static)
            ?? throw new InvalidOperationException("Generated Run method not found.");
    }

    public Assembly Assembly { get; }

    public object? Run()
    {
        try
        {
            return runMethod.Invoke(null, null);
        }
        catch (TargetInvocationException ex) when (ex.InnerException is not null)
        {
            throw new MakrellRuntimeException(
                BuildRuntimeErrorMessage(ex.InnerException),
                cSharpSource,
                ex.InnerException);
        }
    }

    public IReadOnlyList<string> GetMetaSources() => MakrellMetaManifest.GetSources(Assembly);

    public void Dispose()
    {
        loadContext?.Unload();
    }

    private static string BuildRuntimeErrorMessage(Exception innerException)
    {
        return
            "Makrell# runtime execution failed: " +
            innerException.Message +
            Environment.NewLine +
            "Inspect the generated C# source on the exception for compiler output context.";
    }
}
