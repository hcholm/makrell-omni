using System.Globalization;
using System.Text;
using MakrellSharp.Ast;

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
        return str.Suffix switch
        {
            "" => unescaped,
            "dt" => DateTime.Parse(unescaped, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind),
            "bin" => System.Convert.ToInt64(unescaped, 2),
            "oct" => System.Convert.ToInt64(unescaped, 8),
            "hex" => System.Convert.ToInt64(unescaped, 16),
            _ => throw UnsupportedStringSuffix(str.Suffix, options),
        };
    }

    private static object ConvertNumber(NumberNode number, MrtdParseOptions options)
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
                _ => throw UnsupportedNumberSuffix(number.Suffix, options),
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
            _ => throw UnsupportedNumberSuffix(number.Suffix, options),
        };
    }

    private static Exception UnsupportedStringSuffix(string suffix, MrtdParseOptions options)
    {
        return new InvalidOperationException($"Unsupported MRTD string suffix '{suffix}'.");
    }

    private static Exception UnsupportedNumberSuffix(string suffix, MrtdParseOptions options)
    {
        return new InvalidOperationException($"Unsupported MRTD number suffix '{suffix}'.");
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
