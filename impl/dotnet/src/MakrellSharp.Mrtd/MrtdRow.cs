using System.Text.Json.Nodes;

namespace MakrellSharp.Mrtd;

public sealed record MrtdRow(IReadOnlyList<JsonNode?> Cells);
