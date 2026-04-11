import "dart:io";

import "_mbf_lite.dart";
import "error.dart";

class Mron {
  static Object? parseString(String source, {bool allowExec = false, Set<String> profiles = const {}}) {
    if (allowExec) {
      throw MakrellFormatException("MRON executable embeds are not implemented in the Dart track.");
    }

    final stream = MbfLiteTokenStream(tokenizeMbfLite(source));
    final values = <Object?>[];
    while (!stream.isAtEnd) {
      values.add(_parseValue(stream, profiles: profiles));
    }

    if (values.isEmpty) return null;
    if (values.length == 1) return values.first;
    if (values.length.isOdd) {
      throw MakrellFormatException("Illegal number (${values.length}) of root level expressions");
    }
    return _pairsToMap(values);
  }

  static Object? parseFile(String path, {bool allowExec = false, Set<String> profiles = const {}}) {
    return parseString(File(path).readAsStringSync(), allowExec: allowExec, profiles: profiles);
  }

  static String writeString(Object? value) {
    return _writeValue(value);
  }

  static Object? _parseValue(MbfLiteTokenStream stream, {required Set<String> profiles}) {
    final token = stream.consume();
    switch (token.kind) {
      case MbfLiteTokenKind.lBracket:
        final items = <Object?>[];
        while (!stream.match(MbfLiteTokenKind.rBracket)) {
          if (stream.isAtEnd) {
            throw MakrellFormatException("Unterminated MRON list.");
          }
          items.add(_parseValue(stream, profiles: profiles));
        }
        return items;
      case MbfLiteTokenKind.lBrace:
        final values = <Object?>[];
        while (!stream.match(MbfLiteTokenKind.rBrace)) {
          if (stream.isAtEnd) {
            throw MakrellFormatException("Unterminated MRON object.");
          }
          values.add(_parseValue(stream, profiles: profiles));
        }
        return _pairsToMap(values);
      case MbfLiteTokenKind.identifier:
      case MbfLiteTokenKind.number:
      case MbfLiteTokenKind.string:
        return parseCoreScalar(token, profiles: profiles);
      default:
        throw MakrellFormatException("Unexpected token '${token.lexeme}' in MRON.");
    }
  }

  static Map<String, Object?> _pairsToMap(List<Object?> values) {
    if (values.isNotEmpty && values.length.isOdd) {
      throw MakrellFormatException("Odd pair count in object-like MRON form.");
    }

    final result = <String, Object?>{};
    for (var index = 0; index < values.length; index += 2) {
      final key = values[index];
      if (key is! String) {
        throw MakrellFormatException("MRON object keys must be string-compatible scalars.");
      }
      result[key] = values[index + 1];
    }
    return result;
  }

  static String _writeValue(Object? value) {
    if (value is Map) {
      if (value.isEmpty) return "{}";
      final parts = <String>[];
      value.forEach((key, nested) {
        parts.add("${scalarToSource(key.toString())} ${_writeValue(nested)}");
      });
      return "{ ${parts.join(" ")} }";
    }
    if (value is Iterable && value is! String) {
      return "[${value.map(_writeValue).join(" ")}]";
    }
    return scalarToSource(value);
  }
}
