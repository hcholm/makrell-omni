package dev.makrell.formats;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
            fixturePath("mron", "sample.mron").toString()
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
        MrtdDocument doc = Mrtd.parseString(
            "name:string status note\nAda active draft\nBen inactive review"
        );

        assertEquals(3, doc.getColumns().size());
        assertEquals(
            List.of(
                Map.of("name", "Ada", "status", "active", "note", "draft"),
                Map.of("name", "Ben", "status", "inactive", "note", "review")
            ),
            doc.getRecords()
        );
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

    private static Path fixturePath(String group, String file) {
        Path rootStyle = Paths.get("shared", "format-fixtures", group, file);
        if (Files.exists(rootStyle)) {
            return rootStyle;
        }
        Path projectStyle = Paths.get("..", "..", "shared", "format-fixtures", group, file).normalize();
        if (Files.exists(projectStyle)) {
            return projectStyle;
        }
        throw new IllegalStateException("Could not locate shared fixture: " + group + "/" + file);
    }

    @Test
    void hyphenatedBarewordsAreRejected() {
        assertThrows(MakrellFormatException.class, () -> Mron.parseString("name trailing-commas"));
        assertThrows(MakrellFormatException.class, () -> Mrtd.parseString("name:string\ntrailing-commas"));
    }
}
