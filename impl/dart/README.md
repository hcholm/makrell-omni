# Makrell Formats for Dart

This directory contains the Dart-hosted MRON, MRML, and MRTD package.

Planned published package:

- `makrell_formats`

Current scope:

- package metadata
- public API surface
- tests
- examples
- MIT licence metadata

Current status:

- first working core parser/serialiser pass for MRON, MRML, and MRTD
- tests and examples checked in
- designed to leave room for a future fuller MBF/Makrell layer

Current supported Dart surface:

- MRON:
  - root scalar / array / object parsing
  - nested objects and arrays
  - comments
  - `true` / `false` / `null`
- MRML:
  - `{tag ...}` elements
  - optional `[attr=value ...]` attributes
  - text children and nested elements
  - deterministic XML-style serialisation
- MRTD:
  - typed headers
  - scalar rows
  - record projection
  - record and tuple writing

Not implemented yet in the Dart track:

- executable embeds for MRON/MRML
- full MBF compatibility
- the broader portability/profile matrix beyond the current core subset

Example:

```dart
final mron = Mron.parseString('name "Makrell" stable false');
final mrml = Mrml.parseString('{page [lang="en"] {title "Makrell"}}');
final mrtd = Mrtd.parseString('''
name:string age:int
Ada 32
''');
```
