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
            return convertScalar(node.text, node.quoted, node.suffix);
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

    private static Object convertScalar(String text, boolean quoted, String suffix) {
        if (quoted) {
            switch (suffix) {
                case "":
                    return text;
                case "dt":
                    return tryParseDateTime(text);
                case "bin":
                    return Integer.parseInt(text, 2);
                case "oct":
                    return Integer.parseInt(text, 8);
                case "hex":
                    return Integer.parseInt(text, 16);
                default:
                    throw new MakrellFormatException("Unsupported MRON string suffix '" + suffix + "'.");
            }
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
        String numericSuffix = "";
        String numericBody = text;
        int suffixStart = text.length();
        while (suffixStart > 0) {
            char current = text.charAt(suffixStart - 1);
            if (!Character.isLetter(current) && current != '_') {
                break;
            }
            suffixStart -= 1;
        }
        if (suffixStart < text.length() && suffixStart > 0 && Character.isDigit(text.charAt(suffixStart - 1))) {
            numericSuffix = text.substring(suffixStart);
            numericBody = text.substring(0, suffixStart);
        }

        if (numericBody.matches("-?\\d+")) {
            try {
                return convertIntegerWithSuffix(Integer.parseInt(numericBody), numericSuffix);
            } catch (NumberFormatException ex) {
                return convertIntegerWithSuffix(Long.parseLong(numericBody), numericSuffix);
            }
        }
        if (numericBody.matches("-?\\d+(\\.\\d+)?([eE][-+]?\\d+)?")) {
            return convertFloatWithSuffix(Double.parseDouble(numericBody), numericSuffix);
        }
        return text;
    }

    private static Object convertIntegerWithSuffix(long value, String suffix) {
        switch (suffix) {
            case "":
                return value;
            case "k":
                return value * 1_000L;
            case "M":
                return value * 1_000_000L;
            case "G":
                return value * 1_000_000_000L;
            case "T":
                return value * 1_000_000_000_000L;
            case "P":
                return value * 1_000_000_000_000_000L;
            case "E":
                return value * 1_000_000_000_000_000_000L;
            case "e":
                return Math.E * value;
            case "tau":
                return Math.PI * 2d * value;
            case "deg":
                return Math.PI * value / 180d;
            case "pi":
                return Math.PI * value;
            default:
                throw new MakrellFormatException("Unsupported MRON number suffix '" + suffix + "'.");
        }
    }

    private static Object convertFloatWithSuffix(double value, String suffix) {
        switch (suffix) {
            case "":
                return value;
            case "k":
                return value * 1_000d;
            case "M":
                return value * 1_000_000d;
            case "G":
                return value * 1_000_000_000d;
            case "T":
                return value * 1_000_000_000_000d;
            case "P":
                return value * 1_000_000_000_000_000d;
            case "E":
                return value * 1_000_000_000_000_000_000d;
            case "e":
                return Math.E * value;
            case "tau":
                return Math.PI * 2d * value;
            case "deg":
                return Math.PI * value / 180d;
            case "pi":
                return Math.PI * value;
            default:
                throw new MakrellFormatException("Unsupported MRON number suffix '" + suffix + "'.");
        }
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
        return value.matches("[A-Za-z_][A-Za-z0-9_]*");
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
