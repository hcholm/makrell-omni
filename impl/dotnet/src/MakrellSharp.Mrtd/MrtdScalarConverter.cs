using System.Text;
using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.Mrtd;

internal static class MrtdScalarConverter
{
    public static object? ConvertScalar(Node node, MrtdParseOptions options)
    {
        return node switch
        {
            IdentifierNode identifier => ConvertIdentifier(identifier),
            StringNode str => ConvertString(str, options),
            NumberNode number => ConvertNumber(number, options),
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

    private static object ConvertString(StringNode str, MrtdParseOptions options)
    {
        var unescaped = Unescape(str.Value);
        try
        {
            return BasicSuffixProfile.ApplyString(unescaped, str.Suffix);
        }
        catch (InvalidOperationException)
        {
            throw UnsupportedStringSuffix(str.Suffix, options);
        }
    }

    private static object ConvertNumber(NumberNode number, MrtdParseOptions options)
    {
        try
        {
            return BasicSuffixProfile.ApplyNumber(number.Value, number.Suffix);
        }
        catch (InvalidOperationException)
        {
            throw UnsupportedNumberSuffix(number.Suffix, options);
        }
    }

    private static Exception UnsupportedStringSuffix(string suffix, MrtdParseOptions options)
    {
        return new InvalidOperationException($"Unsupported MRTD string suffix '{suffix}'.");
    }

    private static Exception UnsupportedNumberSuffix(string suffix, MrtdParseOptions options)
    {
        return new InvalidOperationException($"Unsupported MRTD number suffix '{suffix}'.");
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
