using MakrellSharp.Ast;

namespace MakrellSharp.Compiler;

public delegate IReadOnlyList<Node> NativeMacro(MacroInvocation invocation, MacroContext context);

public sealed class MacroRegistry
{
    private readonly Dictionary<string, NativeMacro> nativeMacros = new(StringComparer.Ordinal);

    public void RegisterNative(string name, NativeMacro macro)
    {
        ArgumentException.ThrowIfNullOrEmpty(name);
        ArgumentNullException.ThrowIfNull(macro);
        nativeMacros[name] = macro;
    }

    public bool TryGetNative(string name, out NativeMacro macro) =>
        nativeMacros.TryGetValue(name, out macro!);
}
