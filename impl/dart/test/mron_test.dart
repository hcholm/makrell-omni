import "dart:io";

import "package:makrell_formats/makrell_formats.dart";
import "package:test/test.dart";

import "_test_paths.dart";

void main() {
  group("MRON", () {
    test("parses shared fixture", () {
      final source = File(fixturePath("mron/sample.mron")).readAsStringSync();
      final doc = Mron.parseString(source) as Map<String, Object?>;

      expect(doc["name"], "Makrell");
      expect(doc["features"], ["comments", "trailing commas", "typed scalars"]);
      expect(doc["stable"], false);
    });

    test("parseFile reads shared fixture", () {
      final doc = Mron.parseFile(fixturePath("mron/sample.mron")) as Map<String, Object?>;
      expect(doc["name"], "Makrell");
    });

    test("parses nested object and array values", () {
      final doc = Mron.parseString('''
        a 2
        b [3 5 "7"]
        c { d 11 e 13.17 }
      ''') as Map<String, Object?>;

      expect(doc["a"], 2);
      expect(doc["b"], [3, 5, "7"]);
      expect(doc["c"], {"d": 11, "e": 13.17});
    });

    test("parses null, bool, and string root scalars", () {
      expect(Mron.parseString("null"), isNull);
      expect(Mron.parseString("true"), true);
      expect(Mron.parseString("Makrell"), "Makrell");
      expect(Mron.parseString('"Makrell"'), "Makrell");
    });

    test("treats identifiers as string values everywhere in MRON", () {
      final doc = Mron.parseFile(fixturePath("conformance/mron/comments-and-identifiers.mron")) as Map<String, Object?>;

      expect(doc["name"], "Makrell");
      expect(doc["features"], ["comments", "typed_scalars"]);
      expect(doc["stable"], false);
    });

    test("supports shared block comment conformance fixture", () {
      final doc = Mron.parseFile(fixturePath("conformance/mron/block-comments.mron")) as Map<String, Object?>;

      expect(doc["name"], "Makrell");
      expect(doc["features"], ["comments", "typed_scalars"]);
      expect(doc["stable"], false);
    });

    test("supports comments in object roots", () {
      final doc = Mron.parseString('''
        # comment
        name "Makrell"
        # another
        stable false
      ''') as Map<String, Object?>;

      expect(doc, {"name": "Makrell", "stable": false});
    });

    test("supports core suffixes directly", () {
      final doc = Mron.parseString(
        '''
        born "2026-04-11"dt
        size 3k
        ''',
      ) as Map<String, Object?>;

      expect(doc["born"], DateTime.parse("2026-04-11"));
      expect(doc["size"], 3000);
    });

    test("supports shared base suffix conformance fixture", () {
      final doc = Mron.parseFile(fixturePath("conformance/mron/base-suffixes.mron")) as Map<String, Object?>;

      expect(doc["when"], DateTime.parse("2026-04-11"));
      expect(doc["bits"], 10);
      expect(doc["octal"], 15);
      expect(doc["mask"], 255);
      expect(doc["bonus"], 3000);
      expect(doc["scale"], 2000000);
      expect(doc["turn"], closeTo(3.141592653589793, 1e-12));
      expect(doc["angle"], closeTo(3.141592653589793, 1e-12));
      expect(doc["half"], closeTo(1.5707963267948966, 1e-12));
    });

    test("basic suffix profile is exposed as a direct post-L1 conversion layer", () {
      expect(
        applyBasicSuffixProfile(const BasicSuffixLiteral(BasicSuffixLiteralKind.string, "2026-04-11", "dt")),
        DateTime.parse("2026-04-11"),
      );
      expect(
        applyBasicSuffixProfile(const BasicSuffixLiteral(BasicSuffixLiteralKind.number, "3", "k")),
        3000,
      );
    });

    test("rejects odd root cardinality", () {
      expect(
        () => Mron.parseString("2 3 5"),
        throwsA(
          isA<MakrellFormatException>().having(
            (ex) => ex.message,
            "message",
            contains("Illegal number (3) of root level expressions"),
          ),
        ),
      );
    });

    test("rejects odd nested object pair count", () {
      expect(
        () => Mron.parseString("a { b 2 c }"),
        throwsA(
          isA<MakrellFormatException>().having(
            (ex) => ex.message,
            "message",
            contains("Odd pair count"),
          ),
        ),
      );
    });

    test("rejects executable embeds for now", () {
      expect(
        () => Mron.parseString("a {\$ 2 + 3 }", allowExec: true),
        throwsA(isA<MakrellFormatException>()),
      );
    });

    test("writes nested structures", () {
      final text = Mron.writeString({
        "name": "Makrell",
        "features": ["comments", "typed"],
        "nested": {"enabled": true, "count": 2},
      });

      expect(text, contains("name Makrell"));
      expect(text, contains('features [comments typed]'));
      expect(text, contains("nested { enabled true count 2 }"));
    });

    test("rejects hyphenated barewords", () {
      expect(
        () => Mron.parseFile(fixturePath("conformance/mron/hyphenated-bareword.invalid.mron")),
        throwsA(isA<MakrellFormatException>()),
      );
    });
  });
}
