import "dart:io";

import "package:makrell_formats/makrell_formats.dart";
import "package:test/test.dart";

import "_test_paths.dart";

void main() {
  group("MRML", () {
    test("parses shared fixture", () {
      final source = File(fixturePath("mrml/sample.mrml")).readAsStringSync();
      final root = Mrml.parseString(source);

      expect(root.name, "page");
      expect(root.attributes, {"lang": "en"});
      expect((root.children[0] as MrmlElement).name, "title");
      expect((root.children[1] as MrmlElement).name, "p");
    });

    test("parseFile reads shared fixture", () {
      final root = Mrml.parseFile(fixturePath("mrml/sample.mrml"));
      expect(root.name, "page");
    });

    test("writes shared fixture shape to xml", () {
      final source = File(fixturePath("mrml/sample.mrml")).readAsStringSync();
      final expected = File(fixturePath("mrml/sample.expected.xml")).readAsStringSync().trim();

      expect(Mrml.writeString(Mrml.parseString(source)), expected);
    });

    test("parses attributes and mixed children", () {
      final root = Mrml.parseString('{a [b="2" c=3] hello {c d} "tail"}');

      expect(root.attributes, {"b": "2", "c": "3"});
      expect(root.children[0], "hello");
      expect((root.children[1] as MrmlElement).name, "c");
      expect(root.children[2], "tail");
    });

    test("escapes text and attributes on write", () {
      final xml = Mrml.writeString(
        MrmlElement(
          "a",
          attributes: const {"title": 'x & "y"'},
          children: const ["1 < 2 & 3"],
        ),
      );

      expect(xml, '<a title="x &amp; &quot;y&quot;">1 &lt; 2 &amp; 3</a>');
    });

    test("rejects multiple root elements", () {
      expect(
        () => Mrml.parseString("{a} {b}"),
        throwsA(isA<MakrellFormatException>()),
      );
    });

    test("rejects executable embeds for now", () {
      expect(
        () => Mrml.parseString('{a {\$ 2 + 3}}', allowExec: true),
        throwsA(isA<MakrellFormatException>()),
      );
    });
  });
}
