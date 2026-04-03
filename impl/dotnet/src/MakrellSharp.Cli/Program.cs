using System.Globalization;
using System.Text.Json;
using MakrellSharp.Compiler;
using MakrellSharp.Mrml;
using MakrellSharp.Mron;
using MakrellSharp.Mrtd;

return await MakrellSharpCli.RunAsync(args, Console.Out, Console.Error);

public static class MakrellSharpCli
{
    public static async Task<int> RunAsync(string[] args, TextWriter stdout, TextWriter stderr)
    {
        try
        {
            return await Run(args, stdout);
        }
        catch (Exception ex)
        {
            await stderr.WriteLineAsync(ex.Message);
            return 1;
        }
    }

    private static Task<int> Run(string[] args, TextWriter stdout)
    {
        if (args.Length == 0 || IsHelp(args[0]))
        {
            PrintUsage(stdout);
            return Task.FromResult(0);
        }

        return args[0] switch
            {
            "check" => Task.FromResult(CheckFile(args, stdout)),
            "check-mron" => Task.FromResult(CheckMron(args, stdout)),
            "check-mrml" => Task.FromResult(CheckMrml(args, stdout)),
            "check-mrtd" => Task.FromResult(CheckMrtd(args, stdout)),
            "run" => RunFileAsync(GetRequiredPath(args, 1), stdout),
            "run-assembly" => RunAssemblyAsync(GetRequiredPath(args, 1), stdout),
            "meta-sources" => Task.FromResult(PrintMetaSources(GetRequiredPath(args, 1), stdout)),
            "build" => Task.FromResult(BuildFile(args, stdout)),
            "emit-csharp" => Task.FromResult(EmitCSharp(GetRequiredPath(args, 1), stdout)),
            "parse-mron" => Task.FromResult(ParseMron(GetRequiredPath(args, 1), stdout)),
            "parse-mrml" => Task.FromResult(ParseMrml(GetRequiredPath(args, 1), stdout)),
            "parse-mrtd" => Task.FromResult(ParseMrtd(GetRequiredPath(args, 1), stdout)),
            _ when LooksLikeAssemblyPath(args[0]) => RunAssemblyAsync(args[0], stdout),
            _ when LooksLikeFilePath(args[0]) => RunFileAsync(args[0], stdout),
            _ => throw new InvalidOperationException($"Unknown command '{args[0]}'.")
        };
    }

    private static int CheckFile(string[] args, TextWriter stdout)
    {
        var inputPath = GetRequiredPath(args, 1);
        var json = ParseJsonFlag(args, 2, "Check");
        var source = ReadSource(inputPath);
        var result = MakrellCompiler.Check(source);
        WriteCheckOutput(result, stdout, json);
        return result.Success ? 0 : 1;
    }

    private static int CheckMron(string[] args, TextWriter stdout)
    {
        var inputPath = GetRequiredPath(args, 1);
        var json = ParseJsonFlag(args, 2, "check-mron");
        var source = ReadSource(inputPath);
        var result = CheckFormat(source, "mron", diagnostics => MronParser.ParseSource(source, diagnostics: diagnostics));
        WriteCheckOutput(result, stdout, json);
        return result.Success ? 0 : 1;
    }

    private static int CheckMrml(string[] args, TextWriter stdout)
    {
        var inputPath = GetRequiredPath(args, 1);
        var json = ParseJsonFlag(args, 2, "check-mrml");
        var source = ReadSource(inputPath);
        var result = CheckFormat(source, "mrml", diagnostics => MrmlParser.ParseSource(source, diagnostics: diagnostics));
        WriteCheckOutput(result, stdout, json);
        return result.Success ? 0 : 1;
    }

    private static int CheckMrtd(string[] args, TextWriter stdout)
    {
        var inputPath = GetRequiredPath(args, 1);
        var json = ParseJsonFlag(args, 2, "check-mrtd");
        var source = ReadSource(inputPath);
        var result = CheckFormat(source, "mrtd", diagnostics => MrtdParser.ParseSource(source, diagnostics: diagnostics));
        WriteCheckOutput(result, stdout, json);
        return result.Success ? 0 : 1;
    }

