package dev.makrell.formats;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class MrtdDocument {
    private final List<MrtdColumn> columns;
    private final List<MrtdRow> rows;
    private final List<Map<String, Object>> records;

    public MrtdDocument(List<MrtdColumn> columns, List<MrtdRow> rows, List<Map<String, Object>> records) {
        this.columns = new ArrayList<>(columns);
        this.rows = new ArrayList<>(rows);
        this.records = new ArrayList<>();
        for (Map<String, Object> record : records) {
            this.records.add(new LinkedHashMap<>(record));
        }
    }

    public List<MrtdColumn> getColumns() {
        return new ArrayList<>(columns);
    }

    public List<MrtdRow> getRows() {
        return new ArrayList<>(rows);
    }

    public List<Map<String, Object>> getRecords() {
        List<Map<String, Object>> copy = new ArrayList<>();
        for (Map<String, Object> record : records) {
            copy.add(new LinkedHashMap<>(record));
        }
        return copy;
    }
}
