using System.Globalization;
using System.Reflection;
using System.Collections;
using System.Linq.Expressions;

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

    public static object? CreateInstance(Type targetType, object?[]? args)
    {
        ArgumentNullException.ThrowIfNull(targetType);
        args ??= [];

        var match = targetType
            .GetConstructors(BindingFlags.Public | BindingFlags.Instance)
            .Select(constructor => TryBindArguments(constructor.GetParameters(), args, out var convertedArgs, out var score)
                ? new Candidate<ConstructorInfo>(constructor, convertedArgs, score)
                : null)
            .Where(static candidate => candidate is not null)
            .OrderBy(static candidate => candidate!.Score)
            .FirstOrDefault();

        if (match is null)
        {
            throw new InvalidOperationException(
                $"No matching public constructor found on '{targetType.FullName}' for {args.Length} argument(s).");
        }

        return match.Member.Invoke(match.Arguments);
    }

    public static object? InvokeMember(object? target, string memberName, object?[]? args)
    {
        ArgumentNullException.ThrowIfNull(target);
        ArgumentException.ThrowIfNullOrEmpty(memberName);
        args ??= [];

        var targetType = target.GetType();
        var match = targetType
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(method => method.Name == memberName)
            .Select(method => TryBindArguments(method.GetParameters(), args, out var convertedArgs, out var score)
                ? new Candidate<MethodInfo>(method, convertedArgs, score)
                : null)
            .Where(static candidate => candidate is not null)
            .OrderBy(static candidate => candidate!.Score)
            .FirstOrDefault();

        if (match is null)
        {
            throw new InvalidOperationException(
                $"No matching public instance method '{memberName}' found on '{targetType.FullName}' for {args.Length} argument(s).");
        }

        return match.Member.Invoke(target, match.Arguments);
    }

    public static object? InvokeMemberGeneric(object? target, string memberName, Type[] typeArguments, object?[]? args)
    {
        ArgumentNullException.ThrowIfNull(target);
        ArgumentException.ThrowIfNullOrEmpty(memberName);
        ArgumentNullException.ThrowIfNull(typeArguments);
        args ??= [];

        var targetType = target.GetType();
        var match = targetType
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(method => method.Name == memberName
                && method.IsGenericMethodDefinition
                && method.GetGenericArguments().Length == typeArguments.Length)
            .Select(method => TryBindGenericMethod(method, typeArguments, args, out var candidate) ? candidate : null)
            .Where(static candidate => candidate is not null)
            .OrderBy(static candidate => candidate!.Score)
            .FirstOrDefault();

        if (match is null)
        {
            throw new InvalidOperationException(
                $"No matching public generic instance method '{memberName}' found on '{targetType.FullName}' for {typeArguments.Length} type argument(s) and {args.Length} value argument(s).");
        }

        return match.Member.Invoke(target, match.Arguments);
    }

    public static object? InvokeStatic(Type targetType, string memberName, object?[]? args)
    {
        ArgumentNullException.ThrowIfNull(targetType);
        ArgumentException.ThrowIfNullOrEmpty(memberName);
        args ??= [];

        var match = targetType
            .GetMethods(BindingFlags.Public | BindingFlags.Static)
            .Where(method => method.Name == memberName)
            .Select(method => TryBindArguments(method.GetParameters(), args, out var convertedArgs, out var score)
                ? new Candidate<MethodInfo>(method, convertedArgs, score)
                : null)
            .Where(static candidate => candidate is not null)
            .OrderBy(static candidate => candidate!.Score)
            .FirstOrDefault();

        if (match is null)
        {
            throw new InvalidOperationException(
                $"No matching public static method '{memberName}' found on '{targetType.FullName}' for {args.Length} argument(s).");
        }

        return match.Member.Invoke(null, match.Arguments);
    }

    public static object? InvokeStaticGeneric(Type targetType, string memberName, Type[] typeArguments, object?[]? args)
    {
        ArgumentNullException.ThrowIfNull(targetType);
        ArgumentException.ThrowIfNullOrEmpty(memberName);
        ArgumentNullException.ThrowIfNull(typeArguments);
        args ??= [];

        var match = targetType
            .GetMethods(BindingFlags.Public | BindingFlags.Static)
            .Where(method => method.Name == memberName
                && method.IsGenericMethodDefinition
                && method.GetGenericArguments().Length == typeArguments.Length)
            .Select(method => TryBindGenericMethod(method, typeArguments, args, out var candidate) ? candidate : null)
            .Where(static candidate => candidate is not null)
            .OrderBy(static candidate => candidate!.Score)
            .FirstOrDefault();

        if (match is null)
        {
            throw new InvalidOperationException(
                $"No matching public generic static method '{memberName}' found on '{targetType.FullName}' for {typeArguments.Length} type argument(s) and {args.Length} value argument(s).");
        }

        return match.Member.Invoke(null, match.Arguments);
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

    private static bool TryBindArguments(
        ParameterInfo[] parameters,
        object?[] args,
        out object?[] convertedArgs,
        out int score)
    {
        convertedArgs = [];
        score = 0;

        var hasParamsArray = parameters.Length > 0
            && parameters[^1].GetCustomAttribute<ParamArrayAttribute>() is not null;

        if (!hasParamsArray && parameters.Length != args.Length)
        {
            return false;
        }

        if (hasParamsArray && args.Length < parameters.Length - 1)
        {
            return false;
        }

        var bound = new object?[parameters.Length];
        var totalScore = 0;

        for (var i = 0; i < parameters.Length; i += 1)
        {
            var parameter = parameters[i];
            if (hasParamsArray && i == parameters.Length - 1)
            {
                var elementType = parameter.ParameterType.GetElementType()
                    ?? throw new InvalidOperationException("Params array element type is missing.");
                var paramCount = args.Length - (parameters.Length - 1);
                var array = Array.CreateInstance(elementType, paramCount);
                for (var j = 0; j < paramCount; j += 1)
                {
                    if (!TryConvertArgument(args[i + j], elementType, out var converted, out var argScore))
                    {
                        return false;
                    }

                    array.SetValue(converted, j);
                    totalScore += argScore + 2;
                }

                bound[i] = array;
                continue;
            }

            if (!TryConvertArgument(args[i], parameter.ParameterType, out var convertedArg, out var parameterScore))
            {
                return false;
            }

            bound[i] = convertedArg;
            totalScore += parameterScore;
        }

        convertedArgs = bound;
        score = totalScore;
        return true;
    }

    private static bool TryConvertArgument(object? value, Type targetType, out object? converted, out int score)
    {
        converted = null;
        score = 0;

        if (value is null)
        {
            if (!targetType.IsValueType || Nullable.GetUnderlyingType(targetType) is not null)
            {
                return true;
            }

            return false;
        }

        var nullableTarget = Nullable.GetUnderlyingType(targetType);
        if (nullableTarget is not null)
        {
            targetType = nullableTarget;
            score += 1;
        }

        if (targetType.IsInstanceOfType(value))
        {
            converted = value;
            return true;
        }

        if (typeof(Delegate).IsAssignableFrom(targetType) && value is Delegate sourceDelegate)
        {
            if (!TryConvertDelegate(sourceDelegate, targetType, out converted))
            {
                return false;
            }

            score += 2;
            return true;
        }

        if (targetType.IsArray && value is object?[] objectArray)
        {
            var elementType = targetType.GetElementType()
                ?? throw new InvalidOperationException("Array element type is missing.");
            var array = Array.CreateInstance(elementType, objectArray.Length);
            var totalScore = score;
            for (var i = 0; i < objectArray.Length; i += 1)
            {
                if (!TryConvertArgument(objectArray[i], elementType, out var convertedElement, out var elementScore))
                {
                    return false;
                }

                array.SetValue(convertedElement, i);
                totalScore += elementScore + 1;
            }

            converted = array;
            score = totalScore;
            return true;
        }

        if (targetType.IsEnum)
        {
            if (value is string enumName)
            {
                converted = Enum.Parse(targetType, enumName, ignoreCase: false);
                score += 3;
                return true;
            }

            try
            {
                var underlying = Enum.GetUnderlyingType(targetType);
                var numeric = Convert.ChangeType(value, underlying, CultureInfo.InvariantCulture);
                converted = Enum.ToObject(targetType, numeric!);
                score += 3;
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        try
        {
            converted = ConvertScalarValue(value, targetType);
            score += 2;
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static object? ConvertScalarValue(object value, Type targetType)
    {
        if (targetType == typeof(string))
        {
            return Convert.ToString(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(bool))
        {
            return Convert.ToBoolean(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(byte))
        {
            return Convert.ToByte(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(sbyte))
        {
            return Convert.ToSByte(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(short))
        {
            return Convert.ToInt16(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(ushort))
        {
            return Convert.ToUInt16(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(int))
        {
            return Convert.ToInt32(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(uint))
        {
            return Convert.ToUInt32(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(long))
        {
            return Convert.ToInt64(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(ulong))
        {
            return Convert.ToUInt64(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(float))
        {
            return Convert.ToSingle(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(double))
        {
            return Convert.ToDouble(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(decimal))
        {
            return Convert.ToDecimal(value, CultureInfo.InvariantCulture);
        }

        if (targetType == typeof(char))
        {
            return value switch
            {
                char ch => ch,
                string text when text.Length == 1 => text[0],
                _ => Convert.ToChar(value, CultureInfo.InvariantCulture),
            };
        }

        if (targetType == typeof(object))
        {
            return value;
        }

        return Convert.ChangeType(value, targetType, CultureInfo.InvariantCulture);
    }

    private static bool TryConvertDelegate(Delegate sourceDelegate, Type targetType, out object? converted)
    {
        converted = null;

        var invokeMethod = targetType.GetMethod("Invoke");
        if (invokeMethod is null)
        {
            return false;
        }

        var parameters = invokeMethod
            .GetParameters()
            .Select(parameter => Expression.Parameter(parameter.ParameterType, parameter.Name))
            .ToArray();

        var boxedArguments = Expression.NewArrayInit(
            typeof(object),
            parameters.Select(parameter => Expression.Convert(parameter, typeof(object))));

        var dynamicInvoke = Expression.Call(
            Expression.Constant(sourceDelegate),
            typeof(Delegate).GetMethod(nameof(Delegate.DynamicInvoke), [typeof(object[])])
                ?? throw new InvalidOperationException("Delegate.DynamicInvoke overload not found."),
            boxedArguments);

        Expression body;
        if (invokeMethod.ReturnType == typeof(void))
        {
            body = Expression.Block(dynamicInvoke, Expression.Empty());
        }
        else
        {
            body = Expression.Convert(
                Expression.Call(
                    typeof(MakrellCompilerRuntime),
                    nameof(ConvertDelegateReturn),
                    Type.EmptyTypes,
                    dynamicInvoke,
                    Expression.Constant(invokeMethod.ReturnType, typeof(Type))),
                invokeMethod.ReturnType);
        }

        converted = Expression.Lambda(targetType, body, parameters).Compile();
        return true;
    }

    private static object? ConvertDelegateReturn(object? value, Type targetType)
    {
        ArgumentNullException.ThrowIfNull(targetType);

        if (value is null)
        {
            return null;
        }

        return targetType.IsInstanceOfType(value)
            ? value
            : ConvertValue(value, targetType);
    }

    private static bool TryBindGenericMethod(
        MethodInfo methodDefinition,
        Type[] typeArguments,
        object?[] args,
        out Candidate<MethodInfo>? candidate)
    {
        candidate = null;

        MethodInfo closedMethod;
        try
        {
            closedMethod = methodDefinition.MakeGenericMethod(typeArguments);
        }
        catch (ArgumentException)
        {
            return false;
        }

        if (!TryBindArguments(closedMethod.GetParameters(), args, out var convertedArgs, out var score))
        {
            return false;
        }

        candidate = new Candidate<MethodInfo>(closedMethod, convertedArgs, score);
        return true;
    }

    private sealed record Candidate<TMember>(TMember Member, object?[] Arguments, int Score)
        where TMember : MethodBase;
}
