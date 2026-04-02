namespace MakrellSharp.BaseFormat;

public static class OperatorTable
{
    private static readonly IReadOnlyDictionary<string, (int Precedence, Associativity Associativity)> Default =
        new Dictionary<string, (int, Associativity)>
        {
            ["="] = (0, Associativity.Right),
            ["|"] = (20, Associativity.Left),
            ["|*"] = (20, Associativity.Left),
            ["\\"] = (20, Associativity.Right),
            ["*\\"] = (20, Associativity.Right),
            ["->"] = (30, Associativity.Right),
            ["||"] = (45, Associativity.Left),
            ["&&"] = (45, Associativity.Left),
            ["=="] = (50, Associativity.Left),
            ["!="] = (50, Associativity.Left),
            ["<"] = (50, Associativity.Left),
            [">"] = (50, Associativity.Left),
            ["<="] = (50, Associativity.Left),
            [">="] = (50, Associativity.Left),
            ["~="] = (50, Associativity.Left),
            ["!~="] = (50, Associativity.Left),
            [".."] = (90, Associativity.Left),
            ["+"] = (110, Associativity.Left),
            ["-"] = (110, Associativity.Left),
            ["*"] = (120, Associativity.Left),
            ["/"] = (120, Associativity.Left),
            ["//"] = (120, Associativity.Left),
            ["%"] = (120, Associativity.Left),
            ["<<<"] = (115, Associativity.Left),
            [">>>"] = (115, Associativity.Left),
            ["^^^"] = (112, Associativity.Left),
            ["&&&"] = (111, Associativity.Left),
            ["|||"] = (111, Associativity.Left),
            ["**"] = (130, Associativity.Right),
            ["@"] = (140, Associativity.Left),
            ["."] = (200, Associativity.Left),
        };

    public static (int Precedence, Associativity Associativity) Lookup(string op) =>
        Default.TryGetValue(op, out var info) ? info : (0, Associativity.Left);
}
