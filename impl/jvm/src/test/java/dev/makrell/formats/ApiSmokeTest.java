package dev.makrell.formats;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

public final class ApiSmokeTest {
    @Test
    void mronParsesNestedStructuresAndIdentifiers() {
        @SuppressWarnings("unchecked")
        Map<String, Object> doc = (Map<String, Object>) Mron.parseString(
            "title Makrell tags [alpha beta gamma] nested { kind article status draft }"
        );

        assertEquals("Makrell", doc.get("title"));
        assertEquals(List.of("alpha", "beta", "gamma"), doc.get("tags"));
        assertEquals(Map.of("kind", "article", "status", "draft"), doc.get("nested"));
    }

    @Test
    void mronParsesSharedFixtureFromFile() {
        @SuppressWarnings("unchecked")
        Map<String, Object> doc = (Map<String, Object>) Mron.parseFile(
            fixturePath("mron/sample.mron").toString()
        );

        assertEquals("Makrell", doc.get("name"));
        assertEquals(Boolean.FALSE, doc.get("stable"));
    }

    @Test
    void mrmlParsesAndWritesFixtureShape() {
        MrmlElement root = Mrml.parseString("{page [lang=\"en\"] {title \"Makrell\"} {p \"A small MRML fixture.\"}}");

        assertEquals("page", root.getName());
        assertEquals(Map.of("lang", "en"), root.getAttributes());
        assertEquals("title", ((MrmlElement) root.getChildren().get(0)).getName());
        assertTrue(Mrml.writeString(root).contains("<page lang=\"en\">"));
    }

