using System.Globalization;
using System.Reflection;
using System.Collections;

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

    public static object? Index(object? target, object? index)
    {
        ArgumentNullException.ThrowIfNull(target);

        if (target is string text)
        {
            var stringIndex = NormalizeIntIndex(text.Length, index);
            return text[stringIndex].ToString();
        }

        if (target is Array array)
        {
            var arrayIndex = NormalizeIntIndex(array.Length, index);
            return array.GetValue(arrayIndex);
        }

        if (target is IList list)
        {
            var listIndex = NormalizeIntIndex(list.Count, index);
            return list[listIndex];
        }

        if (target is IDictionary dictionary)
        {
            ArgumentNullException.ThrowIfNull(index);
            return dictionary[index];
        }

        var targetType = target.GetType();
        var defaultIndexer = targetType
            .GetDefaultMembers()
            .OfType<PropertyInfo>()
            .FirstOrDefault(property => property.GetIndexParameters().Length == 1);

        if (defaultIndexer is not null)
        {
            var parameterType = defaultIndexer.GetIndexParameters()[0].ParameterType;
            var converted = ConvertIndex(index, parameterType);
            return defaultIndexer.GetValue(target, [converted]);
        }

        throw new InvalidOperationException($"Value of type '{targetType.FullName}' is not indexable.");
    }

    public static object? SetIndex(object? target, object? index, object? value)
    {
        ArgumentNullException.ThrowIfNull(target);

        if (target is Array array)
        {
            var arrayIndex = NormalizeIntIndex(array.Length, index);
            array.SetValue(ConvertValue(value, array.GetType().GetElementType() ?? typeof(object)), arrayIndex);
            return value;
        }

        var targetType = target.GetType();
        var defaultIndexer = targetType
            .GetDefaultMembers()
            .OfType<PropertyInfo>()
            .FirstOrDefault(property => property.GetIndexParameters().Length == 1 && property.CanWrite);

        if (defaultIndexer is not null)
        {
            var parameterType = defaultIndexer.GetIndexParameters()[0].ParameterType;
            var convertedIndex = ConvertIndex(index, parameterType);
            var convertedValue = ConvertValue(value, defaultIndexer.PropertyType);
            defaultIndexer.SetValue(target, convertedValue, [convertedIndex]);
            return convertedValue;
        }

        if (target is IList list)
        {
            var listIndex = NormalizeIntIndex(list.Count, index);
            list[listIndex] = value;
            return value;
        }

        if (target is IDictionary dictionary)
        {
            ArgumentNullException.ThrowIfNull(index);
            dictionary[index] = value;
            return value;
        }

        throw new InvalidOperationException($"Value of type '{targetType.FullName}' is not index-assignable.");
    }

    private static int NormalizeIntIndex(int length, object? index)
    {
        var converted = Convert.ToInt32(index, CultureInfo.InvariantCulture);
        if (converted < 0)
        {
            converted += length;
        }

        if (converted < 0 || converted >= length)
        {
            throw new IndexOutOfRangeException($"Index {converted} is out of range for length {length}.");
        }

        return converted;
    }

    private static object? ConvertIndex(object? index, Type targetType)
    {
        if (index is null)
        {
            return null;
        }

        if (targetType.IsInstanceOfType(index))
        {
            return index;
        }

        if (targetType == typeof(int))
        {
            return Convert.ToInt32(index, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(long))
        {
            return Convert.ToInt64(index, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(string))
        {
            return Convert.ToString(index, CultureInfo.InvariantCulture);
        }

        return Convert.ChangeType(index, targetType, CultureInfo.InvariantCulture);
    }

    private static object? ConvertValue(object? value, Type targetType)
    {
        if (value is null)
        {
            return null;
        }

        if (targetType.IsInstanceOfType(value))
        {
            return value;
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

        if (targetType == typeof(string))
        {
            return Convert.ToString(value, CultureInfo.InvariantCulture);
        }

        return Convert.ChangeType(value, targetType, CultureInfo.InvariantCulture);
    }
}
