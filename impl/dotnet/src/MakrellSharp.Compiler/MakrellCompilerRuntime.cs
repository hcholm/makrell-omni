using System.Globalization;
using System.Reflection;
using System.Collections;
using System.Linq.Expressions;
using System.Threading.Tasks;
using MakrellSharp.Ast;

namespace MakrellSharp.Compiler;

public static class MakrellCompilerRuntime
{
    public static async Task<dynamic?> AwaitAsync(object? value)
    {
        if (value is null)
        {
            return null;
        }

        return value switch
        {
            Task task => await AwaitTaskAsync(task),
            ValueTask valueTask => await AwaitTaskAsync(valueTask.AsTask()),
            _ when TryValueTaskGenericAsTask(value, out var valueTaskTask) => await AwaitTaskAsync(valueTaskTask),
            _ => value,
        };
    }

    public static object? AwaitResult(object? value)
    {
        if (value is null)
        {
            return null;
        }

        return value switch
        {
            Task task => AwaitTaskResult(task),
            ValueTask valueTask => AwaitTaskResult(valueTask.AsTask()),
            _ when TryAwaitValueTaskGeneric(value, out var awaited) => awaited,
            _ => value,
        };
    }

    public sealed record PatternMatchResult(bool IsMatch, IReadOnlyDictionary<string, object?> Bindings);

    private static object? AwaitTaskResult(Task task)
    {
        task.GetAwaiter().GetResult();
        return TryGetTaskResult(task, out var result) ? result : null;
    }

    private static async Task<object?> AwaitTaskAsync(Task task)
    {
        await task.ConfigureAwait(false);
        return TryGetTaskResult(task, out var result) ? result : null;
    }

    private static bool TryAwaitValueTaskGeneric(object value, out object? awaited)
    {
        awaited = null;
        var valueType = value.GetType();
        if (!valueType.IsGenericType || valueType.GetGenericTypeDefinition() != typeof(ValueTask<>))
        {
            return false;
        }

        if (!TryValueTaskGenericAsTask(value, out var task))
        {
            return false;
        }

        awaited = AwaitTaskResult(task);
        return true;
    }

    private static bool TryValueTaskGenericAsTask(object value, out Task task)
    {
        task = null!;
        var valueType = value.GetType();
        if (!valueType.IsGenericType || valueType.GetGenericTypeDefinition() != typeof(ValueTask<>))
        {
            return false;
        }

        var asTaskMethod = valueType.GetMethod("AsTask", BindingFlags.Public | BindingFlags.Instance);
        if (asTaskMethod is null)
        {
            return false;
        }

        task = asTaskMethod.Invoke(value, null) as Task
            ?? throw new InvalidOperationException("ValueTask<T>.AsTask() did not produce a Task.");
        return true;
    }

    private static bool TryGetTaskResult(Task task, out object? result)
    {
        result = null;
        var taskType = task.GetType();
        if (!taskType.IsGenericType || taskType.GetGenericTypeDefinition() != typeof(Task<>))
        {
            return false;
        }

        result = taskType.GetProperty("Result", BindingFlags.Public | BindingFlags.Instance)?.GetValue(task);
        return true;
    }

    public static PatternMatchResult MatchWithBindings(object? value, Node pattern)
    {
        ArgumentNullException.ThrowIfNull(pattern);

        try
        {
            var bindings = new Dictionary<string, object?>(StringComparer.Ordinal);
            return TryPatternMatch(value, pattern, bindings)
                ? new PatternMatchResult(true, bindings)
                : new PatternMatchResult(false, new Dictionary<string, object?>(StringComparer.Ordinal));
        }
        catch (Exception)
        {
            return new PatternMatchResult(false, new Dictionary<string, object?>(StringComparer.Ordinal));
        }
    }

    public static object? GetBinding(PatternMatchResult result, string name)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentException.ThrowIfNullOrEmpty(name);

