namespace MakrellSharp.Compiler;

public sealed class MakrellRuntimeException : InvalidOperationException
{
    public MakrellRuntimeException(string message, string cSharpSource, Exception innerException)
        : base(message, innerException)
    {
        CSharpSource = cSharpSource;
    }

    public string CSharpSource { get; }
}
