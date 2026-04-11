import "dart:io";

String fixturePath(String relativePath) {
  final candidates = <String>[
    "../../shared/format-fixtures/$relativePath",
    "../shared/format-fixtures/$relativePath",
    "shared/format-fixtures/$relativePath",
  ];

  for (final candidate in candidates) {
    if (File(candidate).existsSync()) {
      return candidate;
    }
  }

  throw StateError("Could not resolve shared fixture path for '$relativePath'.");
}