    @Test
    void mrtdParsesTypedRowsAndIdentifiers() {
        @SuppressWarnings("unchecked")
        Map<String, Object> conformanceMron = (Map<String, Object>) Mron.parseFile(
            fixturePath("conformance/mron/comments-and-identifiers.mron").toString()
        );
        assertEquals("Makrell", conformanceMron.get("name"));
        assertEquals(List.of("comments", "typed_scalars"), conformanceMron.get("features"));

        @SuppressWarnings("unchecked")
        Map<String, Object> blockCommentMron = (Map<String, Object>) Mron.parseFile(
            fixturePath("conformance/mron/block-comments.mron").toString()
        );
        assertEquals("Makrell", blockCommentMron.get("name"));
        assertEquals(List.of("comments", "typed_scalars"), blockCommentMron.get("features"));

        MrtdDocument doc = Mrtd.parseFile(
            fixturePath("conformance/mrtd/untyped-headers.mrtd").toString()
        );

        assertEquals(3, doc.getColumns().size());
        assertEquals(null, doc.getColumns().get(1).getType());
        assertEquals(null, doc.getColumns().get(2).getType());
        assertEquals(
            List.of(
                Map.of("name", "Ada", "status", "active", "note", "draft"),
                Map.of("name", "Ben", "status", "inactive", "note", "review")
            ),
            doc.getRecords()
        );

        MrtdDocument blockCommentMrtd = Mrtd.parseFile(
            fixturePath("conformance/mrtd/block-comments.mrtd").toString()
        );
        assertEquals(
            List.of(
                Map.of("name", "Ada", "status", "active", "note", "draft"),
                Map.of("name", "Ben", "status", "inactive", "note", "review")
            ),
            blockCommentMrtd.getRecords()
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> suffixMron = (Map<String, Object>) Mron.parseFile(
            fixturePath("conformance/mron/base-suffixes.mron").toString()
        );
        assertEquals("2026-04-11", suffixMron.get("when").toString());
        assertEquals(10, ((Number) suffixMron.get("bits")).intValue());
        assertEquals(15, ((Number) suffixMron.get("octal")).intValue());
        assertEquals(255, ((Number) suffixMron.get("mask")).intValue());
        assertEquals(3000, ((Number) suffixMron.get("bonus")).intValue());
        assertEquals(2_000_000, ((Number) suffixMron.get("scale")).intValue());
        assertEquals(Math.PI, (Double) suffixMron.get("turn"), 1e-12);
        assertEquals(Math.PI, (Double) suffixMron.get("angle"), 1e-12);
        assertEquals(Math.PI / 2d, (Double) suffixMron.get("half"), 1e-12);

        MrtdDocument suffixMrtd = Mrtd.parseFile(
            fixturePath("conformance/mrtd/base-suffixes.mrtd").toString()
        );
        assertEquals("2026-04-11", suffixMrtd.getRecords().get(0).get("when").toString());
        assertEquals(10, ((Number) suffixMrtd.getRecords().get(0).get("bits")).intValue());
        assertEquals(15, ((Number) suffixMrtd.getRecords().get(0).get("octal")).intValue());
        assertEquals(255, ((Number) suffixMrtd.getRecords().get(0).get("mask")).intValue());
        assertEquals(3000d, ((Number) suffixMrtd.getRecords().get(0).get("bonus")).doubleValue(), 1e-12);
        assertEquals(2_000_000d, ((Number) suffixMrtd.getRecords().get(0).get("scale")).doubleValue(), 1e-12);
        assertEquals(Math.PI, ((Number) suffixMrtd.getRecords().get(0).get("turn")).doubleValue(), 1e-12);
        assertEquals(Math.PI, ((Number) suffixMrtd.getRecords().get(0).get("angle")).doubleValue(), 1e-12);
        assertEquals(Math.PI / 2d, ((Number) suffixMrtd.getRecords().get(0).get("half")).doubleValue(), 1e-12);
    }

    @Test
    void basicSuffixProfileIsExposedAsDirectPostL1ConversionLayer() {
        assertEquals(LocalDate.parse("2026-04-11"), BasicSuffixProfile.applyString("2026-04-11", "dt"));
        assertEquals(3000L, ((Number) BasicSuffixProfile.applyNumber("3", "k")).longValue());

        BasicSuffixProfile.NumericLiteralParts parts = BasicSuffixProfile.splitNumericLiteralSuffix("0.5tau");
        assertEquals("0.5", parts.getValue());
        assertEquals("tau", parts.getSuffix());
    }

    @Test
    void mrtdWritesRecords() {
        LinkedHashMap<String, Object> ada = new LinkedHashMap<>();
        ada.put("name", "Ada");
        ada.put("age", 32);
        ada.put("active", true);

        LinkedHashMap<String, Object> ben = new LinkedHashMap<>();
        ben.put("name", "Ben");
        ben.put("age", 41);
        ben.put("active", false);

        List<Map<String, Object>> records = List.of(ada, ben);

        assertEquals(
            "name:string age:int active:bool\nAda 32 true\nBen 41 false",
            Mrtd.writeRecords(records)
        );
    }

    @Test
    void unsupportedTypesStillFailClearly() {
        MakrellFormatException ex = assertThrows(
            MakrellFormatException.class,
            () -> Mrtd.parseString("name:date\nAda")
        );
        assertTrue(ex.getMessage().contains("Unsupported MRTD field type"));
    }

    private static Path fixturePath(String relative) {
        Path rootStyle = Paths.get("shared", "format-fixtures", relative);
        if (Files.exists(rootStyle)) {
            return rootStyle;
        }
        Path projectStyle = Paths.get("..", "..", "shared", "format-fixtures", relative).normalize();
        if (Files.exists(projectStyle)) {
            return projectStyle;
        }
        throw new IllegalStateException("Could not locate shared fixture: " + relative);
    }

    @Test
    void hyphenatedBarewordsAreRejected() {
        assertThrows(
            MakrellFormatException.class,
            () -> Mron.parseFile(fixturePath("conformance/mron/hyphenated-bareword.invalid.mron").toString())
        );
        assertThrows(
            MakrellFormatException.class,
            () -> Mrtd.parseFile(fixturePath("conformance/mrtd/hyphenated-bareword.invalid.mrtd").toString())
        );
    }
}
