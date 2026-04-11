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

public final class Mrtd {
    private Mrtd() {
    }

    public static MrtdDocument parseString(String source) {
        return parseString(source, Set.of());
    }

    public static MrtdDocument parseFile(String path) {
        try {
            return parseString(Files.readString(Paths.get(path), StandardCharsets.UTF_8));
        } catch (IOException ex) {
            throw new MakrellFormatException("Could not read MRTD file: " + path);
        }
    }

    public static String writeString(Object value) {
        if (value instanceof MrtdDocument) {
            return writeDocument((MrtdDocument) value);
        }
        if (value instanceof List<?>) {
            List<?> list = (List<?>) value;
            if (list.isEmpty()) {
                return "";
            }
            if (list.get(0) instanceof Map<?, ?>) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> records = (List<Map<String, Object>>) value;
                return writeRecords(records);
            }
            if (list.get(0) instanceof List<?>) {
                @SuppressWarnings("unchecked")
                List<List<Object>> tuples = (List<List<Object>>) value;
                return writeTuples(tuples);
            }
        }
        throw new MakrellFormatException("Unsupported MRTD value for serialisation.");
    }

    public static MrtdDocument parseString(String source, Set<String> profiles) {
        List<String> logicalLines = new ArrayList<>();
        for (String rawLine : source.replace("\r\n", "\n").split("\n")) {
            String trimmed = rawLine.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            logicalLines.add(trimmed);
        }
        if (logicalLines.isEmpty()) {
            return new MrtdDocument(List.of(), List.of(), List.of());
        }

        List<MiniMbf.Node> headerNodes = MiniMbf.parse(logicalLines.get(0));
        List<MrtdColumn> columns = new ArrayList<>();
        for (MiniMbf.Node node : headerNodes) {
            if (!"scalar".equals(node.kind)) {
                throw new MakrellFormatException("Invalid MRTD header field.");
            }
            String[] parts = node.text.split(":", 2);
            columns.add(new MrtdColumn(parts[0], parts.length == 2 ? parts[1] : null));
        }

        List<MrtdRow> rows = new ArrayList<>();
        List<Map<String, Object>> records = new ArrayList<>();
        int lineIndex = 1;
        while (lineIndex < logicalLines.size()) {
            String line = logicalLines.get(lineIndex++);
            if (line.startsWith("(") && !line.endsWith(")")) {
                StringBuilder builder = new StringBuilder(line);
                while (lineIndex < logicalLines.size()) {
                    String next = logicalLines.get(lineIndex++);
                    builder.append(' ').append(next);
                    if (next.endsWith(")")) {
                        break;
                    }
                }
                line = builder.toString();
            }
            if (line.startsWith("(") && line.endsWith(")")) {
                line = line.substring(1, line.length() - 1).trim();
            }
            List<MiniMbf.Node> cells = MiniMbf.parse(line);
            if (cells.size() != columns.size()) {
                throw new MakrellFormatException("MRTD row width mismatch.");
            }
            List<Object> rowValues = new ArrayList<>();
            Map<String, Object> record = new LinkedHashMap<>();
            for (int i = 0; i < columns.size(); i++) {
                Object value = convertCell(cells.get(i), columns.get(i).getType(), profiles);
                rowValues.add(value);
                record.put(columns.get(i).getName(), value);
            }
            rows.add(new MrtdRow(rowValues));
            records.add(record);
        }
        return new MrtdDocument(columns, rows, records);
    }

    public static String writeRecords(List<Map<String, Object>> records) {
        if (records.isEmpty()) {
            return "";
        }
        List<String> names = new ArrayList<>(records.get(0).keySet());
        List<MrtdColumn> columns = new ArrayList<>();
        for (String name : names) {
            columns.add(new MrtdColumn(name, inferType(records.get(0).get(name))));
        }
        return writeRows(columns, recordsToRows(records, names));
    }

    public static String writeTuples(List<List<Object>> tuples) {
        if (tuples.isEmpty()) {
            return "";
        }
        List<MrtdColumn> columns = new ArrayList<>();
        List<Object> first = tuples.get(0);
        for (int i = 0; i < first.size(); i++) {
            columns.add(new MrtdColumn("c" + (i + 1), inferType(first.get(i))));
        }
        return writeRows(columns, tuples);
    }

    private static Object convertCell(MiniMbf.Node node, String type, Set<String> profiles) {
        if (!"scalar".equals(node.kind)) {
            throw new MakrellFormatException("MRTD cells must be scalar values.");
        }
        Object scalar = convertScalar(node.text, node.quoted, node.suffix);
        if (type == null) {
            return scalar;
        }
        String actualType = type;
        switch (actualType) {
            case "string":
                return String.valueOf(scalar);
            case "int":
                if (scalar instanceof Integer || scalar instanceof Long) {
                    return ((Number) scalar).intValue();
                }
                throw new MakrellFormatException("MRTD value does not match int field.");
            case "float":
                if (scalar instanceof Number) {
                    return ((Number) scalar).doubleValue();
                }
                throw new MakrellFormatException("MRTD value does not match float field.");
            case "bool":
                if (scalar instanceof Boolean) {
                    return scalar;
                }
                throw new MakrellFormatException("MRTD value does not match bool field.");
            default:
                throw new MakrellFormatException("Unsupported MRTD field type: " + actualType);
        }
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
                    throw new MakrellFormatException("Unsupported MRTD string suffix '" + suffix + "'.");
            }
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
            return convertIntegerWithSuffix(Long.parseLong(numericBody), numericSuffix);
        }
        if (numericBody.matches("-?\\d+(\\.\\d+)?([eE][-+]?\\d+)?")) {
            return convertFloatWithSuffix(Double.parseDouble(numericBody), numericSuffix);
        }
        return text;
    }

    private static List<List<Object>> recordsToRows(List<Map<String, Object>> records, List<String> names) {
        List<List<Object>> rows = new ArrayList<>();
        for (Map<String, Object> record : records) {
            List<Object> row = new ArrayList<>();
            for (String name : names) {
                row.add(record.get(name));
            }
            rows.add(row);
        }
        return rows;
    }

    private static String writeDocument(MrtdDocument document) {
        return writeRows(document.getColumns(), rowsFromDocument(document));
    }

    private static List<List<Object>> rowsFromDocument(MrtdDocument document) {
        List<List<Object>> rows = new ArrayList<>();
        for (MrtdRow row : document.getRows()) {
            rows.add(row.getCells());
        }
        return rows;
    }

    private static String writeRows(List<MrtdColumn> columns, List<List<Object>> rows) {
        List<String> lines = new ArrayList<>();
        List<String> header = new ArrayList<>();
        for (MrtdColumn column : columns) {
            header.add(column.getType() == null ? quoteName(column.getName()) : quoteName(column.getName()) + ":" + column.getType());
        }
        lines.add(String.join(" ", header));
        for (List<Object> row : rows) {
            List<String> cells = new ArrayList<>();
            for (Object value : row) {
                cells.add(writeCell(value));
            }
            lines.add(String.join(" ", cells));
        }
        return String.join("\n", lines);
    }

    private static String inferType(Object value) {
        if (value instanceof Boolean) {
            return "bool";
        }
        if (value instanceof Float || value instanceof Double) {
            return "float";
        }
        if (value instanceof Number) {
            return "int";
        }
        return "string";
    }

    private static String writeCell(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof LocalDate || value instanceof OffsetDateTime) {
            return "\"" + value + "\"dt";
        }
        if (value instanceof Boolean || value instanceof Number) {
            return String.valueOf(value);
        }
        String text = String.valueOf(value);
        return text.matches("[A-Za-z_][A-Za-z0-9_]*") ? text : "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
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
                throw new MakrellFormatException("Unsupported MRTD number suffix '" + suffix + "'.");
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
                throw new MakrellFormatException("Unsupported MRTD number suffix '" + suffix + "'.");
        }
    }

    private static String quoteName(String value) {
        return value.matches("[A-Za-z_][A-Za-z0-9_]*") ? value : "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
