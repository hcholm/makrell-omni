import "error.dart";

enum BasicSuffixLiteralKind { string, number }

class BasicSuffixLiteral {
  final BasicSuffixLiteralKind kind;
  final String value;
  final String suffix;

  const BasicSuffixLiteral(this.kind, this.value, [this.suffix = ""]);
}

Object applyBasicSuffixProfile(BasicSuffixLiteral literal) {
  if (literal.kind == BasicSuffixLiteralKind.string) {
    if (literal.suffix.isEmpty) return literal.value;
    if (literal.suffix == "dt") return DateTime.parse(literal.value);
    return switch (literal.suffix) {
      "bin" => int.parse(literal.value, radix: 2),
      "oct" => int.parse(literal.value, radix: 8),
      "hex" => int.parse(literal.value, radix: 16),
      _ => throw MakrellFormatException("Unsupported basic suffix profile string suffix '${literal.suffix}'."),
    };
  }

  final raw = literal.value;
  final baseValue = raw.contains(".") || raw.contains("e") || raw.contains("E")
      ? double.parse(raw)
      : int.parse(raw);
  if (literal.suffix.isEmpty) return baseValue;

  if (baseValue is int) {
    return switch (literal.suffix) {
      "k" => baseValue * 1000,
      "M" => baseValue * 1000000,
      "G" => baseValue * 1000000000,
      "T" => baseValue * 1000000000000,
      "P" => baseValue * 1000000000000000,
      "E" => baseValue * 1000000000000000000,
      "pi" => baseValue * 3.141592653589793,
      "tau" => baseValue * 6.283185307179586,
      "deg" => baseValue * 0.017453292519943295,
      _ => throw MakrellFormatException("Unsupported basic suffix profile numeric suffix '${literal.suffix}'."),
    };
  }

  return switch (literal.suffix) {
    "k" => baseValue * 1e3,
    "M" => baseValue * 1e6,
    "G" => baseValue * 1e9,
    "T" => baseValue * 1e12,
    "P" => baseValue * 1e15,
    "E" => baseValue * 1e18,
    "pi" => baseValue * 3.141592653589793,
    "tau" => baseValue * 6.283185307179586,
    "deg" => baseValue * 0.017453292519943295,
    _ => throw MakrellFormatException("Unsupported basic suffix profile numeric suffix '${literal.suffix}'."),
  };
}