        return result.Bindings.TryGetValue(name, out var value)
            ? value
            : throw new KeyNotFoundException($"Pattern binding '{name}' was not found.");
    }

    public static bool PatternMatches(object? value, Node pattern)
    {
        ArgumentNullException.ThrowIfNull(pattern);

        try
        {
            return TryPatternMatch(value, pattern, new Dictionary<string, object?>(StringComparer.Ordinal));
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static bool TryPatternMatch(object? value, Node pattern, Dictionary<string, object?> bindings)
    {
        return pattern switch
        {
            IdentifierNode identifier => MatchIdentifierPattern(value, identifier.Value),
            NumberNode number => ValuesEqual(value, NumberLiteral(number.Value, number.Suffix)),
            StringNode str => ValuesEqual(value, StringLiteral(str.Value, str.Suffix)),
            RoundBracketsNode round => MatchRoundPattern(value, round, bindings),
            SquareBracketsNode square => MatchListPattern(value, square, bindings),
            CurlyBracketsNode curly when IsRegularPattern(curly) => MatchRegularPattern(value, curly, bindings),
            CurlyBracketsNode curly when IsTypeConstructorPattern(curly) => MatchTypeConstructorPattern(value, curly, bindings),
            BinOpNode { Operator: "|" } orPattern => MatchOrPattern(value, orPattern, bindings),
            BinOpNode { Operator: "&" } andPattern => MatchAndPattern(value, andPattern, bindings),
            BinOpNode { Operator: "=" } assignmentPattern => MatchAssignmentPattern(value, assignmentPattern, bindings),
            BinOpNode { Operator: ":" } typePattern => TryPatternMatch(value, typePattern.Left, bindings)
                && MatchesTypePattern(value, typePattern.Right),
            BinOpNode binOp when ContainsSelfReference(binOp) => IsTruthy(EvaluatePatternExpression(binOp, value)),
            _ => false,
        };
    }

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

    public static object?[] Map(object? values, object? mapper)
    {
        ArgumentNullException.ThrowIfNull(values);
        ArgumentNullException.ThrowIfNull(mapper);

        if (values is string)
        {
            throw new InvalidOperationException("Strings are not valid inputs for Makrell map pipe.");
        }

        if (values is not IEnumerable enumerable)
        {
            throw new InvalidOperationException($"Value of type '{values.GetType().FullName}' is not enumerable.");
        }

        var result = new List<object?>();
        foreach (var item in enumerable)
        {
            result.Add(InvokeCallable(mapper, item));
        }

        return result.ToArray();
    }

    public static object GetOperatorFunction(string op)
    {
        ArgumentException.ThrowIfNullOrEmpty(op);
        return new Func<dynamic, dynamic, dynamic>((left, right) => ApplyBinaryOperator(op, left, right));
    }

    public static object? ApplyOperator(string op, object?[]? args)
    {
        ArgumentException.ThrowIfNullOrEmpty(op);
        args ??= [];

        return args.Length switch
        {
            0 => GetOperatorFunction(op),
            1 => throw new InvalidOperationException($"Operator '{op}' requires at least two operands for direct application."),
            _ => ApplyOperatorFold(op, args),
        };
    }

    public static object? Call(object? callable, object?[]? args)
    {
        ArgumentNullException.ThrowIfNull(callable);
        args ??= [];
        return InvokeCallable(callable, args);
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

    private static object? ApplyOperatorFold(string op, IReadOnlyList<object?> args)
    {
        var result = args[0];
        for (var i = 1; i < args.Count; i += 1)
        {
            result = ApplyBinaryOperator(op, result, args[i]);
        }

        return result;
    }

    private static object? ApplyBinaryOperator(string op, object? left, object? right)
    {
        return op switch
        {
            "==" => ValuesEqual(left, right),
            "!=" => !ValuesEqual(left, right),
            "<" => CompareValues(left, right) < 0,
            "<=" => CompareValues(left, right) <= 0,
            ">" => CompareValues(left, right) > 0,
            ">=" => CompareValues(left, right) >= 0,
            "+" => AddValues(left, right),
            "-" => SubtractValues(left, right),
            "*" => MultiplyValues(left, right),
            "/" => DivideValues(left, right),
            "%" => ApplyNumericBinary(left, right, (l, r) => l % r, (l, r) => l % r),
            "@" => Index(left, right),
            "&&" => IsTruthy(left) && IsTruthy(right),
            "||" => IsTruthy(left) || IsTruthy(right),
            _ => throw new InvalidOperationException($"Unsupported operator-as-function '{op}'."),
        };
    }

    private static object? InvokeCallable(object mapper, params object?[] args)
    {
        if (mapper is Delegate del)
        {
            return del.DynamicInvoke(args);
        }

        return args.Length switch
        {
            0 => ((dynamic)mapper)(),
            1 => ((dynamic)mapper)(args[0]),
            2 => ((dynamic)mapper)(args[0], args[1]),
            3 => ((dynamic)mapper)(args[0], args[1], args[2]),
            _ => throw new InvalidOperationException("Callable invocation currently supports up to 3 arguments."),
        };
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

    private static bool MatchIdentifierPattern(object? value, string pattern)
    {
        return pattern switch
        {
            "_" => true,
            "$" => IsTruthy(value),
            "true" => value is true,
            "false" => value is false,
            "null" => value is null,
            _ => ValuesEqual(value, pattern),
        };
    }

    private static bool MatchAssignmentPattern(object? value, BinOpNode assignmentPattern, Dictionary<string, object?> bindings)
    {
        var localBindings = CloneBindings(bindings);
        if (!TryPatternMatch(value, assignmentPattern.Right, localBindings))
        {
            return false;
        }

        if (assignmentPattern.Left is not IdentifierNode identifier
            || !TryBindCapture(identifier.Value, value, localBindings))
        {
            return false;
        }

        CopyBindings(localBindings, bindings);
        return true;
    }

    private static bool TryBindCapture(string name, object? value, Dictionary<string, object?> bindings)
    {
        if (name is "_" or "$")
        {
            return true;
        }

        if (bindings.TryGetValue(name, out var existing))
        {
            return ValuesEqual(existing, value);
        }

        bindings[name] = value;
        return true;
    }

    private static Dictionary<string, object?> CloneBindings(Dictionary<string, object?> bindings)
    {
        return new Dictionary<string, object?>(bindings, StringComparer.Ordinal);
    }

    private static void CopyBindings(Dictionary<string, object?> source, Dictionary<string, object?> target)
    {
        target.Clear();
        foreach (var pair in source)
        {
            target[pair.Key] = pair.Value;
        }
    }

    private static bool MatchListPattern(object? value, SquareBracketsNode pattern, Dictionary<string, object?> bindings)
    {
        if (!TryGetSequenceItems(value, out var items))
        {
            return false;
        }

        if (TryGetListRestCapture(pattern, out var restCaptureName))
        {
            if (items.Count < pattern.Nodes.Count - 1)
            {
                return false;
            }

            var restBindings = CloneBindings(bindings);
            for (var i = 0; i < pattern.Nodes.Count - 1; i += 1)
            {
                if (!TryPatternMatch(items[i], pattern.Nodes[i], restBindings))
                {
                    return false;
                }
            }

            if (restCaptureName is not null
                && !TryBindCapture(restCaptureName, items.Skip(pattern.Nodes.Count - 1).ToArray(), restBindings))
            {
                return false;
            }

            CopyBindings(restBindings, bindings);
            return true;
        }

        if (items.Count != pattern.Nodes.Count)
        {
            return false;
        }

        var localBindings = CloneBindings(bindings);
        for (var i = 0; i < pattern.Nodes.Count; i += 1)
        {
            if (!TryPatternMatch(items[i], pattern.Nodes[i], localBindings))
            {
                return false;
            }
        }

        CopyBindings(localBindings, bindings);
        return true;
    }

    private static bool TryGetListRestCapture(SquareBracketsNode pattern, out string? captureName)
    {
        captureName = null;
        if (pattern.Nodes.Count == 0)
        {
            return false;
        }

        var tail = pattern.Nodes[^1];
        if (tail is IdentifierNode { Value: "$rest" })
        {
            return true;
        }

        if (tail is BinOpNode
            {
                Operator: "=",
                Left: IdentifierNode left,
                Right: IdentifierNode { Value: "$rest" }
            })
        {
            captureName = left.Value;
            return true;
        }

        return false;
    }

    private static bool MatchRoundPattern(object? value, RoundBracketsNode pattern, Dictionary<string, object?> bindings)
    {
        return pattern.Nodes.Count switch
        {
            0 => value is null,
            1 => MatchPatternTransactional(value, pattern.Nodes[0], bindings),
            _ => pattern.Nodes.Any(node => MatchPatternTransactional(value, node, bindings)),
        };
    }

    private static bool IsRegularPattern(CurlyBracketsNode pattern)
    {
        return pattern.Nodes.Count > 0
            && pattern.Nodes[0] is IdentifierNode { Value: "$r" };
    }

    private static bool MatchRegularPattern(object? value, CurlyBracketsNode pattern, Dictionary<string, object?> bindings)
    {
        if (!TryGetSequenceItems(value, out var items))
        {
            return false;
        }

        if (pattern.Nodes.Count == 0)
        {
            return false;
        }

        var localBindings = CloneBindings(bindings);
        if (!MatchRegularPatternFrom(items, pattern.Nodes, valueIndex: 0, patternIndex: 1, localBindings))
        {
            return false;
        }

        CopyBindings(localBindings, bindings);
        return true;
    }

    private static bool MatchRegularPatternFrom(
        IReadOnlyList<object?> values,
        IReadOnlyList<Node> patterns,
        int valueIndex,
        int patternIndex,
        Dictionary<string, object?> bindings)
    {
        if (patternIndex >= patterns.Count)
        {
            return valueIndex == values.Count;
        }

        var pattern = patterns[patternIndex];
        if (pattern is IdentifierNode { Value: "$rest" })
        {
            return true;
        }

        if (pattern is BinOpNode { Operator: "*" } repetition)
        {
            var bounds = GetRegularPatternQuantifierBounds(repetition.Left);
            if (bounds is null)
            {
                return false;
            }

            var (minCount, maxCount) = bounds.Value;
            var maxTry = maxCount is null ? values.Count - valueIndex : Math.Min(maxCount.Value, values.Count - valueIndex);
            for (var count = minCount; count <= maxTry; count += 1)
            {
                var localBindings = CloneBindings(bindings);
                var matchedAll = true;
                for (var i = 0; i < count; i += 1)
                {
                    if (!TryPatternMatch(values[valueIndex + i], repetition.Right, localBindings))
                    {
                        matchedAll = false;
                        break;
                    }
                }

                if (matchedAll && MatchRegularPatternFrom(values, patterns, valueIndex + count, patternIndex + 1, localBindings))
                {
                    CopyBindings(localBindings, bindings);
                    return true;
                }
            }

            return false;
        }

        if (valueIndex >= values.Count)
        {
            return false;
        }

        if (!TryPatternMatch(values[valueIndex], pattern, bindings))
        {
            return false;
        }

        return MatchRegularPatternFrom(values, patterns, valueIndex + 1, patternIndex + 1, bindings);
    }

    private static (int Min, int? Max)? GetRegularPatternQuantifierBounds(Node quantifier)
    {
        return quantifier switch
        {
            RoundBracketsNode { Nodes.Count: 1 } round => GetRegularPatternQuantifierBounds(round.Nodes[0]),
            NumberNode number => GetExactNumericBounds(number),
            IdentifierNode identifier => GetNamedQuantifierBounds(identifier.Value),
            BinOpNode { Operator: "..", Left: NumberNode left, Right: NumberNode right } => GetRangeBounds(left, right),
            _ => null,
        };
    }

    private static (int Min, int? Max)? GetExactNumericBounds(NumberNode number)
    {
        var exact = Convert.ToInt32(NumberLiteral(number.Value, number.Suffix), CultureInfo.InvariantCulture);
        return (exact, exact);
    }

    private static (int Min, int? Max)? GetRangeBounds(NumberNode left, NumberNode right)
    {
        var min = Convert.ToInt32(NumberLiteral(left.Value, left.Suffix), CultureInfo.InvariantCulture);
        var max = Convert.ToInt32(NumberLiteral(right.Value, right.Suffix), CultureInfo.InvariantCulture);
        return (min, max);
    }

    private static (int Min, int? Max)? GetNamedQuantifierBounds(string quantifier)
    {
        var normalized = quantifier.StartsWith('$') ? quantifier[1..] : quantifier;
        return normalized switch
        {
            "maybe" => (0, 1),
            "some" => (1, null),
            "any" => (0, null),
            _ => null,
        };
    }

    private static bool IsTypeConstructorPattern(CurlyBracketsNode pattern)
    {
        return pattern.Nodes.Count > 0
            && pattern.Nodes[0] is IdentifierNode { Value: "$type" };
    }

    private static bool MatchTypeConstructorPattern(object? value, CurlyBracketsNode pattern, Dictionary<string, object?> bindings)
    {
        if (value is null || pattern.Nodes.Count < 2)
        {
            return false;
        }

        if (!MatchesTypePattern(value, pattern.Nodes[1]))
        {
            return false;
        }

        SquareBracketsNode? positionalBlock = null;
        var keywordPatterns = new List<BinOpNode>();
        var localBindings = CloneBindings(bindings);

        foreach (var extra in pattern.Nodes.Skip(2))
        {
            if (extra is not SquareBracketsNode block)
            {
                return false;
            }

            if (block.Nodes.Count == 0)
            {
                continue;
            }

            var allKeyword = block.Nodes.All(node => node is BinOpNode { Operator: "=" } assignment && assignment.Left is IdentifierNode);
            var anyKeyword = block.Nodes.Any(node => node is BinOpNode { Operator: "=" });

            if (anyKeyword && !allKeyword)
            {
                return false;
            }

            if (allKeyword)
            {
                keywordPatterns.AddRange(block.Nodes.Cast<BinOpNode>());
                continue;
            }

            if (positionalBlock is not null)
            {
                return false;
            }

            positionalBlock = block;
        }

        if (positionalBlock is not null && !MatchPositionalTypePattern(value, positionalBlock, localBindings))
        {
            return false;
        }

        foreach (var keywordPattern in keywordPatterns)
        {
            if (keywordPattern.Left is not IdentifierNode memberName)
            {
                return false;
            }

            var memberValue = GetMemberValue(value, memberName.Value);
            if (!TryPatternMatch(memberValue, keywordPattern.Right, localBindings))
            {
                return false;
            }
        }

        CopyBindings(localBindings, bindings);
        return true;
    }

    private static bool MatchPositionalTypePattern(object value, SquareBracketsNode positionalBlock, Dictionary<string, object?> bindings)
    {
        if (!TryGetPositionalItems(value, positionalBlock.Nodes.Count, out var items))
        {
            return false;
        }

        if (items.Count != positionalBlock.Nodes.Count)
        {
            return false;
        }

        for (var i = 0; i < items.Count; i += 1)
        {
            if (!TryPatternMatch(items[i], positionalBlock.Nodes[i], bindings))
            {
                return false;
            }
        }

        return true;
    }

    private static bool MatchOrPattern(object? value, BinOpNode orPattern, Dictionary<string, object?> bindings)
    {
        return MatchPatternTransactional(value, orPattern.Left, bindings)
            || MatchPatternTransactional(value, orPattern.Right, bindings);
    }

    private static bool MatchAndPattern(object? value, BinOpNode andPattern, Dictionary<string, object?> bindings)
    {
        var localBindings = CloneBindings(bindings);
        if (!TryPatternMatch(value, andPattern.Left, localBindings)
            || !TryPatternMatch(value, andPattern.Right, localBindings))
        {
            return false;
        }

        CopyBindings(localBindings, bindings);
        return true;
    }

    private static bool MatchPatternTransactional(object? value, Node pattern, Dictionary<string, object?> bindings)
    {
        var localBindings = CloneBindings(bindings);
        if (!TryPatternMatch(value, pattern, localBindings))
        {
            return false;
        }

        CopyBindings(localBindings, bindings);
        return true;
    }

    private static bool TryGetSequenceItems(object? value, out IReadOnlyList<object?> items)
    {
        switch (value)
        {
            case null:
                items = Array.Empty<object?>();
                return false;
            case string:
                items = Array.Empty<object?>();
                return false;
            case Array array:
            {
                var arrayItems = new object?[array.Length];
                for (var i = 0; i < array.Length; i += 1)
                {
                    arrayItems[i] = array.GetValue(i);
                }

                items = arrayItems;
                return true;
            }
            case IList list:
            {
                var listItems = new object?[list.Count];
                for (var i = 0; i < list.Count; i += 1)
                {
                    listItems[i] = list[i];
                }

                items = listItems;
                return true;
            }
            default:
                items = Array.Empty<object?>();
                return false;
        }
    }

    private static bool TryGetPositionalItems(object value, int arity, out IReadOnlyList<object?> items)
    {
        if (TryGetSequenceItems(value, out items))
        {
            return true;
        }

        var tupleInterface = value.GetType()
            .GetInterfaces()
            .FirstOrDefault(type => type.FullName == "System.Runtime.CompilerServices.ITuple");

        if (tupleInterface is not null)
        {
            var lengthProperty = tupleInterface.GetProperty("Length");
            var itemProperty = tupleInterface.GetProperty("Item");
            if (lengthProperty is not null && itemProperty is not null)
            {
                var length = Convert.ToInt32(lengthProperty.GetValue(value), CultureInfo.InvariantCulture);
                var tupleItems = new object?[length];
                for (var i = 0; i < length; i += 1)
                {
                    tupleItems[i] = itemProperty.GetValue(value, [i]);
                }

                items = tupleItems;
                return true;
            }
        }

        return TryGetDeconstructItems(value, arity, out items);
    }

    private static bool TryGetDeconstructItems(object value, int arity, out IReadOnlyList<object?> items)
    {
        var deconstructMethod = value.GetType()
            .GetMethods(BindingFlags.Public | BindingFlags.Instance)
            .Where(method => method.Name == "Deconstruct" && method.ReturnType == typeof(void))
            .Select(method => new { Method = method, Parameters = method.GetParameters() })
            .Where(candidate => candidate.Parameters.Length == arity
                && candidate.Parameters.All(parameter => parameter.ParameterType.IsByRef))
            .Select(candidate => candidate.Method)
            .FirstOrDefault();

        if (deconstructMethod is null)
        {
            items = Array.Empty<object?>();
            return false;
        }

        var parameters = deconstructMethod.GetParameters();
        var deconstructArgs = new object?[parameters.Length];
        for (var i = 0; i < parameters.Length; i += 1)
        {
            var parameterType = parameters[i].ParameterType.GetElementType() ?? typeof(object);
            deconstructArgs[i] = CreateOutParameterPlaceholder(parameterType);
        }

        deconstructMethod.Invoke(value, deconstructArgs);
        items = deconstructArgs;
        return true;
    }

    private static object? CreateOutParameterPlaceholder(Type parameterType)
    {
        if (!parameterType.IsValueType)
        {
            return null;
        }

        return Activator.CreateInstance(parameterType);
    }

    private static bool MatchesTypePattern(object? value, Node typeNode)
    {
        if (value is null)
        {
            return false;
        }

        var expectedName = NodeToDottedName(typeNode);
        if (expectedName is null)
        {
            return false;
        }

        if (MatchesBuiltinTypeAlias(value, expectedName))
        {
            return true;
        }

        var normalized = NormalizeTypeAlias(expectedName);
        var valueType = value.GetType();
        return valueType
            .GetInterfaces()
            .Concat(GetTypeLineage(valueType))
            .Any(candidate => TypeNameMatches(candidate, normalized));
    }

    private static IEnumerable<Type> GetTypeLineage(Type type)
    {
        for (var current = type; current is not null; current = current.BaseType)
        {
            yield return current;
        }
    }

    private static bool TypeNameMatches(Type candidate, string expectedName)
    {
        var candidateNames = new[]
        {
            candidate.Name,
            candidate.FullName,
            candidate.GetGenericTypeDefinitionOrSelf().Name,
            candidate.GetGenericTypeDefinitionOrSelf().FullName,
        };

        return candidateNames.Any(name => string.Equals(NormalizeClrTypeName(name), expectedName, StringComparison.Ordinal));
    }

    private static string? NodeToDottedName(Node node)
    {
        return node switch
        {
            IdentifierNode identifier => identifier.Value,
            BinOpNode { Operator: "." } dotted => CombineDottedName(NodeToDottedName(dotted.Left), NodeToDottedName(dotted.Right)),
            _ => null,
        };
    }

    private static string? CombineDottedName(string? left, string? right)
    {
        return left is null || right is null ? null : $"{left}.{right}";
    }

    private static bool ContainsSelfReference(Node node)
    {
        return node switch
        {
            IdentifierNode { Value: "$" } => true,
            BinOpNode binOp => ContainsSelfReference(binOp.Left) || ContainsSelfReference(binOp.Right),
            RoundBracketsNode round => round.Nodes.Any(ContainsSelfReference),
            SquareBracketsNode square => square.Nodes.Any(ContainsSelfReference),
            CurlyBracketsNode curly => curly.Nodes.Any(ContainsSelfReference),
            SequenceNode sequence => sequence.Nodes.Any(ContainsSelfReference),
            _ => false,
        };
    }

    private static object? EvaluatePatternExpression(Node node, object? self)
    {
        return node switch
        {
            IdentifierNode identifier => EvaluatePatternIdentifier(identifier.Value, self),
            NumberNode number => NumberLiteral(number.Value, number.Suffix),
            StringNode str => StringLiteral(str.Value, str.Suffix),
            BinOpNode { Operator: "." } memberAccess => GetMemberValue(
                EvaluatePatternExpression(memberAccess.Left, self),
                memberAccess.Right is IdentifierNode member ? member.Value : throw new InvalidOperationException("Pattern member access requires an identifier.")),
            BinOpNode { Operator: "@" } indexAccess => Index(
                EvaluatePatternExpression(indexAccess.Left, self),
                EvaluatePatternExpression(indexAccess.Right, self)),
            BinOpNode binOp => EvaluatePatternBinaryExpression(binOp, self),
            RoundBracketsNode round when round.Nodes.Count == 0 => null,
            RoundBracketsNode round when round.Nodes.Count == 1 => EvaluatePatternExpression(round.Nodes[0], self),
            _ => throw new InvalidOperationException($"Unsupported pattern predicate node: {node.GetType().Name}"),
        };
    }

    private static object? EvaluatePatternIdentifier(string value, object? self)
    {
        return value switch
        {
            "$" => self,
            "true" => true,
            "false" => false,
            "null" => null,
            _ => throw new InvalidOperationException($"Unsupported identifier '{value}' in pattern predicate."),
        };
    }

    private static object? EvaluatePatternBinaryExpression(BinOpNode binOp, object? self)
    {
        var left = EvaluatePatternExpression(binOp.Left, self);
        var right = EvaluatePatternExpression(binOp.Right, self);

        return ApplyBinaryOperator(binOp.Operator, left, right);
    }

    private static object? GetMemberValue(object? target, string memberName)
    {
        ArgumentNullException.ThrowIfNull(target);
        ArgumentException.ThrowIfNullOrEmpty(memberName);

        var targetType = target.GetType();
        var property = targetType.GetProperty(memberName, BindingFlags.Public | BindingFlags.Instance);
        if (property is not null)
        {
            return property.GetValue(target);
        }

        var field = targetType.GetField(memberName, BindingFlags.Public | BindingFlags.Instance);
        if (field is not null)
        {
            return field.GetValue(target);
        }

        throw new InvalidOperationException($"Member '{memberName}' was not found on '{targetType.FullName}'.");
    }

    private static bool MatchesBuiltinTypeAlias(object value, string expectedName)
    {
        return expectedName switch
        {
            "string" => value is string,
            "bool" => value is bool,
            "int" or "long" => IsIntegralNumericValue(value),
            "double" or "float" or "decimal" => IsFloatingPointValue(value),
            "list" => value is IList or Array,
            "dict" or "dictionary" => value is IDictionary,
            _ => false,
        };
    }

    private static string NormalizeTypeAlias(string name)
    {
        return name switch
        {
            "string" => "System.String",
            "bool" => "System.Boolean",
            "int" => "System.Int64",
            "long" => "System.Int64",
            "double" => "System.Double",
            "float" => "System.Double",
            "decimal" => "System.Decimal",
            "list" => "System.Collections.Generic.List",
            "dict" => "System.Collections.Generic.Dictionary",
            "dictionary" => "System.Collections.Generic.Dictionary",
            _ => NormalizeClrTypeName(name),
        };
    }

    private static string NormalizeClrTypeName(string? name)
    {
        if (string.IsNullOrEmpty(name))
        {
            return string.Empty;
        }

        var tickIndex = name.IndexOf('`', StringComparison.Ordinal);
        return tickIndex >= 0 ? name[..tickIndex] : name;
    }

    private static bool ValuesEqual(object? left, object? right)
    {
        if (left is null || right is null)
        {
            return left is null && right is null;
        }

        if (IsNumericValue(left) && IsNumericValue(right))
        {
            return IsFloatingPointValue(left) || IsFloatingPointValue(right)
                ? Convert.ToDouble(left, CultureInfo.InvariantCulture) == Convert.ToDouble(right, CultureInfo.InvariantCulture)
                : Convert.ToDecimal(left, CultureInfo.InvariantCulture) == Convert.ToDecimal(right, CultureInfo.InvariantCulture);
        }

        return Equals(left, right);
    }

    private static int CompareValues(object? left, object? right)
    {
        if (left is null || right is null)
        {
            throw new InvalidOperationException("Cannot compare null values in pattern predicates.");
        }

        if (IsNumericValue(left) && IsNumericValue(right))
        {
            return IsFloatingPointValue(left) || IsFloatingPointValue(right)
                ? Convert.ToDouble(left, CultureInfo.InvariantCulture).CompareTo(Convert.ToDouble(right, CultureInfo.InvariantCulture))
                : Convert.ToDecimal(left, CultureInfo.InvariantCulture).CompareTo(Convert.ToDecimal(right, CultureInfo.InvariantCulture));
        }

        if (left is string leftText && right is string rightText)
        {
            return string.CompareOrdinal(leftText, rightText);
        }

        if (left is IComparable comparable && left.GetType().IsInstanceOfType(right))
        {
            return comparable.CompareTo(right);
        }

        throw new InvalidOperationException("Pattern predicate values are not comparable.");
    }

    private static object? AddValues(object? left, object? right)
    {
        if (left is string || right is string)
        {
            return $"{left}{right}";
        }

        return ApplyNumericBinary(left, right, (l, r) => l + r, (l, r) => l + r);
    }

    private static object? SubtractValues(object? left, object? right)
    {
        return ApplyNumericBinary(left, right, (l, r) => l - r, (l, r) => l - r);
    }

    private static object? MultiplyValues(object? left, object? right)
    {
        return ApplyNumericBinary(left, right, (l, r) => l * r, (l, r) => l * r);
    }

    private static object? DivideValues(object? left, object? right)
    {
        return ApplyNumericBinary(left, right, (l, r) => l / r, (l, r) => l / r);
    }

    private static object? ApplyNumericBinary(
        object? left,
        object? right,
        Func<decimal, decimal, decimal> decimalOp,
        Func<double, double, double> doubleOp)
    {
        if (left is null || right is null || !IsNumericValue(left) || !IsNumericValue(right))
        {
            throw new InvalidOperationException("Pattern predicate arithmetic requires numeric values.");
        }

        return IsFloatingPointValue(left) || IsFloatingPointValue(right)
            ? doubleOp(Convert.ToDouble(left, CultureInfo.InvariantCulture), Convert.ToDouble(right, CultureInfo.InvariantCulture))
            : decimalOp(Convert.ToDecimal(left, CultureInfo.InvariantCulture), Convert.ToDecimal(right, CultureInfo.InvariantCulture));
    }

    private static bool IsNumericValue(object value)
    {
        return value is byte or sbyte or short or ushort or int or uint or long or ulong or float or double or decimal;
    }

    private static bool IsIntegralNumericValue(object value)
    {
        return value is byte or sbyte or short or ushort or int or uint or long or ulong;
    }

    private static bool IsTruthy(object? value)
    {
        return value switch
        {
            null => false,
            bool boolean => boolean,
            string text => text.Length > 0,
            Array array => array.Length > 0,
            IList list => list.Count > 0,
            IDictionary dictionary => dictionary.Count > 0,
            byte or sbyte or short or ushort or int or uint or long or ulong => Convert.ToDecimal(value, CultureInfo.InvariantCulture) != 0,
            float or double or decimal => Convert.ToDouble(value, CultureInfo.InvariantCulture) != 0d,
            _ => true,
        };
    }

    private static bool IsFloatingPointValue(object value)
    {
        return value is float or double or decimal;
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

internal static class TypeExtensions
{
    public static Type GetGenericTypeDefinitionOrSelf(this Type type)
    {
        return type.IsGenericType ? type.GetGenericTypeDefinition() : type;
    }
}
