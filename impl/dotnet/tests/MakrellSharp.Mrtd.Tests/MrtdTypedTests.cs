namespace MakrellSharp.Mrtd.Tests;

public sealed class MrtdTypedTests
{
    [Fact]
    public void ReadRecords_MapsRowsToTypedObjects()
    {
        var rows = MrtdTyped.ReadRecords<Person>(
            """
            name:string age:int active:bool
            Ada 32 true
            Ben 41 false
            """);

        Assert.Equal(2, rows.Count);
        Assert.Equal("Ada", rows[0].Name);
        Assert.Equal(32, rows[0].Age);
        Assert.True(rows[0].Active);
        Assert.False(rows[1].Active);
    }

    [Fact]
    public void ReadTuples_MapsRowsToTupleLikeShape()
    {
        var rows = MrtdTyped.ReadTuples<int, string, double>(
            """
            id:int name:string score:float
            1 Ada 13.5
            2 Ben 9.25
            """);

        Assert.Equal((1, "Ada", 13.5d), rows[0]);
        Assert.Equal((2, "Ben", 9.25d), rows[1]);
    }

    [Fact]
    public void WriteRecords_WritesHeaderAndRows()
    {
        var text = MrtdTyped.WriteRecords(
            new[]
            {
                new Person { Name = "Ada", Age = 32, Active = true },
                new Person { Name = "Rena Holm", Age = 29, Active = false },
            });

        Assert.Contains("Name:string Age:int Active:bool", text, StringComparison.Ordinal);
        Assert.Contains("Ada 32 true", text, StringComparison.Ordinal);
        Assert.Contains("\"Rena Holm\" 29 false", text, StringComparison.Ordinal);
    }

    [Fact]
    public void WriteTuples_WritesTupleRowsWithDefaultHeaders()
    {
        var text = MrtdTyped.WriteTuples(
            new (int, string, double)[]
            {
                (1, "Ada", 13.5d),
                (2, "Ben", 9.25d),
            });

        Assert.Contains("c1:int c2:string c3:float", text, StringComparison.Ordinal);
        Assert.Contains("1 Ada 13.5", text, StringComparison.Ordinal);
    }

    private sealed class Person
    {
        public string Name { get; set; } = string.Empty;

        public int Age { get; set; }

        public bool Active { get; set; }
    }
}
