using System.Globalization;

namespace MakrellSharp.Compiler;

public static class MakrellCompilerRuntime
{
    public static object? NumberLiteral(string value, string suffix)
    {
        if (string.IsNullOrEmpty(suffix))
        {
            return value.Contains('.') || value.Contains('e') || value.Contains('E')
                ? double.Parse(value, CultureInfo.InvariantCulture)
                : long.Parse(value, CultureInfo.InvariantCulture);
        }

        var asDouble = double.Parse(value, CultureInfo.InvariantCulture);
        return suffix switch
        {
            "k" => asDouble * 1_000d,
            "M" => asDouble * 1_000_000d,
            "G" => asDouble * 1_000_000_000d,
            "T" => asDouble * 1_000_000_000_000d,
            "P" => asDouble * 1_000_000_000_000_000d,
            "E" => asDouble * 1_000_000_000_000_000_000d,
            "e" => Math.E * asDouble,
            "tau" => Math.Tau * asDouble,
            "deg" => Math.PI * asDouble / 180d,
            "pi" => Math.PI * asDouble,
            _ => throw new InvalidOperationException($"Unsupported number suffix '{suffix}'."),
        };
    }

    public static object? StringLiteral(string value, string suffix)
    {
        var inner = value.Length >= 2 ? value[1..^1] : value;
        var unescaped = inner
            .Replace("\\\"", "\"", StringComparison.Ordinal)
            .Replace("\\\\", "\\", StringComparison.Ordinal);

        return suffix switch
        {
            "" => unescaped,
            "dt" => DateTime.Parse(unescaped, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind),
            "bin" => Convert.ToInt64(unescaped, 2),
            "oct" => Convert.ToInt64(unescaped, 8),
            "hex" => Convert.ToInt64(unescaped, 16),
            "regex" => unescaped,
            _ => throw new InvalidOperationException($"Unsupported string suffix '{suffix}'."),
        };
    }
}
