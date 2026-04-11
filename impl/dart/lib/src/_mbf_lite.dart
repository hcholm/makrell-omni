import "error.dart";

enum MbfLiteTokenKind {
  identifier,
  number,
  string,
  lBrace,
  rBrace,
  lBracket,
  rBracket,
  lParen,
  rParen,
  equals,
  operator,
}

class MbfLiteToken {
  final MbfLiteTokenKind kind;
  final String lexeme;
  final String? stringValue;
  final String suffix;

  const MbfLiteToken(this.kind, this.lexeme, {this.stringValue, this.suffix = ""});
}

class MbfLiteTokenStream {
  final List<MbfLiteToken> _tokens;
  int _index = 0;

  MbfLiteTokenStream(this._tokens);

  bool get isAtEnd => _index >= _tokens.length;

  MbfLiteToken? get peek => isAtEnd ? null : _tokens[_index];

  MbfLiteToken consume() {
    if (isAtEnd) {
      throw MakrellFormatException("Unexpected end of input.");
    }
    return _tokens[_index++];
  }

  bool match(MbfLiteTokenKind kind) {
    if (peek?.kind == kind) {
      _index += 1;
      return true;
    }
    return false;
  }

  MbfLiteToken expect(MbfLiteTokenKind kind, String message) {
    final token = consume();
    if (token.kind != kind) {
      throw MakrellFormatException(message);
    }
    return token;
  }
}

final RegExp _numberRx = RegExp(r"^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?([A-Za-z][A-Za-z0-9_]*)?$");

List<MbfLiteToken> tokenizeMbfLite(String source) {
  final tokens = <MbfLiteToken>[];
  var index = 0;

  bool isDelimiter(String char) {
    return char.trim().isEmpty ||
        char == "#" ||
        char == "," ||
        char == "/" ||
        char == "{" ||
        char == "}" ||
        char == "[" ||
        char == "]" ||
        char == "(" ||
        char == ")" ||
        char == "=" ||
        char == "-" ||
        char == "\"";
  }

  while (index < source.length) {
    final char = source[index];

    if (char.trim().isEmpty || char == ",") {
      index += 1;
      continue;
    }

    if (char == "#") {
      while (index < source.length && source[index] != "\n") {
        index += 1;
      }
      continue;
    }

    if (char == "/" && index + 1 < source.length && source[index + 1] == "*") {
      index += 2;
      while (index + 1 < source.length && !(source[index] == "*" && source[index + 1] == "/")) {
        index += 1;
      }
      if (index + 1 >= source.length) {
        throw MakrellFormatException("Unterminated block comment.");
      }
      index += 2;
      continue;
    }

    if (char == "-" && index + 1 < source.length && RegExp(r"\d").hasMatch(source[index + 1])) {
      final start = index;
      index += 1;
      while (index < source.length && !isDelimiter(source[index])) {
        index += 1;
      }
      final lexeme = source.substring(start, index);
      if (_numberRx.hasMatch(lexeme)) {
        final suffix = RegExp(r"[A-Za-z][A-Za-z0-9_]*$").firstMatch(lexeme)?.group(0) ?? "";
        tokens.add(MbfLiteToken(MbfLiteTokenKind.number, lexeme, suffix: suffix));
      } else {
        tokens.add(MbfLiteToken(MbfLiteTokenKind.identifier, lexeme));
      }
      continue;
    }

    switch (char) {
      case "{":
        tokens.add(const MbfLiteToken(MbfLiteTokenKind.lBrace, "{"));
        index += 1;
        continue;
      case "}":
        tokens.add(const MbfLiteToken(MbfLiteTokenKind.rBrace, "}"));
        index += 1;
        continue;
      case "[":
        tokens.add(const MbfLiteToken(MbfLiteTokenKind.lBracket, "["));
        index += 1;
        continue;
      case "]":
        tokens.add(const MbfLiteToken(MbfLiteTokenKind.rBracket, "]"));
        index += 1;
        continue;
      case "(":
        tokens.add(const MbfLiteToken(MbfLiteTokenKind.lParen, "("));
        index += 1;
        continue;
      case ")":
        tokens.add(const MbfLiteToken(MbfLiteTokenKind.rParen, ")"));
        index += 1;
        continue;
      case "=":
        tokens.add(const MbfLiteToken(MbfLiteTokenKind.equals, "="));
        index += 1;
        continue;
      case "-":
        tokens.add(const MbfLiteToken(MbfLiteTokenKind.operator, "-"));
        index += 1;
        continue;
      case "\"":
        final start = index;
        index += 1;
        final buffer = StringBuffer();
        var escaped = false;
        while (index < source.length) {
          final current = source[index++];
          if (escaped) {
            buffer.write(switch (current) {
              "n" => "\n",
              "r" => "\r",
              "t" => "\t",
              "\"" => "\"",
              "\\" => "\\",
              _ => current,
            });
            escaped = false;
            continue;
          }
          if (current == "\\") {
            escaped = true;
            continue;
          }
          if (current == "\"") {
            break;
          }
          buffer.write(current);
        }
        if (index > source.length || source[index - 1] != "\"") {
          throw MakrellFormatException("Unterminated string literal.");
        }
        final suffixStart = index;
        while (index < source.length && RegExp(r"[A-Za-z0-9_]").hasMatch(source[index])) {
          index += 1;
        }
        final lexeme = source.substring(start, index);
        final suffix = source.substring(suffixStart, index);
        tokens.add(MbfLiteToken(MbfLiteTokenKind.string, lexeme, stringValue: buffer.toString(), suffix: suffix));
        continue;
    }

    final start = index;
    while (index < source.length && !isDelimiter(source[index])) {
      index += 1;
    }
    final lexeme = source.substring(start, index);
    if (_numberRx.hasMatch(lexeme)) {
      final suffix = RegExp(r"[A-Za-z][A-Za-z0-9_]*$").firstMatch(lexeme)?.group(0) ?? "";
      tokens.add(MbfLiteToken(MbfLiteTokenKind.number, lexeme, suffix: suffix));
    } else {
      tokens.add(MbfLiteToken(MbfLiteTokenKind.identifier, lexeme));
    }
  }

  return tokens;
}

