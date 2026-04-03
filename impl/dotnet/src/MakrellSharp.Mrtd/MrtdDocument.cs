using System.Text.Json.Nodes;

namespace MakrellSharp.Mrtd;

public sealed class MrtdDocument
{
    public MrtdDocument(
        IReadOnlyList<MrtdColumn> columns,
        IReadOnlyList<MrtdRow> rows)
    {
        Columns = columns;
        Rows = rows;
    }

    public IReadOnlyList<MrtdColumn> Columns { get; }

    public IReadOnlyList<MrtdRow> Rows { get; }

    public JsonObject ToJsonObject()
    {
        var root = new JsonObject
        {
            ["columns"] = ToJsonColumns(),
            ["rows"] = ToJsonRows(),
            ["records"] = ToJsonRecords(),
        };

        return root;
    }

    public JsonArray ToJsonRecords()
    {
        var records = new JsonArray();
        foreach (var row in Rows)
        {
            var record = new JsonObject();
            for (var i = 0; i < Columns.Count; i += 1)
            {
                var value = i < row.Cells.Count ? row.Cells[i] : null;
                record[Columns[i].Name] = value?.DeepClone();
            }

            records.Add(record);
        }

        return records;
    }

    private JsonArray ToJsonColumns()
    {
        var columns = new JsonArray();
        foreach (var column in Columns)
        {
            var columnObject = new JsonObject
            {
                ["name"] = column.Name,
            };
            if (column.Type is not null)
            {
                columnObject["type"] = column.Type;
            }

            columns.Add(columnObject);
        }

        return columns;
    }

    private JsonArray ToJsonRows()
    {
        var rows = new JsonArray();
        foreach (var row in Rows)
        {
            var cells = new JsonArray();
            foreach (var cell in row.Cells)
            {
                cells.Add(cell?.DeepClone());
            }

            rows.Add(cells);
        }

        return rows;
    }
}
