package dev.makrell.formats;

import dev.makrell.formats.internal.MiniMbf;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class Mron {
    private Mron() {
    }

    public static Object parseString(String source) {
        return parseString(source, Set.of(), false);
    }

    public static Object parseFile(String path) {
        try {
            return parseString(Files.readString(Paths.get(path), StandardCharsets.UTF_8));
        } catch (IOException ex) {
            throw new MakrellFormatException("Could not read MRON file: " + path);
        }
    }

    public static String writeString(Object value) {
        return writeValue(value);
    }

    public static Object parseString(String source, Set<String> profiles, boolean allowExec) {
        if (allowExec && source.contains("{$")) {
            throw new MakrellFormatException("Executable embeds are not supported in the JVM track yet.");
        }
        List<MiniMbf.Node> roots = MiniMbf.parse(source);
        if (roots.isEmpty()) {
            return null;
        }
        if (roots.size() == 1) {
            return convertNode(roots.get(0), profiles);
        }
        if (roots.size() % 2 != 0) {
            throw new MakrellFormatException("Illegal number (" + roots.size() + ") of root level expressions for MRON object.");
        }
        return convertPairs(roots, profiles);
    }

    private static Object convertNode(MiniMbf.Node node, Set<String> profiles) {
        if ("scalar".equals(node.kind)) {
            return convertScalar(node.text, node.quoted, profiles);
        }
        if ("square".equals(node.kind)) {
            List<Object> values = new ArrayList<>();
            for (MiniMbf.Node child : node.children) {
                values.add(convertNode(child, profiles));
            }
            return values;
        }
        if ("brace".equals(node.kind)) {
            return convertPairs(node.children, profiles);
        }
        throw new MakrellFormatException("Unsupported MRON node kind: " + node.kind);
    }

    private static Map<String, Object> convertPairs(List<MiniMbf.Node> nodes, Set<String> profiles) {
        if (nodes.size() % 2 != 0) {
            throw new MakrellFormatException("Odd pair count in MRON object.");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < nodes.size(); i += 2) {
            Object keyValue = convertNode(nodes.get(i), profiles);
            result.put(String.valueOf(keyValue), convertNode(nodes.get(i + 1), profiles));
        }
        return result;
    }

    private static Object convertScalar(String text, boolean quoted, Set<String> profiles) {
        if (quoted) {
            if (profiles.contains("extended-scalars") && text.endsWith("dt")) {
                return tryParseDateTime(text.substring(0, text.length() - 2));
            }
            return text;
        }
        if ("null".equals(text)) {
            return null;
        }
        if ("true".equals(text)) {
            return Boolean.TRUE;
        }
        if ("false".equals(text)) {
            return Boolean.FALSE;
        }
        if (text.matches("-?\\d+")) {
            try {
                return Integer.valueOf(text);
            } catch (NumberFormatException ex) {
                return Long.valueOf(text);
            }
        }
        if (text.matches("-?\\d+\\.\\d+")) {
            return Double.valueOf(text);
        }
        if (profiles.contains("extended-scalars") && text.matches("-?\\d+(\\.\\d+)?k")) {
            return Double.valueOf(text.substring(0, text.length() - 1)) * 1000.0;
        }
        return text;
    }

    private static Object tryParseDateTime(String text) {
        try {
            return OffsetDateTime.parse(text);
        } catch (RuntimeException ignored) {
        }
        try {
            return LocalDate.parse(text);
        } catch (RuntimeException ignored) {
        }
        return text;
    }

    private static String writeValue(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof Boolean || value instanceof Number) {
            return String.valueOf(value);
        }
        if (value instanceof String) {
            String text = (String) value;
            return isIdentifierLike(text) ? text : quote(text);
        }
        if (value instanceof Map<?, ?>) {
            List<String> parts = new ArrayList<>();
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
                parts.add(writeValue(String.valueOf(entry.getKey())));
                parts.add(writeValue(entry.getValue()));
            }
            return "{ " + String.join(" ", parts) + " }";
        }
        if (value instanceof List<?>) {
            List<String> parts = new ArrayList<>();
            for (Object item : (List<?>) value) {
                parts.add(writeValue(item));
            }
            return "[" + String.join(" ", parts) + "]";
        }
        throw new MakrellFormatException("Unsupported MRON value for serialisation: " + value.getClass().getName());
    }

    private static boolean isIdentifierLike(String value) {
        return value.matches("[A-Za-z_][A-Za-z0-9_\\-]*");
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