Object? parseCoreScalar(MbfLiteToken token, {Set<String> profiles = const {}}) {
  switch (token.kind) {
    case MbfLiteTokenKind.string:
      return _parseStringToken(token, profiles: profiles);
    case MbfLiteTokenKind.number:
      return _parseNumberToken(token, profiles: profiles);
    case MbfLiteTokenKind.identifier:
      return switch (token.lexeme) {
        "true" => true,
        "false" => false,
        "null" => null,
        _ => token.lexeme,
      };
    default:
      throw MakrellFormatException("Expected scalar token, got '${token.lexeme}'.");
  }
}

String scalarToSource(Object? value) {
  if (value == null) return "null";
  if (value is bool) return value ? "true" : "false";
  if (value is num) return value.toString();
  if (value is DateTime) return '"${value.toIso8601String()}"dt';
  final text = value.toString();
  if (RegExp(r'^[A-Za-z_$][A-Za-z0-9_$]*$').hasMatch(text) && text != "true" && text != "false" && text != "null") {
    return text;
  }
  return "\"${text.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("\n", "\\n")}\"";
}

String tokenToText(MbfLiteToken token) {
  return switch (token.kind) {
    MbfLiteTokenKind.string => token.stringValue ?? "",
    MbfLiteTokenKind.number => token.lexeme,
    MbfLiteTokenKind.identifier => token.lexeme,
    MbfLiteTokenKind.lParen => "(",
    MbfLiteTokenKind.rParen => ")",
    MbfLiteTokenKind.lBracket => "[",
    MbfLiteTokenKind.rBracket => "]",
    MbfLiteTokenKind.lBrace => "{",
    MbfLiteTokenKind.rBrace => "}",
    MbfLiteTokenKind.equals => "=",
    MbfLiteTokenKind.operator => token.lexeme,
  };
}

Object? _parseStringToken(MbfLiteToken token, {Set<String> profiles = const {}}) {
  final value = token.stringValue ?? "";
  if (token.suffix.isEmpty) return value;
  if (token.suffix == "dt") return DateTime.parse(value);
  return switch (token.suffix) {
    "bin" => int.parse(value, radix: 2),
    "oct" => int.parse(value, radix: 8),
    "hex" => int.parse(value, radix: 16),
    _ => throw MakrellFormatException("Unsupported string suffix '${token.suffix}'."),
  };
}

Object _parseNumberToken(MbfLiteToken token, {Set<String> profiles = const {}}) {
  final suffix = token.suffix;
  final raw = suffix.isEmpty ? token.lexeme : token.lexeme.substring(0, token.lexeme.length - suffix.length);
  final baseValue = raw.contains(".") || raw.contains("e") || raw.contains("E")
      ? double.parse(raw)
      : int.parse(raw);
  if (suffix.isEmpty) return baseValue;

  const factors = <String, double>{
    "k": 1e3,
    "M": 1e6,
    "G": 1e9,
    "T": 1e12,
    "P": 1e15,
    "E": 1e18,
    "pi": 3.141592653589793,
    "tau": 6.283185307179586,
    "deg": 0.017453292519943295,
  };

  if (!factors.containsKey(suffix)) {
    throw MakrellFormatException("Unsupported numeric suffix '$suffix'.");
  }
  return (baseValue as num) * factors[suffix]!;
}
