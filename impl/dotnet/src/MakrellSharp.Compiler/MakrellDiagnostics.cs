using MakrellSharp.Ast;

namespace MakrellSharp.Compiler;

public enum MakrellDiagnosticSeverity
{
    Error,
    Warning,
    Information,
    Hint,
}

public sealed record MakrellDiagnostic(
    string Phase,
    string Code,
    string Message,
    MakrellDiagnosticSeverity Severity = MakrellDiagnosticSeverity.Error,
    SourceSpan? Span = null);

public sealed record MakrellCheckResult(
    bool Success,
    IReadOnlyList<MakrellDiagnostic> Diagnostics,
    string? CSharpSource = null);
