using System.Text.Json.Nodes;
using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.Mrtd;

public static class MrtdParser
{
    public static MrtdDocument ParseSource(string source, MrtdParseOptions? options = null, DiagnosticBag? diagnostics = null)
    {
        options ??= MrtdParseOptions.Default;
        var baseFormat = options.BaseFormat with { PreserveWhitespaceNodes = true };
        var nodes = BaseFormatParser.ParseStructure(source, baseFormat, diagnostics);
        return ParseNodes(nodes, options);
    }

    public static MrtdDocument ParseNodes(IEnumerable<Node> nodes, MrtdParseOptions? options = null)
    {
        options ??= MrtdParseOptions.Default;
        var rows = SplitRows(nodes);
        if (rows.Count == 0)
        {
            throw new InvalidOperationException("MRTD source is empty.");
        }

        var columns = ParseHeader(rows[0]);
        var dataRows = ParseDataRows(rows.Skip(1), columns.Count, options);
        return new MrtdDocument(columns, dataRows);
    }

    private static IReadOnlyList<IReadOnlyList<Node>> SplitRows(IEnumerable<Node> nodes)
    {
        var rows = new List<IReadOnlyList<Node>>();
        var current = new List<Node>();
        var lineContainsStandaloneRound = false;

        foreach (var node in nodes)
        {
            switch (node)
            {
                case WhitespaceNode whitespace:
                    if (ContainsLineBreak(whitespace.Value))
                    {
                        FlushCurrentRow(current, rows);
                        lineContainsStandaloneRound = false;
                    }
                    else if (!lineContainsStandaloneRound)
                    {
                        current.Add(whitespace);
                    }

                    break;
                case RoundBracketsNode round:
                    if (HasNonWhitespace(current))
                    {
                        throw new InvalidOperationException("A multiline MRTD row must stand alone on its line.");
                    }

                    rows.Add(round.OriginalNodes);
                    lineContainsStandaloneRound = true;
                    current.Clear();
                    break;
                case CommentNode:
                    throw new InvalidOperationException("Comments are not part of the current MRTD core syntax.");
                default:
                    if (lineContainsStandaloneRound)
                    {
                        throw new InvalidOperationException("A multiline MRTD row must stand alone on its line.");
                    }

                    current.Add(node);
                    break;
            }
        }

        FlushCurrentRow(current, rows);
        return rows;
    }

    private static IReadOnlyList<MrtdColumn> ParseHeader(IReadOnlyList<Node> rowNodes)
    {
        var cells = SplitCells(rowNodes);
        if (cells.Count == 0)
        {
            throw new InvalidOperationException("MRTD header row is empty.");
        }

        var columns = new List<MrtdColumn>();
        foreach (var cell in cells)
        {
            columns.Add(ParseHeaderCell(cell));
        }

        return columns;
    }

    private static IReadOnlyList<MrtdRow> ParseDataRows(IEnumerable<IReadOnlyList<Node>> rowNodes, int expectedWidth, MrtdParseOptions options)
    {
        var rows = new List<MrtdRow>();
        foreach (var rowNodesEntry in rowNodes)
        {
            var cells = SplitCells(rowNodesEntry);
            if (cells.Count == 0)
            {
                continue;
            }

            rows.Add(ParseDataRow(cells, expectedWidth, options));
        }

        return rows;
    }

    private static MrtdColumn ParseHeaderCell(IReadOnlyList<Node> cellNodes)
    {
        var colonIndex = FindSingleColonIndex(cellNodes);
        if (colonIndex < 0)
        {
            return new MrtdColumn(ParseHeaderName(cellNodes));
        }

        var nameNodes = cellNodes.Take(colonIndex).ToArray();
        var typeNodes = cellNodes.Skip(colonIndex + 1).ToArray();
        if (nameNodes.Length == 0 || typeNodes.Length == 0)
        {
            throw new InvalidOperationException("Typed MRTD header cells must have the form name:type.");
        }

        if (typeNodes.Length != 1 || typeNodes[0] is not IdentifierNode typeIdentifier)
        {
            throw new InvalidOperationException("MRTD field types must currently be a single identifier.");
        }

        var type = typeIdentifier.Value;
        if (type is not ("int" or "float" or "bool" or "string"))
        {
            throw new InvalidOperationException($"Unsupported MRTD field type '{type}'.");
        }

        var name = ParseHeaderName(nameNodes);
        return new MrtdColumn(name, type);
    }

