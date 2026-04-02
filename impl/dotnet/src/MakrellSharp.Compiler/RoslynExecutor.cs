using System.Collections.Immutable;
using System.Reflection;
using System.Runtime.Loader;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace MakrellSharp.Compiler;

internal static class RoslynExecutor
{
    public static MakrellAssemblyImage Compile(string csharpSource)
    {
        using var peStream = new MemoryStream();
        using var pdbStream = new MemoryStream();
        var emit = CreateCompilation(csharpSource).Emit(peStream, pdbStream);
        if (!emit.Success)
        {
            var message = string.Join(
                Environment.NewLine,
                emit.Diagnostics
                    .Where(static diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
                    .Select(static diagnostic => diagnostic.ToString()));
            throw new InvalidOperationException(message);
        }

        return new MakrellAssemblyImage(csharpSource, peStream.ToArray(), pdbStream.ToArray());
    }

    public static MakrellModule Load(MakrellAssemblyImage image)
    {
        ArgumentNullException.ThrowIfNull(image);

        var loadContext = new MakrellModuleLoadContext();
        using var peStream = new MemoryStream(image.PeBytes, writable: false);
        using var pdbStream = image.PdbBytes.Length > 0 ? new MemoryStream(image.PdbBytes, writable: false) : null;
        var assembly = pdbStream is null
            ? loadContext.LoadFromStream(peStream)
            : loadContext.LoadFromStream(peStream, pdbStream);
        return new MakrellModule(assembly, loadContext);
    }

    private static ImmutableArray<MetadataReference> BuildReferences()
    {
        var tpa = (string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES")
            ?? throw new InvalidOperationException("Trusted platform assemblies unavailable.");

        var references = tpa
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
            .Select(static path => (MetadataReference)MetadataReference.CreateFromFile(path))
            .ToList();

        references.Add(MetadataReference.CreateFromFile(typeof(MakrellCompilerRuntime).Assembly.Location));
        return references.ToImmutableArray();
    }

    private static CSharpCompilation CreateCompilation(string csharpSource)
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(csharpSource);
        return CSharpCompilation.Create(
            "__MakrellGenerated_" + Guid.NewGuid().ToString("N"),
            [syntaxTree],
            BuildReferences(),
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
    }

    private sealed class MakrellModuleLoadContext : AssemblyLoadContext
    {
        public MakrellModuleLoadContext()
            : base(nameof(MakrellModuleLoadContext), isCollectible: true)
        {
        }

        protected override Assembly? Load(AssemblyName assemblyName)
        {
            return AssemblyLoadContext.Default.Assemblies.FirstOrDefault(
                assembly => AssemblyName.ReferenceMatchesDefinition(assembly.GetName(), assemblyName));
        }
    }
}
