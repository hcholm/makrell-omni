using System.Globalization;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MakrellSharp.Mrtd;

public static class MrtdTyped
{
    public static IReadOnlyList<T> ReadRecords<T>(string source)
        where T : new()
    {
        return ReadRecords<T>(MrtdParser.ParseSource(source));
    }

    public static IReadOnlyList<T> ReadRecords<T>(MrtdDocument document)
        where T : new()
    {
        var properties = typeof(T)
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(static property => property.CanWrite)
            .ToDictionary(static property => property.Name, StringComparer.OrdinalIgnoreCase);

        var rows = new List<T>(document.Rows.Count);
        foreach (var recordNode in document.ToJsonRecords())
        {
            var instance = new T();
            var record = recordNode!.AsObject();
            foreach (var pair in record)
            {
                if (!properties.TryGetValue(pair.Key, out var property))
                {
                    continue;
                }

                property.SetValue(instance, ConvertNode(pair.Value, property.PropertyType));
            }

            rows.Add(instance);
        }

        return rows;
    }

    public static IReadOnlyList<(T1, T2)> ReadTuples<T1, T2>(string source)
    {
        return ReadTuples<T1, T2>(MrtdParser.ParseSource(source));
    }

    public static IReadOnlyList<(T1, T2)> ReadTuples<T1, T2>(MrtdDocument document)
    {
        EnsureWidth(document, 2);
        return document.Rows
            .Select(static row => (
                ConvertCell<T1>(row.Cells[0]),
                ConvertCell<T2>(row.Cells[1])))
            .ToArray();
    }

    public static IReadOnlyList<(T1, T2, T3)> ReadTuples<T1, T2, T3>(string source)
    {
        return ReadTuples<T1, T2, T3>(MrtdParser.ParseSource(source));
    }

    public static IReadOnlyList<(T1, T2, T3)> ReadTuples<T1, T2, T3>(MrtdDocument document)
    {
        EnsureWidth(document, 3);
        return document.Rows
            .Select(static row => (
                ConvertCell<T1>(row.Cells[0]),
                ConvertCell<T2>(row.Cells[1]),
                ConvertCell<T3>(row.Cells[2])))
            .ToArray();
    }

    public static string WriteRecords<T>(IEnumerable<T> rows)
    {
        var rowList = rows.ToList();
        var properties = typeof(T)
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(static property => property.CanRead)
            .ToArray();

        if (properties.Length == 0)
        {
            throw new InvalidOperationException($"Type '{typeof(T).Name}' does not expose readable public properties for MRTD writing.");
        }

        var header = string.Join(
            " ",
            properties.Select(static property => FormatHeaderCell(property.Name, property.PropertyType)));

        var builder = new StringBuilder();
        builder.AppendLine(header);
        foreach (var row in rowList)
        {
            builder.AppendLine(string.Join(" ", properties.Select(property => FormatScalar(property.GetValue(row)))));
        }

        return builder.ToString().TrimEnd();
    }

    public static string WriteTuples<T1, T2>(IEnumerable<(T1, T2)> rows, params string[] headers)
    {
        var actualHeaders = ResolveHeaders(headers, 2);
        return WriteUntypedRows(
            new[]
            {
                FormatHeaderCell(actualHeaders[0], typeof(T1)),
                FormatHeaderCell(actualHeaders[1], typeof(T2)),
            },
            rows.Select(static row => new object?[] { row.Item1, row.Item2 }));
    }

    public static string WriteTuples<T1, T2, T3>(IEnumerable<(T1, T2, T3)> rows, params string[] headers)
    {
        var actualHeaders = ResolveHeaders(headers, 3);
        return WriteUntypedRows(
            new[]
            {
                FormatHeaderCell(actualHeaders[0], typeof(T1)),
                FormatHeaderCell(actualHeaders[1], typeof(T2)),
                FormatHeaderCell(actualHeaders[2], typeof(T3)),
            },
            rows.Select(static row => new object?[] { row.Item1, row.Item2, row.Item3 }));
    }

    private static void EnsureWidth(MrtdDocument document, int expected)
    {
        if (document.Columns.Count != expected)
        {
            throw new InvalidOperationException(
                $"MRTD column count {document.Columns.Count} does not match requested tuple arity {expected}.");
        }
    }

    private static T ConvertCell<T>(JsonNode? node)
    {
        return (T)ConvertNode(node, typeof(T))!;
    }

