import "dart:io";

import "_mbf_lite.dart";
import "error.dart";

class MrtdColumn {
  final String name;
  final String? type;

  const MrtdColumn(this.name, [this.type]);
}

class MrtdRow {
  final List<Object?> cells;

  const MrtdRow(this.cells);
}

class MrtdDocument {
  final List<MrtdColumn> columns;
  final List<MrtdRow> rows;

  const MrtdDocument({required this.columns, required this.rows});

  List<Map<String, Object?>> get records {
    return rows.map((row) {
      final record = <String, Object?>{};
      for (var index = 0; index < columns.length; index += 1) {
        record[columns[index].name] = row.cells[index];
      }
      return record;
    }).toList(growable: false);
  }
}

class Mrtd {
  static const Set<String> _declaredTypes = {"int", "float", "bool", "string"};

  static MrtdDocument parseString(String source, {Set<String> profiles = const {}}) {
    if (profiles.isNotEmpty) {
      // Reserved for future optional MRTD extensions. Current core parsing
      // always applies the shared basic suffix profile directly.
    }
    final rows = _splitRootRows(source);
    if (rows.isEmpty) {
      return const MrtdDocument(columns: [], rows: []);
    }

    final columns = _parseHeaderRow(rows.first);
    final parsedRows = <MrtdRow>[];
    for (var index = 1; index < rows.length; index += 1) {
      parsedRows.add(_parseDataRow(rows[index], columns, index + 1));
    }
    return MrtdDocument(columns: columns, rows: parsedRows);
  }

  static MrtdDocument parseFile(String path, {Set<String> profiles = const {}}) {
    return parseString(File(path).readAsStringSync(), profiles: profiles);
  }

  static String writeString(Object? value, {Set<String> profiles = const {}}) {
    if (profiles.isNotEmpty) {
      // Reserved for future optional MRTD extensions. Current core writing
      // always applies the shared basic suffix profile directly.
    }
    if (value is MrtdDocument) {
      return _writeDocument(value);
    }
    if (value is List && (value.isEmpty || value.first is Map)) {
      return writeRecords(
        value.map((row) => Map<String, Object?>.from((row as Map).cast<String, Object?>())).toList(growable: false),
      );
    }
    if (value is List && (value.isEmpty || value.first is List)) {
      return writeTuples(
        value.map((row) => List<Object?>.from(row as List, growable: false)).toList(growable: false),
      );
    }
    throw MakrellFormatException("MRTD writeString expects MrtdDocument, List<Map>, or List<List>.");
  }

  static String writeRecords(List<Map<String, Object?>> rows, {Set<String> profiles = const {}}) {
    if (profiles.isNotEmpty) {
      // Reserved for future optional MRTD extensions. Current core writing
      // always applies the shared basic suffix profile directly.
    }
    if (rows.isEmpty) {
      throw MakrellFormatException("Cannot write MRTD records from an empty row sequence.");
    }
    final headers = rows.first.keys.toList(growable: false);
    if (headers.isEmpty) {
      throw MakrellFormatException("Cannot write MRTD records from an object with no fields.");
    }
    final columns = headers
        .map((header) => MrtdColumn(header, _inferRecordType(rows, header)))
        .toList(growable: false);
    final dataRows = rows
        .map((row) => MrtdRow(headers.map((header) => row[header]).toList(growable: false)))
        .toList(growable: false);
    return _writeDocument(MrtdDocument(columns: columns, rows: dataRows));
  }

  static String writeTuples(
    List<List<Object?>> rows, {
    List<String>? headers,
    Set<String> profiles = const {},
  }) {
    if (profiles.isNotEmpty) {
      // Reserved for future optional MRTD extensions. Current core writing
      // always applies the shared basic suffix profile directly.
    }
    if (rows.isEmpty) {
      throw MakrellFormatException("Cannot write MRTD tuples from an empty row sequence.");
    }
    final width = rows.first.length;
    if (width == 0) {
      throw MakrellFormatException("Cannot write MRTD tuples with zero columns.");
    }
    for (final row in rows) {
      if (row.length != width) {
        throw MakrellFormatException("MRTD tuple row width mismatch: expected $width, got ${row.length}.");
      }
    }
    final actualHeaders = headers ?? List<String>.generate(width, (index) => "c${index + 1}");
    if (actualHeaders.length != width) {
      throw MakrellFormatException("Expected $width MRTD tuple headers, got ${actualHeaders.length}.");
    }
    final columns = List<MrtdColumn>.generate(
      width,
      (index) => MrtdColumn(actualHeaders[index], _inferTupleType(rows, index)),
      growable: false,
    );
    final dataRows = rows.map((row) => MrtdRow(List<Object?>.from(row, growable: false))).toList(growable: false);
    return _writeDocument(MrtdDocument(columns: columns, rows: dataRows));
  }