    private static async Task<int> RunFileAsync(string path, TextWriter stdout)
    {
        var source = ReadSource(path);
        var result = await MakrellCompiler.RunAsync(source);
        await stdout.WriteLineAsync(FormatValue(result));
        return 0;
    }

    private static async Task<int> RunAssemblyAsync(string path, TextWriter stdout)
    {
        var result = await MakrellCompiler.RunAssemblyAsync(path);
        await stdout.WriteLineAsync(FormatValue(result));
        return 0;
    }

    private static int PrintMetaSources(string path, TextWriter stdout)
    {
        var metaSources = MakrellCompiler.GetAssemblyMetaSources(path);
        for (var i = 0; i < metaSources.Count; i += 1)
        {
            if (i > 0)
            {
                stdout.WriteLine();
                stdout.WriteLine("----");
                stdout.WriteLine();
            }

            stdout.WriteLine(metaSources[i]);
        }

        return 0;
    }

    private static int EmitCSharp(string path, TextWriter stdout)
    {
        var source = ReadSource(path);
        var compilation = MakrellCompiler.CompileToCSharp(source);
        stdout.WriteLine(compilation.CSharpSource);
        return 0;
    }

    private static int BuildFile(string[] args, TextWriter stdout)
    {
        var inputPath = GetRequiredPath(args, 1);
        var source = ReadSource(inputPath);
        var image = MakrellCompiler.CompileToAssemblyImage(source);
        var outputPath = GetBuildOutputPath(args, inputPath);
        var outputDirectory = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(outputDirectory))
        {
            Directory.CreateDirectory(outputDirectory);
        }

        File.WriteAllBytes(outputPath, image.PeBytes);
        if (image.PdbBytes.Length > 0)
        {
            var pdbPath = Path.ChangeExtension(outputPath, ".pdb");
            File.WriteAllBytes(pdbPath, image.PdbBytes);
        }

