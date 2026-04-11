package dev.makrell.formats;

public final class MrtdColumn {
    private final String name;
    private final String type;

    public MrtdColumn(String name, String type) {
        this.name = name;
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }
}
