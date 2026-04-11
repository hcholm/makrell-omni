using System.Text.Json.Nodes;
using MakrellSharp.Mrtd;

namespace MakrellSharp.Mrtd.Tests;

public sealed class MrtdParserTests
{
    [Fact]
    public void ParseSource_ParsesHeaderAndRows()
    {
        var document = MrtdParser.ParseSource(
            """
            sku:string qty:int price:float active:bool
            "A-1" 2 19.5 true
            "B-2" 1 4.0 false
            """);

        Assert.Equal(4, document.Columns.Count);
        Assert.Equal("sku", document.Columns[0].Name);
        Assert.Equal("string", document.Columns[0].Type);
        Assert.Equal("A-1", document.Rows[0].Cells[0]?.GetValue<string>());
        Assert.Equal(2d, document.Rows[0].Cells[1]?.GetValue<double>());
        Assert.Equal(19.5d, document.Rows[0].Cells[2]?.GetValue<double>());
        Assert.True(document.Rows[0].Cells[3]?.GetValue<bool>());
    }

    [Fact]
    public void ParseSource_AllowsUntypedHeaderCells()
    {
        var document = MrtdParser.ParseSource(
            """
            name age
            Ada 32
            """);

        Assert.Null(document.Columns[0].Type);
        Assert.Null(document.Columns[1].Type);
    }

    [Fact]
    public void ParseSource_SupportsQuotedHeaderNamesAndValues()
    {
        var document = MrtdParser.ParseSource(
            """
            "full name":string city:string
            "Ada Lovelace" London
            """);

        var records = document.ToJsonRecords();
        var record = records[0]!.AsObject();

        Assert.Equal("Ada Lovelace", record["full name"]?.GetValue<string>());
        Assert.Equal("London", record["city"]?.GetValue<string>());
    }

    [Fact]
    public void ParseSource_TreatsIdentifiersAsStringValuesInTypedAndUntypedCells()
    {
        var document = MrtdParser.ParseSource(
            """
            name:string status note
            Ada active draft
            Ben inactive review
            """);

        var records = document.ToJsonRecords();
        Assert.Equal("Ada", records[0]!["name"]?.GetValue<string>());
        Assert.Equal("active", records[0]!["status"]?.GetValue<string>());
        Assert.Equal("draft", records[0]!["note"]?.GetValue<string>());
        Assert.Equal("Ben", records[1]!["name"]?.GetValue<string>());
        Assert.Equal("inactive", records[1]!["status"]?.GetValue<string>());
        Assert.Equal("review", records[1]!["note"]?.GetValue<string>());
    }

    [Fact]
    public void ParseSource_SupportsMultilineHeaderAndRow()
    {
        var document = MrtdParser.ParseSource(
            """
            ( name:string
              age:int
              active:bool )
            ( Ada
              32
              true )
            """);

        Assert.Equal(3, document.Columns.Count);
        Assert.Equal("name", document.Columns[0].Name);
        Assert.Equal("Ada", document.Rows[0].Cells[0]?.GetValue<string>());
        Assert.Equal(32d, document.Rows[0].Cells[1]?.GetValue<double>());
        Assert.True(document.Rows[0].Cells[2]?.GetValue<bool>());
    }

    [Fact]
    public void ParseSource_RejectsRowWidthMismatch()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            MrtdParser.ParseSource(
                """
                name age
                Ada
                """));

        Assert.Contains("row width", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ParseSource_RejectsUnsupportedDeclaredType()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            MrtdParser.ParseSource(
                """
                name:decimal age:int
                Ada 32
                """));

        Assert.Contains("Unsupported MRTD field type", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ParseSource_RejectsProfileSuffixesInCoreMode()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            MrtdParser.ParseSource(
                """
                when:string
                "2026-04-03"dt
                """));

        Assert.Contains(MrtdProfiles.ExtendedScalars, exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ParseSource_AcceptsExtendedScalarProfileSuffixes()
    {
        var document = MrtdParser.ParseSource(
            """
            when bonus:float
            "2026-04-03"dt 3k
            """,
            new MrtdParseOptions
            {
                Profiles = new HashSet<string>(StringComparer.Ordinal)
                {
                    MrtdProfiles.ExtendedScalars,
                },
            });

        Assert.Equal("when", document.Columns[0].Name);
        Assert.Null(document.Columns[0].Type);
        Assert.NotNull(document.Rows[0].Cells[0]);
        Assert.Equal(3000d, document.Rows[0].Cells[1]?.GetValue<double>());
    }
}
