package dev.makrell.formats;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class MrmlElement {
    private final String name;
    private final Map<String, String> attributes;
    private final List<Object> children;

    public MrmlElement(String name) {
        this(name, new LinkedHashMap<>(), new ArrayList<>());
    }

    public MrmlElement(String name, Map<String, String> attributes, List<Object> children) {
        this.name = name;
        this.attributes = new LinkedHashMap<>(attributes);
        this.children = new ArrayList<>(children);
    }

    public String getName() {
        return name;
    }

    public Map<String, String> getAttributes() {
        return new LinkedHashMap<>(attributes);
    }

    public List<Object> getChildren() {
        return new ArrayList<>(children);
    }
}
