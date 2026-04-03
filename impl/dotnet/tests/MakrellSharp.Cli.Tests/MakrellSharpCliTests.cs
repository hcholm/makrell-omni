using System.Text;

namespace MakrellSharp.Cli.Tests;

public sealed class MakrellSharpCliTests
{
    [Fact]
    public async Task RunAsync_NoArgs_PrintsUsage()
    {
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        var exitCode = await MakrellSharpCli.RunAsync([], stdout, stderr);

        Assert.Equal(0, exitCode);
        Assert.Contains("Makrell# CLI", stdout.ToString(), StringComparison.Ordinal);
        Assert.Equal(string.Empty, stderr.ToString());
    }

    [Fact]
    public async Task RunAsync_RunCommand_ExecutesMakrellSharpFile()
    {
        var path = CreateTempFile(".mrsh", "2 + 3");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var exitCode = await MakrellSharpCli.RunAsync(["run", path], stdout, stderr);

            Assert.Equal(0, exitCode);
            Assert.Equal("5", stdout.ToString().Trim());
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task RunAsync_DirectFilePath_ExecutesMakrellSharpFile()
    {
        var path = CreateTempFile(".mrsh", "\"Hello\"");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var exitCode = await MakrellSharpCli.RunAsync([path], stdout, stderr);

            Assert.Equal(0, exitCode);
            Assert.Equal("Hello", stdout.ToString().Trim());
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task RunAsync_RunCommand_ExecutesAsyncMakrellSharpFile()
    {
        var path = CreateTempFile(
            ".mrsh",
            """
            {async fun fetchValue [value]
                value}

            {async fun addLater [x y]
                left = {await {fetchValue x}}
                right = {await {fetchValue y}}
                left + right}

            {await {addLater 20 22}}
            """);
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var exitCode = await MakrellSharpCli.RunAsync(["run", path], stdout, stderr);

            Assert.Equal(0, exitCode);
            Assert.Equal("42", stdout.ToString().Trim());
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task RunAsync_EmitCSharp_WritesGeneratedModule()
    {
        var path = CreateTempFile(".mrsh", "2 + 3");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var exitCode = await MakrellSharpCli.RunAsync(["emit-csharp", path], stdout, stderr);
            var output = stdout.ToString();

            Assert.Equal(0, exitCode);
            Assert.Contains("public static class __MakrellModule", output, StringComparison.Ordinal);
            Assert.Contains("return (2 + 3);", output, StringComparison.Ordinal);
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task RunAsync_Build_WritesAssemblyNextToSourceByDefault()
    {
        var path = CreateTempFile(".mrsh", "2 + 3");
        var outputPath = Path.ChangeExtension(path, ".dll");
        var pdbPath = Path.ChangeExtension(path, ".pdb");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var exitCode = await MakrellSharpCli.RunAsync(["build", path], stdout, stderr);

            Assert.Equal(0, exitCode);
            Assert.Equal(Path.GetFullPath(outputPath), stdout.ToString().Trim());
            Assert.True(File.Exists(outputPath));
            Assert.True(new FileInfo(outputPath).Length > 0);
            Assert.True(File.Exists(pdbPath));
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
            File.Delete(outputPath);
            File.Delete(pdbPath);
        }
    }

    [Fact]
    public async Task RunAsync_Build_WithExplicitOutput_WritesAssemblyToRequestedPath()
    {
        var path = CreateTempFile(".mrsh", "\"Hello\"");
        var directory = Path.Combine(Path.GetTempPath(), "makrellsharp-cli-build-" + Guid.NewGuid().ToString("N"));
        var outputPath = Path.Combine(directory, "custom-output.dll");
        var pdbPath = Path.ChangeExtension(outputPath, ".pdb");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        Directory.CreateDirectory(directory);

        try
        {
            var exitCode = await MakrellSharpCli.RunAsync(["build", path, "-o", outputPath], stdout, stderr);

            Assert.Equal(0, exitCode);
            Assert.Equal(Path.GetFullPath(outputPath), stdout.ToString().Trim());
            Assert.True(File.Exists(outputPath));
            Assert.True(new FileInfo(outputPath).Length > 0);
            Assert.True(File.Exists(pdbPath));
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
            if (Directory.Exists(directory))
            {
                Directory.Delete(directory, recursive: true);
            }
        }
    }

    [Fact]
    public async Task RunAsync_RunAssembly_ExecutesBuiltAssembly()
    {
        var path = CreateTempFile(".mrsh", "2 + 5");
        var outputPath = Path.ChangeExtension(path, ".dll");
        var pdbPath = Path.ChangeExtension(path, ".pdb");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var buildExitCode = await MakrellSharpCli.RunAsync(["build", path], new StringWriter(), new StringWriter());
            Assert.Equal(0, buildExitCode);

            var exitCode = await MakrellSharpCli.RunAsync(["run-assembly", outputPath], stdout, stderr);

            Assert.Equal(0, exitCode);
            Assert.Equal("7", stdout.ToString().Trim());
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
            File.Delete(outputPath);
            File.Delete(pdbPath);
        }
    }

    [Fact]
    public async Task RunAsync_DirectAssemblyPath_ExecutesBuiltAssembly()
    {
        var path = CreateTempFile(".mrsh", "\"built\"");
        var outputPath = Path.ChangeExtension(path, ".dll");
        var pdbPath = Path.ChangeExtension(path, ".pdb");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var buildExitCode = await MakrellSharpCli.RunAsync(["build", path], new StringWriter(), new StringWriter());
            Assert.Equal(0, buildExitCode);

            var exitCode = await MakrellSharpCli.RunAsync([outputPath], stdout, stderr);

            Assert.Equal(0, exitCode);
            Assert.Equal("built", stdout.ToString().Trim());
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
            File.Delete(outputPath);
            File.Delete(pdbPath);
        }
    }

    [Fact]
    public async Task RunAsync_MetaSources_PrintsEmbeddedCompileTimeSources()
    {
        var path = CreateTempFile(
            ".mrsh",
            """
            {meta
                a = 2}
            {def macro incr [ns]
                ns = {regular ns}
                {quote {unquote ns@0} + {unquote a}}}
            0
            """);
        var outputPath = Path.ChangeExtension(path, ".dll");
        var pdbPath = Path.ChangeExtension(path, ".pdb");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var buildExitCode = await MakrellSharpCli.RunAsync(["build", path], new StringWriter(), new StringWriter());
            Assert.Equal(0, buildExitCode);

            var exitCode = await MakrellSharpCli.RunAsync(["meta-sources", outputPath], stdout, stderr);
            var output = stdout.ToString();

            Assert.Equal(0, exitCode);
            Assert.Contains("{meta", output, StringComparison.Ordinal);
            Assert.Contains("{def macro incr", output, StringComparison.Ordinal);
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
            File.Delete(outputPath);
            File.Delete(pdbPath);
        }
    }

