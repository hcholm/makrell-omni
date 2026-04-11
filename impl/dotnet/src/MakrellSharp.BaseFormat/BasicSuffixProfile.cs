using System.Globalization;
using System.Text;
using MakrellSharp.Ast;

namespace MakrellSharp.BaseFormat;

public static class BasicSuffixProfile
{
    public static object? Apply(Node node)
    {
        return node switch
        {
            StringNode str => ApplyString(UnescapeStringLiteral(str.Value), str.Suffix),
            NumberNode number => ApplyNumber(number.Value, number.Suffix),
            _ => null,
        };
    }

    public static object ApplyString(string value, string suffix)
    {
        return suffix switch
        {
            "" => value,
            "dt" => DateTime.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind),
            "bin" => System.Convert.ToInt64(value, 2),
            "oct" => System.Convert.ToInt64(value, 8),
            "hex" => System.Convert.ToInt64(value, 16),
            _ => throw new InvalidOperationException($"Unsupported basic suffix profile string suffix '{suffix}'."),
        };
    }

    public static object ApplyNumber(string value, string suffix)
    {
        if (IsInteger(value))
        {
            var baseValue = long.Parse(value, CultureInfo.InvariantCulture);
            return suffix switch
            {
                "" => (object)baseValue,
                "k" => baseValue * 1_000L,
                "M" => baseValue * 1_000_000L,
                "G" => baseValue * 1_000_000_000L,
                "T" => baseValue * 1_000_000_000_000L,
                "P" => baseValue * 1_000_000_000_000_000L,
                "E" => baseValue * 1_000_000_000_000_000_000L,
                "e" => (object)(Math.E * baseValue),
                "tau" => Math.Tau * baseValue,
                "deg" => Math.PI * baseValue / 180d,
                "pi" => Math.PI * baseValue,
                _ => throw new InvalidOperationException($"Unsupported basic suffix profile numeric suffix '{suffix}'."),
            };
        }

        var floatValue = double.Parse(value, CultureInfo.InvariantCulture);
        return suffix switch
        {
            "" => (object)floatValue,
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
            _ => throw new InvalidOperationException($"Unsupported basic suffix profile numeric suffix '{suffix}'."),
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

    private static string UnescapeStringLiteral(string raw)
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