    private static object? ConvertNode(JsonNode? node, Type targetType)
    {
        var nullableType = Nullable.GetUnderlyingType(targetType);
        var actualTarget = nullableType ?? targetType;

        if (node is null)
        {
            if (nullableType is not null || !actualTarget.IsValueType)
            {
                return null;
            }

            return Activator.CreateInstance(actualTarget);
        }

        if (actualTarget == typeof(string))
        {
            return node.GetValue<string>();
        }

        if (actualTarget == typeof(bool))
        {
            return node.GetValue<bool>();
        }

        if (actualTarget.IsEnum)
        {
            var name = node.GetValue<string>();
            return Enum.Parse(actualTarget, name, ignoreCase: true);
        }

        if (node is JsonValue value)
        {
            var raw = value.GetValue<object?>();
            if (raw is not null)
            {
                return ConvertSimple(raw, actualTarget);
            }
        }

        return JsonSerializer.Deserialize(node.ToJsonString(), actualTarget);
    }

    private static object? ConvertSimple(object value, Type targetType)
    {
        if (targetType.IsInstanceOfType(value))
        {
            return value;
        }

        if (targetType == typeof(string))
        {
            return Convert.ToString(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(bool))
        {
            return Convert.ToBoolean(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(int))
        {
            return Convert.ToInt32(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(long))
        {
            return Convert.ToInt64(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(double))
        {
            return Convert.ToDouble(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(float))
        {
            return Convert.ToSingle(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(decimal))
        {
            return Convert.ToDecimal(value, CultureInfo.InvariantCulture);
        }

        return Convert.ChangeType(value, targetType, CultureInfo.InvariantCulture);
    }

    private static string[] ResolveHeaders(string[] headers, int expectedCount)
    {
        if (headers.Length == 0)
        {
            return Enumerable.Range(1, expectedCount).Select(static index => $"c{index}").ToArray();
        }

        if (headers.Length != expectedCount)
        {
            throw new InvalidOperationException($"Expected {expectedCount} MRTD tuple headers, got {headers.Length}.");
        }

        return headers;
    }

    private static string WriteUntypedRows(IEnumerable<string> headerCells, IEnumerable<object?[]> rows)
    {
        var builder = new StringBuilder();
        builder.AppendLine(string.Join(" ", headerCells));
        foreach (var row in rows)
        {
            builder.AppendLine(string.Join(" ", row.Select(FormatScalar)));
        }

        return builder.ToString().TrimEnd();
    }

    private static string FormatHeaderCell(string name, Type type)
    {
        var mappedType = MapClrType(type);
        return mappedType is null
            ? FormatIdentifierOrString(name)
            : $"{FormatIdentifierOrString(name)}:{mappedType}";
    }

    private static string? MapClrType(Type type)
    {
        var actualType = Nullable.GetUnderlyingType(type) ?? type;
        if (actualType == typeof(string))
        {
            return "string";
        }

        if (actualType == typeof(bool))
        {
            return "bool";
        }

        if (actualType == typeof(int)
            || actualType == typeof(long)
            || actualType == typeof(short)
            || actualType == typeof(byte))
        {
            return "int";
        }

        if (actualType == typeof(float)
            || actualType == typeof(double)
            || actualType == typeof(decimal))
        {
            return "float";
        }

        return null;
    }

    private static string FormatScalar(object? value)
    {
        return value switch
        {
            null => "null",
            string text => FormatIdentifierOrString(text),
            bool boolean => boolean ? "true" : "false",
            sbyte or byte or short or ushort or int or uint or long or ulong
                => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty,
            float or double or decimal
                => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty,
            _ => throw new InvalidOperationException(
                $"MRTD writing currently supports only scalar CLR values, not '{value.GetType().Name}'."),
        };
    }

    private static string FormatIdentifierOrString(string text)
    {
        return IsIdentifier(text)
            ? text
            : "\"" + text.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal) + "\"";
    }

    private static bool IsIdentifier(string text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return false;
        }

        if (!(char.IsLetter(text[0]) || text[0] is '_' or '$'))
        {
            return false;
        }

        for (var i = 1; i < text.Length; i += 1)
        {
            var ch = text[i];
            if (!(char.IsLetterOrDigit(ch) || ch is '_' or '$'))
            {
                return false;
            }
        }

        return true;
    }
}
