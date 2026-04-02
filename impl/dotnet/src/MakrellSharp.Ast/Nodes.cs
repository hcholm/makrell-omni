namespace MakrellSharp.Ast;

public abstract record Node(SourceSpan Span);

public abstract record TokenNode(string Value, SourceSpan Span) : Node(Span);

public sealed record IdentifierNode(string Value, SourceSpan Span) : TokenNode(Value, Span);

public sealed record StringNode(string Value, string Suffix, SourceSpan Span) : Node(Span);

public sealed record NumberNode(string Value, string Suffix, SourceSpan Span) : Node(Span);

public sealed record OperatorNode(string Value, SourceSpan Span) : TokenNode(Value, Span);

public sealed record CommentNode(string Value, SourceSpan Span) : TokenNode(Value, Span);

public sealed record WhitespaceNode(string Value, SourceSpan Span) : TokenNode(Value, Span);

public sealed record UnknownNode(string Value, SourceSpan Span) : TokenNode(Value, Span);

public sealed record LeftBracketNode(char Value, SourceSpan Span) : Node(Span);

public sealed record RightBracketNode(char Value, SourceSpan Span) : Node(Span);

public abstract record BracketNode(IReadOnlyList<Node> Nodes, IReadOnlyList<Node> OriginalNodes, SourceSpan Span) : Node(Span);

public sealed record RoundBracketsNode(IReadOnlyList<Node> Nodes, IReadOnlyList<Node> OriginalNodes, SourceSpan Span)
    : BracketNode(Nodes, OriginalNodes, Span);

public sealed record SquareBracketsNode(IReadOnlyList<Node> Nodes, IReadOnlyList<Node> OriginalNodes, SourceSpan Span)
    : BracketNode(Nodes, OriginalNodes, Span);

public sealed record CurlyBracketsNode(IReadOnlyList<Node> Nodes, IReadOnlyList<Node> OriginalNodes, SourceSpan Span)
    : BracketNode(Nodes, OriginalNodes, Span);

public sealed record SequenceNode(IReadOnlyList<Node> Nodes, IReadOnlyList<Node> OriginalNodes, SourceSpan Span) : Node(Span);

public sealed record BinOpNode(Node Left, string Operator, Node Right, SourceSpan Span) : Node(Span);
