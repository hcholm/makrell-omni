using MakrellSharp.Ast;

namespace MakrellSharp.BaseFormat;

public sealed record Diagnostic(string Code, string Message, SourceSpan? Span = null);

public sealed class DiagnosticBag
{
    private readonly List<Diagnostic> diagnostics = [];

    public IReadOnlyList<Diagnostic> Items => diagnostics;

    public bool HasErrors => diagnostics.Count > 0;

    public void Error(string code, string message, SourceSpan? span = null)
    {
        diagnostics.Add(new Diagnostic(code, message, span));
    }
}