  static String _writeDocument(MrtdDocument document) {
    final lines = <String>[];
    lines.add(document.columns.map(_formatHeaderCell).join(" "));
    for (final row in document.rows) {
      lines.add(row.cells.map(_formatScalar).join(" "));
    }
    return lines.join("\n");
  }

  static List<String> _splitRootRows(String source) {
    final result = <String>[];
    var current = StringBuffer();
    var depth = 0;
    var inString = false;
    var escaped = false;
    var inComment = false;
    var index = 0;

    void flush() {
      final line = current.toString().trim();
      if (line.isNotEmpty) {
        result.add(line);
      }
      current = StringBuffer();
    }

    while (index < source.length) {
      final char = source[index];
      if (inComment) {
        if (char == "\n") {
          inComment = false;
          if (depth == 0) {
            flush();
          } else {
            current.write(char);
          }
        }
        index += 1;
        continue;
      }

      if (inString) {
        current.write(char);
        if (escaped) {
          escaped = false;
        } else if (char == "\\") {
          escaped = true;
        } else if (char == "\"") {
          inString = false;
        }
        index += 1;
        continue;
      }

      if (char == "#") {
        inComment = true;
        index += 1;
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
      if (char == "\"") {
        inString = true;
        current.write(char);
        index += 1;
        continue;
      }
      if (char == "(" || char == "[" || char == "{") {
        depth += 1;
        current.write(char);
        index += 1;
        continue;
      }
      if (char == ")" || char == "]" || char == "}") {
        depth -= 1;
        current.write(char);
        index += 1;
        continue;
      }
      if (char == "\n" && depth == 0) {
        flush();
        index += 1;
        continue;
      }
      current.write(char);
      index += 1;
    }
    flush();
    return result;
  }

  static List<String> _splitRowCells(String rowSource) {
    final row = _unwrapTopLevelRoundRow(rowSource.trim());
    final cells = <String>[];
    var current = StringBuffer();
    var depth = 0;
    var inString = false;
    var escaped = false;

    void flush() {
      final cell = current.toString().trim();
      if (cell.isNotEmpty) {
        cells.add(cell);
      }
      current = StringBuffer();
    }

    for (final rune in row.runes) {
      final char = String.fromCharCode(rune);
      if (inString) {
        current.write(char);
        if (escaped) {
          escaped = false;
        } else if (char == "\\") {
          escaped = true;
        } else if (char == "\"") {
          inString = false;
        }
        continue;
      }

      if (char == "\"") {
        inString = true;
        current.write(char);
        continue;
      }
      if (char == "(" || char == "[" || char == "{") {
        depth += 1;
        current.write(char);
        continue;
      }
      if (char == ")" || char == "]" || char == "}") {
        depth -= 1;
        current.write(char);
        continue;
      }
      if (char.trim().isEmpty && depth == 0) {
        flush();
        continue;
      }
      current.write(char);
    }
    flush();
    return cells;
  }

  static String _unwrapTopLevelRoundRow(String rowSource) {
    if (rowSource.startsWith("(") && rowSource.endsWith(")")) {
      return rowSource.substring(1, rowSource.length - 1).trim();
    }
    return rowSource;
  }

  static List<MrtdColumn> _parseHeaderRow(String row) {
    final cells = _splitRowCells(row);
    if (cells.isEmpty) {
      throw MakrellFormatException("MRTD header row is empty.");
    }
    return cells.map(_parseHeaderCell).toList(growable: false);
  }

  static MrtdColumn _parseHeaderCell(String cell) {
    final colon = _findTopLevelColon(cell);
    if (colon < 0) {
      return MrtdColumn(_parseHeaderName(cell));
    }
    final name = cell.substring(0, colon).trim();
    final type = cell.substring(colon + 1).trim();
    if (!_declaredTypes.contains(type)) {
      throw MakrellFormatException("Unsupported MRTD declared type '$type'.");
    }
    return MrtdColumn(_parseHeaderName(name), type);
  }

  static int _findTopLevelColon(String cell) {
    var depth = 0;
    var inString = false;
    var escaped = false;
    for (var index = 0; index < cell.length; index += 1) {
      final char = cell[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char == "\\") {
          escaped = true;
        } else if (char == "\"") {
          inString = false;
        }
        continue;
      }
      if (char == "\"") {
        inString = true;
        continue;
      }
      if (char == "(" || char == "[" || char == "{") depth += 1;
      if (char == ")" || char == "]" || char == "}") depth -= 1;
      if (char == ":" && depth == 0) return index;
    }
    return -1;
  }

