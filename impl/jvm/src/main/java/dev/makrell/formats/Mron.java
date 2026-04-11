package dev.makrell.formats;

import dev.makrell.formats.internal.MiniMbf;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
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

    public static Object parseString(String source, boolean allowExec) {
        return parseString(source, Set.of(), allowExec);
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
            return convertNode(roots.get(0));
        }
        if (roots.size() % 2 != 0) {
            throw new MakrellFormatException("Illegal number (" + roots.size() + ") of root level expressions for MRON object.");
        }
        return convertPairs(roots);
    }

    private static Object convertNode(MiniMbf.Node node) {
        if ("scalar".equals(node.kind)) {
            return convertScalar(node.text, node.quoted, node.suffix);
        }
        if ("square".equals(node.kind)) {
            List<Object> values = new ArrayList<>();
            for (MiniMbf.Node child : node.children) {
                values.add(convertNode(child));
            }
            return values;
        }
        if ("brace".equals(node.kind)) {
            return convertPairs(node.children);
        }
        throw new MakrellFormatException("Unsupported MRON node kind: " + node.kind);
    }

    private static Map<String, Object> convertPairs(List<MiniMbf.Node> nodes) {
        if (nodes.size() % 2 != 0) {
            throw new MakrellFormatException("Odd pair count in MRON object.");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (int i = 0; i < nodes.size(); i += 2) {
            Object keyValue = convertNode(nodes.get(i));
            result.put(String.valueOf(keyValue), convertNode(nodes.get(i + 1)));
        }
        return result;
    }

    private static Object convertScalar(String text, boolean quoted, String suffix) {
        if (quoted) {
            return BasicSuffixProfile.applyString(text, suffix);
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
        BasicSuffixProfile.NumericLiteralParts numericLiteral = BasicSuffixProfile.splitNumericLiteralSuffix(text);
        if (numericLiteral != null && !numericLiteral.getSuffix().isEmpty()) {
            return BasicSuffixProfile.applyNumber(numericLiteral.getValue(), numericLiteral.getSuffix());
        }
        if (text.matches("-?\\d+")) {
            return BasicSuffixProfile.applyNumber(text, "");
        }
        if (text.matches("-?\\d+(\\.\\d+)?([eE][-+]?\\d+)?")) {
            return BasicSuffixProfile.applyNumber(text, "");
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
        return value.matches("[A-Za-z_][A-Za-z0-9_]*");
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