    private static MrtdRow ParseDataRow(IReadOnlyList<IReadOnlyList<Node>> cells, int expectedWidth, MrtdParseOptions options)
    {
        if (cells.Count != expectedWidth)
        {
            throw new InvalidOperationException(
                $"MRTD row width {cells.Count} does not match declared column count {expectedWidth}.");
        }

        var parsedCells = new List<JsonNode?>(cells.Count);
        foreach (var cell in cells)
        {
            parsedCells.Add(ParseScalarCell(cell, options));
        }

        return new MrtdRow(parsedCells);
    }

    private static JsonNode? ParseScalarCell(IReadOnlyList<Node> cellNodes, MrtdParseOptions options)
    {
        if (cellNodes.Count != 1)
        {
            throw new InvalidOperationException("MRTD data cells must currently be scalar values.");
        }

        var cell = cellNodes[0];
        if (cell is not IdentifierNode and not StringNode and not NumberNode)
        {
            throw new InvalidOperationException("MRTD data cells must currently be scalar values.");
        }

        return CreateJsonScalar(MrtdScalarConverter.ConvertScalar(cell, options));
    }

    private static string ParseHeaderName(IReadOnlyList<Node> nodes)
    {
        if (nodes.Count != 1)
        {
            throw new InvalidOperationException("MRTD field names must currently be a single identifier or string.");
        }

        return nodes[0] switch
        {
            IdentifierNode identifier => identifier.Value,
            StringNode str => (string?)MrtdScalarConverter.ConvertScalar(str, MrtdParseOptions.Default)
                ?? throw new InvalidOperationException("Expected string-compatible field name."),
            _ => throw new InvalidOperationException("MRTD field names must currently be a single identifier or string."),
        };
    }

    private static IReadOnlyList<IReadOnlyList<Node>> SplitCells(IReadOnlyList<Node> rowNodes)
    {
        var cells = new List<IReadOnlyList<Node>>();
        var current = new List<Node>();

        foreach (var node in rowNodes)
        {
            if (node is WhitespaceNode)
            {
                FlushCurrentCell(current, cells);
                continue;
            }

            if (node is CommentNode)
            {
                throw new InvalidOperationException("Comments are not part of the current MRTD core syntax.");
            }

            current.Add(node);
        }

        FlushCurrentCell(current, cells);
        return cells;
    }

    private static int FindSingleColonIndex(IReadOnlyList<Node> nodes)
    {
        var result = -1;
        for (var i = 0; i < nodes.Count; i += 1)
        {
            if (nodes[i] is not OperatorNode { Value: ":" })
            {
                continue;
            }

            if (result >= 0)
            {
                throw new InvalidOperationException("MRTD header cells may contain at most one ':' separator.");
            }

            result = i;
        }

        return result;
    }

    private static bool ContainsLineBreak(string text) =>
        text.Contains('\n') || text.Contains('\r');

    private static bool HasNonWhitespace(IEnumerable<Node> nodes) =>
        nodes.Any(static node => node is not WhitespaceNode);

    private static void FlushCurrentRow(List<Node> current, List<IReadOnlyList<Node>> rows)
    {
        if (!HasNonWhitespace(current))
        {
            current.Clear();
            return;
        }

        rows.Add(current.ToArray());
        current.Clear();
    }

    private static void FlushCurrentCell(List<Node> current, List<IReadOnlyList<Node>> cells)
    {
        if (current.Count == 0)
        {
            return;
        }

        cells.Add(current.ToArray());
        current.Clear();
    }

    private static JsonNode? CreateJsonScalar(object? value)
    {
        return value switch
        {
            null => null,
            bool b => JsonValue.Create(b),
            string s => JsonValue.Create(s),
            long l => JsonValue.Create(l),
            int i => JsonValue.Create(i),
            double d => JsonValue.Create(d),
            float f => JsonValue.Create(f),
            decimal m => JsonValue.Create(m),
            DateTime dt => JsonValue.Create(dt),
            _ => JsonValue.Create(value.ToString()),
        };
    }
}
