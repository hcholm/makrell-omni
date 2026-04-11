using MakrellSharp.Ast;
using MakrellSharp.BaseFormat;

namespace MakrellSharp.BaseFormat.Tests;

public sealed class BasicSuffixProfileTests
{
    [Fact]
    public void Apply_ExposesBasicSuffixProfileAsDirectPostL1ConversionLayer()
    {
        var date = BasicSuffixProfile.Apply(new StringNode("\"2026-04-11\"", "dt", SourceSpan.Empty));
        var scaled = BasicSuffixProfile.Apply(new NumberNode("3", "k", SourceSpan.Empty));

        Assert.Equal(new DateTime(2026, 4, 11), date);
        Assert.Equal(3000L, Assert.IsType<long>(scaled));
    }
}
