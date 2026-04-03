using System.Globalization;
using System.Text.Json;
using MakrellSharp.Compiler;
using MakrellSharp.Mrml;
using MakrellSharp.Mron;
using MakrellSharp.Mrtd;

return await MakrellSharpCli.RunAsync(args, Console.Out, Console.Error);

public static class MakrellSharpCli
{
    public static Task<int> RunAsync(string[] args, TextWriter stdout, TextWriter stderr)
    {
        try
        {
            return Task.FromResult(Run(args, stdout));
        }
        catch (Exception ex)
        {
            stderr.WriteLine(ex.Message);
            return Task.FromResult(1);
        }
    }

    private static int Run(string[] args, TextWriter stdout)
    {
        if (args.Length == 0 || IsHelp(args[0]))
        {
            PrintUsage(stdout);
            return 0;
        }

        return args[0] switch
        {
            "run" => RunFile(GetRequiredPath(args, 1), stdout),
            "run-assembly" => RunAssembly(GetRequiredPath(args, 1), stdout),
            "meta-sources" => PrintMetaSources(GetRequiredPath(args, 1), stdout),
            "build" => BuildFile(args, stdout),
            "emit-csharp" => EmitCSharp(GetRequiredPath(args, 1), stdout),
            "parse-mron" => ParseMron(GetRequiredPath(args, 1), stdout),
            "parse-mrml" => ParseMrml(GetRequiredPath(args, 1), stdout),
            "parse-mrtd" => ParseMrtd(GetRequiredPath(args, 1), stdout),
            _ when LooksLikeAssemblyPath(args[0]) => RunAssembly(args[0], stdout),
            _ when LooksLikeFilePath(args[0]) => RunFile(args[0], stdout),
            _ => throw new InvalidOperationException($"Unknown command '{args[0]}'.")
        };
    }

    private static int RunFile(string path, TextWriter stdout)
    {
        var source = ReadSource(path);
        var result = MakrellCompiler.Run(source);
        stdout.WriteLine(FormatValue(result));
        return 0;
    }

    private static int RunAssembly(string path, TextWriter stdout)
    {
        var result = MakrellCompiler.RunAssembly(path);
        stdout.WriteLine(FormatValue(result));
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

    private static void PrintUsage(TextWriter stdout)
    {
        stdout.WriteLine(
            """
            Makrell# CLI

            Usage:
              makrellsharp run <file.mrsh>
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
