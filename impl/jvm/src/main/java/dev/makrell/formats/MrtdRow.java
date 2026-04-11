package dev.makrell.formats;

import java.util.ArrayList;
import java.util.List;

public final class MrtdRow {
    private final List<Object> cells;

    public MrtdRow(List<Object> cells) {
        this.cells = new ArrayList<>(cells);
    }

    public List<Object> getCells() {
        return new ArrayList<>(cells);
    }
}
