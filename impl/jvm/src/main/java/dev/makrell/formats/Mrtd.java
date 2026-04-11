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

public final class Mrtd {
    public static final String EXTENDED_SCALARS_PROFILE = "extended-scalars";

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
            columns.add(new MrtdColumn(parts[0], parts.length == 2 ? parts[1] : "string"));
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
        Object scalar = convertScalar(node.text, node.quoted, profiles);
        switch (type) {
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
                throw new MakrellFormatException("Unsupported MRTD field type: " + type);
        }
    }

    private static Object convertScalar(String text, boolean quoted, Set<String> profiles) {
        if (quoted) {
            return text;
        }
        if ("true".equals(text)) {
            return Boolean.TRUE;
        }
        if ("false".equals(text)) {
            return Boolean.FALSE;
        }
        if (text.matches("-?\\d+")) {
            return Integer.valueOf(text);
        }
        if (text.matches("-?\\d+\\.\\d+")) {
            return Double.valueOf(text);
        }
        if (profiles.contains(EXTENDED_SCALARS_PROFILE) && text.matches("-?\\d+(\\.\\d+)?k")) {
            return Double.valueOf(text.substring(0, text.length() - 1)) * 1000.0;
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
            header.add(quoteName(column.getName()) + ":" + column.getType());
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
        if (value instanceof Boolean || value instanceof Number) {
            return String.valueOf(value);
        }
        String text = String.valueOf(value);
        return text.matches("[A-Za-z_][A-Za-z0-9_]*") ? text : "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static String quoteName(String value) {
        return value.matches("[A-Za-z_][A-Za-z0-9_]*") ? value : "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
