using System.Collections.Immutable;
using System.Globalization;
using System.Reflection;
using System.Runtime.Loader;
using MakrellSharp.Ast;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace MakrellSharp.Compiler;

internal static class RoslynExecutor
{
    public static IReadOnlyList<MakrellDiagnostic> Check(string csharpSource, IReadOnlyList<string>? metaSources = null)
    {
        using var peStream = new MemoryStream();
        using var pdbStream = new MemoryStream();
        metaSources ??= Array.Empty<string>();
        var emit = CreateCompilation(csharpSource, metaSources).Emit(peStream, pdbStream);
        return emit.Diagnostics
            .Where(static diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
            .Select(ToMakrellDiagnostic)
            .ToArray();
    }

    public static MakrellAssemblyImage Compile(string csharpSource, IReadOnlyList<string>? metaSources = null)
    {
        using var peStream = new MemoryStream();
        using var pdbStream = new MemoryStream();
        metaSources ??= Array.Empty<string>();
        var emit = CreateCompilation(csharpSource, metaSources).Emit(peStream, pdbStream);
        if (!emit.Success)
        {
            var message = string.Join(
                Environment.NewLine,
                emit.Diagnostics
                    .Where(static diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
                    .Select(static diagnostic => diagnostic.ToString()));
            throw new InvalidOperationException(message);
        }

        return new MakrellAssemblyImage(csharpSource, peStream.ToArray(), pdbStream.ToArray(), metaSources);
    }

    private static MakrellDiagnostic ToMakrellDiagnostic(Microsoft.CodeAnalysis.Diagnostic diagnostic)
    {
        var severity = diagnostic.Severity switch
        {
            DiagnosticSeverity.Error => MakrellDiagnosticSeverity.Error,
            DiagnosticSeverity.Warning => MakrellDiagnosticSeverity.Warning,
            DiagnosticSeverity.Info => MakrellDiagnosticSeverity.Information,
            DiagnosticSeverity.Hidden => MakrellDiagnosticSeverity.Hint,
            _ => MakrellDiagnosticSeverity.Error,
        };

        SourceSpan? span = null;
        if (diagnostic.Location is { IsInSource: true })
        {
            var lineSpan = diagnostic.Location.GetLineSpan();
            var start = lineSpan.StartLinePosition;
            var end = lineSpan.EndLinePosition;
            span = new SourceSpan(
                new SourcePosition(0, start.Line + 1, start.Character + 1),
                new SourcePosition(0, end.Line + 1, end.Character + 1));
        }

        return new MakrellDiagnostic(
            "csharp",
            diagnostic.Id,
            diagnostic.GetMessage(CultureInfo.InvariantCulture),
            severity,
            span);
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
        return new MakrellModule(assembly, loadContext, image.CSharpSource);
    }

    public static MakrellModule LoadFromFile(string assemblyPath)
    {
        ArgumentNullException.ThrowIfNull(assemblyPath);

        var fullPath = Path.GetFullPath(assemblyPath);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"Makrell# assembly file not found: {fullPath}");
        }

        var peBytes = File.ReadAllBytes(fullPath);
        var pdbPath = Path.ChangeExtension(fullPath, ".pdb");
        var pdbBytes = File.Exists(pdbPath) ? File.ReadAllBytes(pdbPath) : Array.Empty<byte>();
        var image = new MakrellAssemblyImage(
            "// Generated C# source unavailable for assembly loaded from disk.",
            peBytes,
            pdbBytes,
            Array.Empty<string>());
        return Load(image);
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

    private static CSharpCompilation CreateCompilation(string csharpSource, IReadOnlyList<string> metaSources)
    {
        var syntaxTrees = new List<SyntaxTree>
        {
            CSharpSyntaxTree.ParseText(csharpSource),
        };

        if (metaSources.Count > 0)
        {
            syntaxTrees.Add(CSharpSyntaxTree.ParseText(EmitMetaManifestSource(metaSources)));
        }

        return CSharpCompilation.Create(
            "__MakrellGenerated_" + Guid.NewGuid().ToString("N"),
            syntaxTrees,
            BuildReferences(),
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
    }

    private static string EmitMetaManifestSource(IReadOnlyList<string> metaSources)
    {
        var arguments = string.Join(", ", metaSources.Select(ToCSharpLiteral));
        return
            """
            [assembly: global::MakrellSharp.Compiler.MakrellMetaSourcesAttribute(
            """
            + arguments +
            """
            )]
            """;
    }

    private static string ToCSharpLiteral(string value) =>
        "\"" + value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal)
            .Replace("\r", "\\r", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal)
        + "\"";

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
