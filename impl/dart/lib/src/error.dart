class MakrellFormatException implements Exception {
  final String message;

  MakrellFormatException(this.message);

  @override
  String toString() => "MakrellFormatException: $message";
}
