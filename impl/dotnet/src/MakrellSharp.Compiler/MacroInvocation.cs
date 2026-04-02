using MakrellSharp.Ast;

namespace MakrellSharp.Compiler;

public sealed record MacroInvocation(
    string Name,
    CurlyBracketsNode Node,
    IReadOnlyList<Node> RegularArguments,
    IReadOnlyList<Node> OriginalArguments);
