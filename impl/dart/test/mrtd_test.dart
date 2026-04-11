import "dart:io";

import "package:makrell_formats/makrell_formats.dart";
import "package:test/test.dart";

import "_test_paths.dart";

void main() {
  group("MRTD", () {
    test("parses shared fixture", () {
      final source = File(fixturePath("mrtd/sample.mrtd")).readAsStringSync();
      final doc = Mrtd.parseString(source);

      expect(doc.columns.length, 3);
      expect(doc.columns[0].name, "name");
      expect(doc.columns[0].type, "string");
      expect(doc.records, [
        {"name": "Ada", "age": 32, "active": true},
        {"name": "Ben", "age": 41, "active": false},
      ]);
    });

    test("parseFile reads shared fixture", () {
      final doc = Mrtd.parseFile(fixturePath("mrtd/sample.mrtd"));
      expect(doc.records.first["name"], "Ada");
    });

    test("supports comments and multiline rows", () {
      final doc = Mrtd.parseString('''
        name:string age:int active:bool
        # comment
        (Ada 32 true)
        (Ben 41 false)
      ''');

      expect(doc.records, [
        {"name": "Ada", "age": 32, "active": true},
        {"name": "Ben", "age": 41, "active": false},
      ]);
    });

    test("supports quoted field names and string values", () {
      final doc = Mrtd.parseString('''
        "full name":string age:int
        "Ada Lovelace" 36
      ''');

      expect(doc.records.single, {"full name": "Ada Lovelace", "age": 36});
    });

    test("treats identifiers as string values in typed and untyped MRTD cells", () {
      final doc = Mrtd.parseFile(fixturePath("conformance/mrtd/untyped-headers.mrtd"));

      expect(doc.records, [
        {"name": "Ada", "status": "active", "note": "draft"},
        {"name": "Ben", "status": "inactive", "note": "review"},
      ]);
      expect(doc.columns[1].type, isNull);
      expect(doc.columns[2].type, isNull);
    });

    test("supports shared block comment conformance fixture", () {
      final doc = Mrtd.parseFile(fixturePath("conformance/mrtd/block-comments.mrtd"));

      expect(doc.records, [
        {"name": "Ada", "status": "active", "note": "draft"},
        {"name": "Ben", "status": "inactive", "note": "review"},
      ]);
    });

    test("supports suffixes without a profile", () {
      final doc = Mrtd.parseString(
        '''
        when bonus:float
        "2026-04-11"dt 3k
        ''',
      );

      expect(doc.rows.single.cells[0], DateTime.parse("2026-04-11"));
      expect(doc.rows.single.cells[1], 3000.0);
    });

    test("supports shared base suffix conformance fixture", () {
      final doc = Mrtd.parseFile(fixturePath("conformance/mrtd/base-suffixes.mrtd"));

      expect(doc.records.single["when"], DateTime.parse("2026-04-11"));
      expect(doc.records.single["bits"], 10);
      expect(doc.records.single["octal"], 15);
      expect(doc.records.single["mask"], 255);
      expect(doc.records.single["bonus"], 3000.0);
      expect(doc.records.single["scale"], 2000000.0);
      expect(doc.records.single["turn"], closeTo(3.141592653589793, 1e-12));
      expect(doc.records.single["angle"], closeTo(3.141592653589793, 1e-12));
      expect(doc.records.single["half"], closeTo(1.5707963267948966, 1e-12));
    });

    test("rejects unsupported types", () {
      expect(
        () => Mrtd.parseString("name:date\nAda"),
        throwsA(isA<MakrellFormatException>()),
      );
    });

    test("rejects row width mismatch", () {
      expect(
        () => Mrtd.parseString('''
          name:string age:int
          Ada
        '''),
        throwsA(isA<MakrellFormatException>()),
      );
    });

    test("rejects scalar type mismatch", () {
      expect(
        () => Mrtd.parseString('''
          age:int
          "Ada"
        '''),
        throwsA(isA<MakrellFormatException>()),
      );
    });

    test("writes records", () {
      final text = Mrtd.writeRecords([
        {"name": "Ada", "age": 32, "active": true},
        {"name": "Ben", "age": 41, "active": false},
      ]);

      expect(text, "name:string age:int active:bool\nAda 32 true\nBen 41 false");
    });

    test("writes tuples with inferred headers", () {
      final text = Mrtd.writeTuples([
        ["Ada", 32, true],
        ["Ben", 41, false],
      ]);

      expect(text, "c1:string c2:int c3:bool\nAda 32 true\nBen 41 false");
    });

    test("writeString accepts document, record rows, and tuple rows", () {
      final document = Mrtd.parseString('''
        name:string age:int
        Ada 32
      ''');

      expect(Mrtd.writeString(document), "name:string age:int\nAda 32");
      expect(
        Mrtd.writeString([
          {"name": "Ada", "age": 32},
        ]),
        "name:string age:int\nAda 32",
      );
      expect(
        Mrtd.writeString([
          ["Ada", 32],
        ]),
        "c1:string c2:int\nAda 32",
      );
    });

    test("writeString rejects unsupported values", () {
      expect(
        () => Mrtd.writeString("nope"),
        throwsA(isA<MakrellFormatException>()),
      );
    });

    test("rejects hyphenated barewords", () {
      expect(
        () => Mrtd.parseFile(fixturePath("conformance/mrtd/hyphenated-bareword.invalid.mrtd")),
        throwsA(isA<MakrellFormatException>()),
      );
    });
  });
}