        stdout.WriteLine(Path.GetFullPath(outputPath));
        return 0;
    }

    private static int ParseMron(string path, TextWriter stdout)
    {
        var source = ReadSource(path);
        using var document = MronParser.ParseSource(source);
        var json = JsonSerializer.Serialize(
            document.RootElement,
            new JsonSerializerOptions { WriteIndented = true });
        stdout.WriteLine(json);
        return 0;
    }

    private static int ParseMrml(string path, TextWriter stdout)
    {
        var source = ReadSource(path);
        var document = MrmlParser.ParseSource(source);
        stdout.WriteLine(document.ToString());
        return 0;
    }

    private static int ParseMrtd(string path, TextWriter stdout)
    {
        var source = ReadSource(path);
        var document = MrtdParser.ParseSource(source);
        var json = JsonSerializer.Serialize(
            document.ToJsonObject(),
            new JsonSerializerOptions { WriteIndented = true });
        stdout.WriteLine(json);
        return 0;
    }

    private static string ReadSource(string path)
    {
        var fullPath = Path.GetFullPath(path);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"Makrell# source file not found: {fullPath}");
        }

        return File.ReadAllText(fullPath);
    }

    private static string GetRequiredPath(string[] args, int index)
    {
        if (args.Length <= index)
        {
            throw new InvalidOperationException("A source file path is required.");
        }

        return args[index];
    }

    private static string GetBuildOutputPath(string[] args, string inputPath)
    {
        if (args.Length <= 2)
        {
            return Path.ChangeExtension(inputPath, ".dll");
        }

        if (args.Length == 4 && args[2] is "-o" or "--output")
        {
            return args[3];
        }

        throw new InvalidOperationException("Build accepts at most one output path via -o or --output.");
    }

    private static bool IsHelp(string arg) =>
        arg is "-h" or "--help" or "help";

    private static bool LooksLikeFilePath(string arg) =>
        arg.EndsWith(".mrsh", StringComparison.OrdinalIgnoreCase)
        || arg.EndsWith(".mr", StringComparison.OrdinalIgnoreCase)
        || File.Exists(arg);

    private static bool LooksLikeAssemblyPath(string arg) =>
        arg.EndsWith(".dll", StringComparison.OrdinalIgnoreCase);

    private static string FormatValue(object? value)
    {
        return value switch
        {
            null => "null",
            string text => text,
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture) ?? string.Empty,
            _ => value.ToString() ?? string.Empty,
        };
    }

    private static object ToJsonCheckResult(MakrellCheckResult result)
    {
        return new
        {
            ok = result.Success,
            diagnostics = result.Diagnostics.Select(static diagnostic => new
            {
                phase = diagnostic.Phase,
                code = diagnostic.Code,
                message = diagnostic.Message,
                severity = diagnostic.Severity.ToString().ToLowerInvariant(),
                range = diagnostic.Span is null
                    ? null
                    : new
                    {
                        start = new
                        {
                            line = diagnostic.Span.Value.Start.Line,
                            column = diagnostic.Span.Value.Start.Column,
                        },
                        end = new
                        {
                            line = diagnostic.Span.Value.End.Line,
                            column = diagnostic.Span.Value.End.Column,
                        },
                    },
            }),
        };
    }

    private static void WriteCheckResult(MakrellCheckResult result, TextWriter stdout)
    {
        if (result.Success)
        {
            stdout.WriteLine("OK");
            return;
        }

        foreach (var diagnostic in result.Diagnostics)
        {
            var severity = diagnostic.Severity.ToString().ToLowerInvariant();
            var location = diagnostic.Span is null
                ? string.Empty
                : $" {diagnostic.Span.Value.Start.Line}:{diagnostic.Span.Value.Start.Column}-{diagnostic.Span.Value.End.Line}:{diagnostic.Span.Value.End.Column}";
            stdout.WriteLine($"{severity} {diagnostic.Phase} {diagnostic.Code}{location} {diagnostic.Message}");
        }
    }

    private static void WriteCheckOutput(MakrellCheckResult result, TextWriter stdout, bool json)
    {
        if (json)
        {
            stdout.WriteLine(JsonSerializer.Serialize(
                ToJsonCheckResult(result),
                new JsonSerializerOptions { WriteIndented = true }));
            return;
        }

        WriteCheckResult(result, stdout);
    }

    private static bool ParseJsonFlag(string[] args, int startIndex, string commandName)
    {
        var json = args.Skip(startIndex).Contains("--json", StringComparer.Ordinal);
        if (args.Skip(startIndex).Any(arg => arg != "--json"))
        {
            throw new InvalidOperationException($"{commandName} accepts only the optional --json flag.");
        }

        return json;
    }

    private static MakrellCheckResult CheckFormat(string source, string phase, Action<MakrellSharp.BaseFormat.DiagnosticBag> parse)
    {
        var baseFormatDiagnostics = new MakrellSharp.BaseFormat.DiagnosticBag();
        var diagnostics = new List<MakrellDiagnostic>();

        try
        {
            parse(baseFormatDiagnostics);
        }
        catch (Exception ex)
        {
            diagnostics.AddRange(
                baseFormatDiagnostics.Items.Select(static item =>
                    new MakrellDiagnostic("baseformat", item.Code, item.Message, MakrellDiagnosticSeverity.Error, item.Span)));
            diagnostics.Add(new MakrellDiagnostic(phase, $"{phase.ToUpperInvariant()}001", ex.Message));
            return new MakrellCheckResult(false, diagnostics);
        }

        diagnostics.AddRange(
            baseFormatDiagnostics.Items.Select(static item =>
                new MakrellDiagnostic("baseformat", item.Code, item.Message, MakrellDiagnosticSeverity.Error, item.Span)));

        return new MakrellCheckResult(!diagnostics.Any(), diagnostics);
    }

    private static void PrintUsage(TextWriter stdout)
    {
        stdout.WriteLine(
            """
            Makrell# CLI

            Usage:
              makrellsharp run <file.mrsh>
              makrellsharp check <file.mrsh> [--json]
              makrellsharp check-mron <file.mron> [--json]
              makrellsharp check-mrml <file.mrml> [--json]
              makrellsharp check-mrtd <file.mrtd> [--json]
              makrellsharp run-assembly <file.dll>
              makrellsharp meta-sources <file.dll>
              makrellsharp build <file.mrsh> [-o output.dll]
              makrellsharp emit-csharp <file.mrsh>
              makrellsharp <file.mrsh>
              makrellsharp parse-mron <file.mron>
              makrellsharp parse-mrml <file.mrml>
              makrellsharp parse-mrtd <file.mrtd>
            """);
    }
}
