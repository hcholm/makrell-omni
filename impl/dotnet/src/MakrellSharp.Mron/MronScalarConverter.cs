using System.Text;
using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.Mron;

internal static class MronScalarConverter
{
    public static object? ConvertScalar(Node node)
    {
        return node switch
        {
            IdentifierNode identifier => ConvertIdentifier(identifier),
            StringNode str => ConvertString(str),
            NumberNode number => ConvertNumber(number),
            _ => null,
        };
    }

    private static object? ConvertIdentifier(IdentifierNode identifier)
    {
        return identifier.Value switch
        {
            "true" => true,
            "false" => false,
            "null" => null,
            _ => identifier.Value,
        };
    }

    private static object ConvertString(StringNode str)
    {
        var unescaped = Unescape(str.Value);
        return str.Suffix switch
        {
            "regex" => unescaped,
            _ => BasicSuffixProfile.ApplyString(unescaped, str.Suffix),
        };
    }

    private static object ConvertNumber(NumberNode number)
    {
        return BasicSuffixProfile.ApplyNumber(number.Value, number.Suffix);
    }

    private static string Unescape(string raw)
    {
        var inner = raw[1..^1];
        var builder = new StringBuilder(inner.Length);
        var escaped = false;

        foreach (var ch in inner)
        {
            if (escaped)
            {
                builder.Append(ch switch
                {
                    '"' => '"',
                    '\\' => '\\',
                    'n' => '\n',
                    'r' => '\r',
                    't' => '\t',
                    _ => ch,
                });
                escaped = false;
                continue;
            }

            if (ch == '\\')
            {
                escaped = true;
                continue;
            }

            builder.Append(ch);
        }

        if (escaped)
        {
            builder.Append('\\');
        }

        return builder.ToString();
    }
}