  static String _parseHeaderName(String text) {
    final trimmed = text.trim();
    final token = _singleScalarToken(trimmed);
    final value = parseCoreScalar(token);
    if (value is! String) {
      throw MakrellFormatException("MRTD field names must be identifier or string.");
    }
    return value;
  }

  static MrtdRow _parseDataRow(String row, List<MrtdColumn> columns, int lineNumber) {
    final cells = _splitRowCells(row);
    if (cells.length != columns.length) {
      throw MakrellFormatException("MRTD row $lineNumber has ${cells.length} cells, expected ${columns.length}.");
    }

    final parsed = <Object?>[];
    for (var index = 0; index < columns.length; index += 1) {
      parsed.add(_parseDataCell(cells[index], columns[index]));
    }
    return MrtdRow(parsed);
  }

  static Object? _parseDataCell(String cell, MrtdColumn column) {
    final token = _singleScalarToken(cell);
    final value = parseCoreScalar(token);
    if (column.type == null) return value;
    if (!_matchesDeclaredType(value, column.type!)) {
      throw MakrellFormatException("MRTD field '${column.name}' expected ${column.type}, got ${value.runtimeType}.");
    }
    return value;
  }

  static MbfLiteToken _singleScalarToken(String text) {
    final tokens = tokenizeMbfLite(text);
    if (tokens.length != 1) {
      throw MakrellFormatException("MRTD data cells must currently be scalar values.");
    }
    final token = tokens.first;
    if (token.kind != MbfLiteTokenKind.identifier && token.kind != MbfLiteTokenKind.number && token.kind != MbfLiteTokenKind.string) {
      throw MakrellFormatException("MRTD data cells must currently be scalar values.");
    }
    return token;
  }

  static bool _matchesDeclaredType(Object? value, String type) {
    return switch (type) {
      "int" => value is int,
      "float" => value is num,
      "bool" => value is bool,
      "string" => value is String,
      _ => false,
    };
  }

  static String _formatHeaderCell(MrtdColumn column) {
    final base = scalarToSource(column.name);
    return column.type == null ? base : "$base:${column.type}";
  }

  static String _formatScalar(Object? value) {
    if (value is DateTime) {
      return '"${value.toIso8601String()}"dt';
    }
    if (value == null || value is bool || value is num || value is String) {
      return scalarToSource(value);
    }
    throw MakrellFormatException("MRTD writing currently supports only scalar values, not '${value.runtimeType}'.");
  }

  static String? _inferRecordType(List<Map<String, Object?>> rows, String key) {
    for (final row in rows) {
      final inferred = _inferType(row[key]);
      if (inferred != null) return inferred;
    }
    return null;
  }

  static String? _inferTupleType(List<List<Object?>> rows, int index) {
    for (final row in rows) {
      final inferred = _inferType(row[index]);
      if (inferred != null) return inferred;
    }
    return null;
  }

  static String? _inferType(Object? value) {
    if (value is bool) return "bool";
    if (value is int) return "int";
    if (value is double) return "float";
    if (value is String) return "string";
    return null;
  }
}