    [Fact]
    public async Task RunAsync_ParseMron_WritesIndentedJson()
    {
        var path = CreateTempFile(".mron", "a 2 b [3 5]");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var exitCode = await MakrellSharpCli.RunAsync(["parse-mron", path], stdout, stderr);
            var output = stdout.ToString();

            Assert.Equal(0, exitCode);
            Assert.Contains("\"a\": 2", output, StringComparison.Ordinal);
            Assert.Contains("\"b\": [", output, StringComparison.Ordinal);
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task RunAsync_ParseMrml_WritesXml()
    {
        var path = CreateTempFile(".mrml", "{a [b=\"2\"] \"x\"}");
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var exitCode = await MakrellSharpCli.RunAsync(["parse-mrml", path], stdout, stderr);
            var output = stdout.ToString();

            Assert.Equal(0, exitCode);
            Assert.Contains("<a", output, StringComparison.Ordinal);
            Assert.Contains("b=\"2\"", output, StringComparison.Ordinal);
            Assert.Contains(">x</a>", output, StringComparison.Ordinal);
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task RunAsync_ParseMrtd_WritesNormalisedJson()
    {
        var path = CreateTempFile(
            ".mrtd",
            """
            name:string qty:int
            Ada 2
            """);
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        try
        {
            var exitCode = await MakrellSharpCli.RunAsync(["parse-mrtd", path], stdout, stderr);
            var output = stdout.ToString();

            Assert.Equal(0, exitCode);
            Assert.Contains("\"columns\": [", output, StringComparison.Ordinal);
            Assert.Contains("\"records\": [", output, StringComparison.Ordinal);
            Assert.Contains("\"name\": \"Ada\"", output, StringComparison.Ordinal);
            Assert.Equal(string.Empty, stderr.ToString());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public async Task RunAsync_MissingFile_WritesErrorAndReturnsFailure()
    {
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        var exitCode = await MakrellSharpCli.RunAsync(["run", "does-not-exist.mrsh"], stdout, stderr);

        Assert.Equal(1, exitCode);
        Assert.Equal(string.Empty, stdout.ToString());
        Assert.Contains("source file not found", stderr.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private static string CreateTempFile(string extension, string content)
    {
        var path = Path.Combine(Path.GetTempPath(), "makrellsharp-cli-" + Guid.NewGuid().ToString("N") + extension);
        File.WriteAllText(path, content, Encoding.UTF8);
        return path;
    }
}
