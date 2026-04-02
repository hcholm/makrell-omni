using System.Globalization;
using System.Text;
using MakrellSharp.Ast;

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
            "dt" => DateTime.Parse(unescaped, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind),
            "bin" => System.Convert.ToInt64(unescaped, 2),
            "oct" => System.Convert.ToInt64(unescaped, 8),
            "hex" => System.Convert.ToInt64(unescaped, 16),
            "regex" => unescaped,
            _ => unescaped,
        };
    }

    private static object ConvertNumber(NumberNode number)
    {
        if (IsInteger(number.Value))
        {
            var baseValue = long.Parse(number.Value, CultureInfo.InvariantCulture);
            return number.Suffix switch
            {
                "" => baseValue,
                "k" => baseValue * 1_000L,
                "M" => baseValue * 1_000_000L,
                "G" => baseValue * 1_000_000_000L,
                "T" => baseValue * 1_000_000_000_000L,
                "P" => baseValue * 1_000_000_000_000_000L,
                "E" => baseValue * 1_000_000_000_000_000_000L,
                "e" => Math.E * baseValue,
                "tau" => Math.Tau * baseValue,
                "deg" => Math.PI * baseValue / 180d,
                "pi" => Math.PI * baseValue,
                _ => throw new InvalidOperationException($"Unsupported number suffix '{number.Suffix}'."),
            };
        }

        var floatValue = double.Parse(number.Value, CultureInfo.InvariantCulture);
        return number.Suffix switch
        {
            "" => floatValue,
            "k" => floatValue * 1_000d,
            "M" => floatValue * 1_000_000d,
            "G" => floatValue * 1_000_000_000d,
            "T" => floatValue * 1_000_000_000_000d,
            "P" => floatValue * 1_000_000_000_000_000d,
            "E" => floatValue * 1_000_000_000_000_000_000d,
            "e" => Math.E * floatValue,
            "tau" => Math.Tau * floatValue,
            "deg" => Math.PI * floatValue / 180d,
            "pi" => Math.PI * floatValue,
            _ => throw new InvalidOperationException($"Unsupported number suffix '{number.Suffix}'."),
        };
    }

    private static bool IsInteger(string text)
    {
        foreach (var ch in text)
        {
            if (ch == '-')
            {
                continue;
            }

            if (!char.IsDigit(ch))
            {
                return false;
            }
        }

        return true;
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
