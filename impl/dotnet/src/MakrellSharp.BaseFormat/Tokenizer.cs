using System.Text;
using MakrellSharp.Ast;

namespace MakrellSharp.BaseFormat;

public static class Tokenizer
{
    public static IReadOnlyList<Node> Tokenize(string source)
    {
        ArgumentNullException.ThrowIfNull(source);

        var tokens = new List<Node>();
        var index = 0;
        var line = 1;
        var column = 1;

        while (index < source.Length)
        {
            var start = new SourcePosition(index, line, column);
            var (rune, runeWidth) = ReadRune(source, index);

            if (Rune.IsWhiteSpace(rune))
            {
                var text = ReadWhile(source, ref index, ref line, ref column, static current => Rune.IsWhiteSpace(current));
                tokens.Add(new WhitespaceNode(text, new SourceSpan(start, new SourcePosition(index, line, column))));
                continue;
            }

            if (rune.Value == '#')
            {
                var text = ReadToLineEnd(source, ref index, ref line, ref column);
                tokens.Add(new CommentNode(text, new SourceSpan(start, new SourcePosition(index, line, column))));
                continue;
            }

            if (rune.Value == '/' && TryPeekRune(source, index + runeWidth, out var nextRune, out _) && nextRune.Value == '*')
            {
                var text = ReadBlockComment(source, ref index, ref line, ref column);
                tokens.Add(new CommentNode(text, new SourceSpan(start, new SourcePosition(index, line, column))));
                continue;
            }

            if (IsIdentifierStart(rune))
            {
                var text = ReadWhile(source, ref index, ref line, ref column, static current => IsIdentifierPart(current));
                tokens.Add(new IdentifierNode(text, new SourceSpan(start, new SourcePosition(index, line, column))));
                continue;
            }

            if (rune.Value == '"')
            {
                var (value, suffix) = ReadStringWithSuffix(source, ref index, ref line, ref column);
                tokens.Add(new StringNode(value, suffix, new SourceSpan(start, new SourcePosition(index, line, column))));
                continue;
            }

            if (IsNumberStart(source, index))
            {
                var (value, suffix) = ReadNumberWithSuffix(source, ref index, ref line, ref column);
                tokens.Add(new NumberNode(value, suffix, new SourceSpan(start, new SourcePosition(index, line, column))));
                continue;
            }

            if (rune.Value is '(' or '[' or '{')
            {
                Advance(source.AsSpan(index, runeWidth), ref line, ref column);
                index += runeWidth;
                tokens.Add(new LeftBracketNode((char)rune.Value, new SourceSpan(start, new SourcePosition(index, line, column))));
                continue;
            }

            if (rune.Value is ')' or ']' or '}')
            {
                Advance(source.AsSpan(index, runeWidth), ref line, ref column);
                index += runeWidth;
                tokens.Add(new RightBracketNode((char)rune.Value, new SourceSpan(start, new SourcePosition(index, line, column))));
                continue;
            }

            if (IsOperatorRune(rune))
            {
                var text = ReadWhile(source, ref index, ref line, ref column, static current => IsOperatorRune(current));
                tokens.Add(new OperatorNode(text, new SourceSpan(start, new SourcePosition(index, line, column))));
                continue;
            }

            var unknown = source.Substring(index, runeWidth);
            Advance(source.AsSpan(index, runeWidth), ref line, ref column);
            index += runeWidth;
            tokens.Add(new UnknownNode(unknown, new SourceSpan(start, new SourcePosition(index, line, column))));
        }

        return tokens;
    }

    private static (string Value, string Suffix) ReadStringWithSuffix(string source, ref int index, ref int line, ref int column)
    {
        var builder = new StringBuilder();
        builder.Append('"');
        Advance(source.AsSpan(index, 1), ref line, ref column);
        index += 1;

        var escaped = false;
        while (index < source.Length)
        {
            var (rune, width) = ReadRune(source, index);
            var text = source.Substring(index, width);
            builder.Append(text);
            Advance(source.AsSpan(index, width), ref line, ref column);
            index += width;

            if (!escaped && rune.Value == '"')
            {
                break;
            }

            escaped = !escaped && rune.Value == '\\';
            if (!escaped)
            {
                continue;
            }
        }

        var suffix = ReadWhile(source, ref index, ref line, ref column, static current => IsIdentifierPart(current));
        return (builder.ToString(), suffix);
    }

