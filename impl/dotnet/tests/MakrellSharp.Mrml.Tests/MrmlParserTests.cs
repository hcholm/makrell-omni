using System.Xml.Linq;
using MakrellSharp.Mrml;

namespace MakrellSharp.Mrml.Tests;

public sealed class MrmlParserTests
{
    [Fact]
    public void ParseSource_SimpleElement()
    {
        var document = MrmlParser.ParseSource("{a}");

        Assert.Equal("<a />", ToXml(document));
    }

    [Fact]
    public void ParseSource_Content()
    {
        Assert.Equal("<a>2</a>", ToXml(MrmlParser.ParseSource("{a 2}")));
        Assert.Equal("<a>b 2 b 2</a>", ToXml(MrmlParser.ParseSource("{a b 2 b 2}")));
    }

    [Fact]
    public void ParseSource_MixedContent()
    {
        Assert.Equal("<a>b()2) <c>d 3</c>asd</a>", ToXml(MrmlParser.ParseSource("{a b()2\")\" {c d 3}\"asd\"}")));
        Assert.Equal("<a>(x y)</a>", ToXml(MrmlParser.ParseSource("{a (x y)}")));
    }

    [Fact]
    public void ParseSource_Attributes()
    {
        Assert.Equal("<a b=\"2\" c=\"3\" />", ToXml(MrmlParser.ParseSource("{a [b=\"2\" c=3]}")));
    }

    [Fact]
    public void ParseSource_AttributesAndMixedContent()
    {
        Assert.Equal("<a b=\"2\" c=\"3\">ab</a>", ToXml(MrmlParser.ParseSource("{a [b=\"2\" c=3] a\"b\"}")));
    }

    [Fact]
    public void ParseSource_UsesWhitespacePreservingMode()
    {
        Assert.Equal("<a>x </a>", ToXml(MrmlParser.ParseSource("{a  x }")));
    }

    [Fact]
    public void ParseSource_RejectsExecEmbedsUntilImplemented()
    {
        var exception = Assert.Throws<NotSupportedException>(() =>
            MrmlParser.ParseSource("{a {$ [2 3 5 7] | sum}}", new MrmlParseOptions { AllowExec = true }));

        Assert.Contains("not implemented yet", exception.Message);
    }

    private static string ToXml(XDocument document)
    {
        return document.Root!.ToString(SaveOptions.DisableFormatting);
    }
}
