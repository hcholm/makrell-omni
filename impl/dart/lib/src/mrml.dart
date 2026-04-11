import "dart:io";

import "_mbf_lite.dart";
import "error.dart";

class MrmlElement {
  final String name;
  final Map<String, String> attributes;
  final List<Object> children;

  const MrmlElement(this.name, {this.attributes = const {}, this.children = const []});
}

class Mrml {
  static MrmlElement parseString(String source, {bool allowExec = false}) {
    if (allowExec) {
      throw MakrellFormatException("MRML executable embeds are not implemented in the Dart track.");
    }

    final stream = MbfLiteTokenStream(tokenizeMbfLite(source));
    final element = _parseElement(stream);
    if (!stream.isAtEnd) {
      throw MakrellFormatException("MRML source must contain a single root element.");
    }
    return element;
  }

  static MrmlElement parseFile(String path, {bool allowExec = false}) {
    return parseString(File(path).readAsStringSync(), allowExec: allowExec);
  }

  static String writeString(MrmlElement value) {
    return _writeElement(value);
  }

  static MrmlElement _parseElement(MbfLiteTokenStream stream) {
    stream.expect(MbfLiteTokenKind.lBrace, "Expected '{' as MRML element start.");
    final tag = stream.consume();
    if (tag.kind != MbfLiteTokenKind.identifier && tag.kind != MbfLiteTokenKind.string) {
      throw MakrellFormatException("MRML element name must be identifier or string.");
    }

    final attributes = <String, String>{};
    if (stream.match(MbfLiteTokenKind.lBracket)) {
      while (!stream.match(MbfLiteTokenKind.rBracket)) {
        if (stream.isAtEnd) {
          throw MakrellFormatException("Unterminated MRML attribute block.");
        }
        final name = stream.consume();
        if (name.kind != MbfLiteTokenKind.identifier && name.kind != MbfLiteTokenKind.string) {
          throw MakrellFormatException("MRML attribute names must be identifiers or strings.");
        }
        stream.expect(MbfLiteTokenKind.equals, "Expected '=' in MRML attribute.");
        final value = stream.consume();
        if (value.kind != MbfLiteTokenKind.identifier && value.kind != MbfLiteTokenKind.number && value.kind != MbfLiteTokenKind.string) {
          throw MakrellFormatException("MRML attribute values must currently be scalar.");
        }
        attributes[_nameText(name)] = _textTokenValue(value);
      }
    }

    final children = <Object>[];
    while (!stream.match(MbfLiteTokenKind.rBrace)) {
      if (stream.isAtEnd) {
        throw MakrellFormatException("Unterminated MRML element.");
      }
      if (stream.peek?.kind == MbfLiteTokenKind.lBrace) {
        children.add(_parseElement(stream));
        continue;
      }
      final token = stream.consume();
      children.add(_textTokenValue(token));
    }

    return MrmlElement(_nameText(tag), attributes: attributes, children: children);
  }

  static String _nameText(MbfLiteToken token) => token.kind == MbfLiteTokenKind.string ? token.stringValue ?? "" : token.lexeme;

  static String _textTokenValue(MbfLiteToken token) {
    return switch (token.kind) {
      MbfLiteTokenKind.string => token.stringValue ?? "",
      MbfLiteTokenKind.identifier => token.lexeme,
      MbfLiteTokenKind.number => token.lexeme,
      _ => throw MakrellFormatException("Unsupported MRML content token '${token.lexeme}'."),
    };
  }

  static String _writeElement(MrmlElement element) {
    final attrs = element.attributes.entries
        .map((entry) => ' ${entry.key}="${_escapeAttribute(entry.value)}"')
        .join();
    if (element.children.isEmpty) {
      return "<${element.name}$attrs />";
    }

    final body = element.children.map((child) {
      if (child is MrmlElement) return _writeElement(child);
      return _escapeText(child.toString());
    }).join();

    return "<${element.name}$attrs>$body</${element.name}>";
  }

  static String _escapeText(String text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
  }

  static String _escapeAttribute(String text) {
    return _escapeText(text).replaceAll('"', "&quot;");
  }
}
