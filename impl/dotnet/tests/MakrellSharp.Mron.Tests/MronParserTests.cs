using MakrellSharp.Mron;

namespace MakrellSharp.Mron.Tests;

public sealed class MronParserTests
{
    [Fact]
    public void ParseSource_EmptyInputReturnsNull()
    {
        using var document = MronParser.ParseSource("  ");
        Assert.Equal(System.Text.Json.JsonValueKind.Null, document.RootElement.ValueKind);
    }

    [Fact]
    public void ParseSource_ScalarNumberParsesAsJsonNumber()
    {
        using var document = MronParser.ParseSource("2");

        Assert.Equal(2L, document.RootElement.GetInt64());
    }

    [Fact]
    public void ParseSource_BareIdentifierRootParsesAsJsonString()
    {
        using var document = MronParser.ParseSource("Makrell");

        Assert.Equal("Makrell", document.RootElement.GetString());
    }

    [Fact]
    public void ParseSource_ThrowsOnIllegalRootCardinality()
    {
        var exception = Assert.Throws<InvalidOperationException>(() => MronParser.ParseSource("2 3 5"));

        Assert.Equal("Illegal number (3) of root level expressions", exception.Message);
    }

    [Fact]
    public void ParseSource_ParsesArrays()
    {
        using var document = MronParser.ParseSource("""a [2 3 "x"]""");
        var obj = document.RootElement;

        var arr = obj.GetProperty("a");
        Assert.Equal(3, arr.GetArrayLength());
        Assert.Equal(2L, arr[0].GetInt64());
        Assert.Equal(3L, arr[1].GetInt64());
        Assert.Equal("x", arr[2].GetString());
    }

    [Fact]
    public void ParseSource_ParsesSimpleObject()
    {
        using var document = MronParser.ParseSource("a 2 b 3");
        var obj = document.RootElement;

        Assert.Equal(2L, obj.GetProperty("a").GetInt64());
        Assert.Equal(3L, obj.GetProperty("b").GetInt64());
    }

    [Fact]
    public void ParseSource_ParsesNestedObjectsAndSuffixes()
    {
        using var document = MronParser.ParseSource(
            """
            a 2
            b [3 5 "7"]
            c {
                "d x" 11
                "e æ" 13.17
                f {
                    g []
                    h "asd"
                    生年月日 "1996-05-12"dt
                }
            }
            """);

        var root = document.RootElement;
        Assert.Equal(2L, root.GetProperty("a").GetInt64());

        var array = root.GetProperty("b");
        Assert.Equal(3L, array[0].GetInt64());
        Assert.Equal(5L, array[1].GetInt64());
        Assert.Equal("7", array[2].GetString());

        var c = root.GetProperty("c");
        Assert.Equal(11L, c.GetProperty("d x").GetInt64());
        Assert.Equal(13.17d, c.GetProperty("e æ").GetDouble());

        var f = c.GetProperty("f");
        Assert.Equal("asd", f.GetProperty("h").GetString());
        Assert.Equal("1996-05-12T00:00:00", f.GetProperty("生年月日").GetString());
    }

    [Fact]
    public void ParseSource_MapsTrueFalseAndNullIdentifiers()
    {
        using var document = MronParser.ParseSource(
            """
            yes true
            no false
            nothing null
            word hello
            """);

        var obj = document.RootElement;
        Assert.True(obj.GetProperty("yes").GetBoolean());
        Assert.False(obj.GetProperty("no").GetBoolean());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, obj.GetProperty("nothing").ValueKind);
        Assert.Equal("hello", obj.GetProperty("word").GetString());
    }

    [Fact]
    public void ParseSource_TreatsIdentifiersAsStringValuesInArraysAndNestedObjects()
    {
        using var document = MronParser.ParseSource(
            """
            title Makrell
            tags [alpha beta gamma]
            nested {
                kind article
                status draft
            }
            """);

        var root = document.RootElement;
        Assert.Equal("Makrell", root.GetProperty("title").GetString());

        var tags = root.GetProperty("tags");
        Assert.Equal("alpha", tags[0].GetString());
        Assert.Equal("beta", tags[1].GetString());
        Assert.Equal("gamma", tags[2].GetString());

        var nested = root.GetProperty("nested");
        Assert.Equal("article", nested.GetProperty("kind").GetString());
        Assert.Equal("draft", nested.GetProperty("status").GetString());
    }

    [Fact]
    public void ParseSource_RejectsExecutableEmbedsUntilImplemented()
    {
        var exception = Assert.Throws<NotSupportedException>(() =>
            MronParser.ParseSource("a {$ 2 + 3}", new MronParseOptions { AllowExec = true }));

        Assert.Contains("not implemented yet", exception.Message);
    }
}