    private static (string Value, string Suffix) ReadNumberWithSuffix(string source, ref int index, ref int line, ref int column)
    {
        var startIndex = index;

        if (source[index] == '-')
        {
            Advance(source.AsSpan(index, 1), ref line, ref column);
            index += 1;
        }

        ReadDigits(source, ref index, ref line, ref column);

        if (index < source.Length && source[index] == '.' && index + 1 < source.Length && char.IsDigit(source[index + 1]))
        {
            Advance(source.AsSpan(index, 1), ref line, ref column);
            index += 1;
            ReadDigits(source, ref index, ref line, ref column);
        }

        if (index < source.Length && (source[index] == 'e' || source[index] == 'E'))
        {
            var scan = index + 1;
            if (scan < source.Length && (source[scan] == '+' || source[scan] == '-'))
            {
                scan += 1;
            }

            if (scan < source.Length && char.IsDigit(source[scan]))
            {
                while (index < scan)
                {
                    Advance(source.AsSpan(index, 1), ref line, ref column);
                    index += 1;
                }

                ReadDigits(source, ref index, ref line, ref column);
            }
        }

        var suffix = ReadWhile(source, ref index, ref line, ref column, static current => IsIdentifierPart(current));
        return (source[startIndex..(index - suffix.Length)], suffix);
    }

    private static string ReadBlockComment(string source, ref int index, ref int line, ref int column)
    {
        var start = index;
        while (index < source.Length)
        {
            if (source[index] == '*' && index + 1 < source.Length && source[index + 1] == '/')
            {
                Advance(source.AsSpan(index, 2), ref line, ref column);
                index += 2;
                return source[start..index];
            }

            var (rune, width) = ReadRune(source, index);
            Advance(source.AsSpan(index, width), ref line, ref column);
            index += width;
        }

        return source[start..index];
    }

    private static void ReadDigits(string source, ref int index, ref int line, ref int column)
    {
        while (index < source.Length && char.IsDigit(source[index]))
        {
            Advance(source.AsSpan(index, 1), ref line, ref column);
            index += 1;
        }
    }

    private static string ReadToLineEnd(string source, ref int index, ref int line, ref int column)
    {
        var start = index;
        while (index < source.Length)
        {
            var (rune, width) = ReadRune(source, index);
            if (rune.Value is '\r' or '\n')
            {
                break;
            }

            Advance(source.AsSpan(index, width), ref line, ref column);
            index += width;
        }

        return source[start..index];
    }

    private static string ReadWhile(string source, ref int index, ref int line, ref int column, Func<Rune, bool> predicate)
    {
        var start = index;
        while (TryPeekRune(source, index, out var rune, out var width) && predicate(rune))
        {
            Advance(source.AsSpan(index, width), ref line, ref column);
            index += width;
        }

        return source[start..index];
    }

    private static bool IsNumberStart(string source, int index)
    {
        if (index >= source.Length)
        {
            return false;
        }

        if (char.IsDigit(source[index]))
        {
            return true;
        }

        return source[index] == '-'
            && index + 1 < source.Length
            && char.IsDigit(source[index + 1]);
    }

    private static bool IsIdentifierStart(Rune rune) =>
        Rune.IsLetter(rune) || rune.Value is '_' or '$';

    private static bool IsIdentifierPart(Rune rune) =>
        Rune.IsLetterOrDigit(rune) || rune.Value is '_' or '$';

    private static bool IsOperatorRune(Rune rune)
    {
        if (Rune.IsWhiteSpace(rune) || IsIdentifierPart(rune) || Rune.IsDigit(rune))
        {
            return false;
        }

        return rune.Value switch
        {
            '"' or '\'' or '#' or '$' or '(' or ')' or '[' or ']' or '{' or '}' => false,
            _ => true,
        };
    }

    private static (Rune Rune, int Width) ReadRune(string source, int index)
    {
        if (!Rune.TryGetRuneAt(source, index, out var rune))
        {
            throw new InvalidOperationException($"Invalid rune at index {index}.");
        }

        return (rune, rune.Utf16SequenceLength);
    }

    private static bool TryPeekRune(string source, int index, out Rune rune, out int width)
    {
        if (index >= source.Length)
        {
            rune = default;
            width = 0;
            return false;
        }

        var (readRune, readWidth) = ReadRune(source, index);
        rune = readRune;
        width = readWidth;
        return true;
    }

    private static void Advance(ReadOnlySpan<char> text, ref int line, ref int column)
    {
        foreach (var ch in text)
        {
            if (ch == '\n')
            {
                line += 1;
                column = 1;
            }
            else
            {
                column += 1;
            }
        }
    }
}
