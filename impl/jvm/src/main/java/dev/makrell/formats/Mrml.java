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

public final class Mrml {
    private Mrml() {
    }

    public static MrmlElement parseString(String source) {
        return parseString(source, false);
    }

    public static MrmlElement parseFile(String path) {
        try {
            return parseString(Files.readString(Paths.get(path), StandardCharsets.UTF_8));
        } catch (IOException ex) {
            throw new MakrellFormatException("Could not read MRML file: " + path);
        }
    }

    public static String writeString(MrmlElement value) {
        return writeElement(value);
    }

    public static MrmlElement parseString(String source, boolean allowExec) {
        if (allowExec && source.contains("{$")) {
            throw new MakrellFormatException("Executable embeds are not supported in the JVM track yet.");
        }
        List<MiniMbf.Node> roots = MiniMbf.parse(source);
        if (roots.size() != 1 || !"brace".equals(roots.get(0).kind)) {
            throw new MakrellFormatException("MRML expects exactly one root element.");
        }
        return parseElement(roots.get(0));
    }

    private static MrmlElement parseElement(MiniMbf.Node node) {
        if (!"brace".equals(node.kind) || node.children.isEmpty()) {
            throw new MakrellFormatException("Invalid MRML element.");
        }
        MiniMbf.Node head = node.children.get(0);
        if (!"scalar".equals(head.kind)) {
            throw new MakrellFormatException("MRML element name must be a scalar.");
        }
        String name = head.text;
        LinkedHashMap<String, String> attributes = new LinkedHashMap<>();
        List<Object> children = new ArrayList<>();
        int index = 1;
        if (index < node.children.size() && "square".equals(node.children.get(index).kind)) {
            parseAttributes(node.children.get(index), attributes);
            index++;
        }
        for (; index < node.children.size(); index++) {
            MiniMbf.Node child = node.children.get(index);
            if ("brace".equals(child.kind)) {
                children.add(parseElement(child));
            } else if ("scalar".equals(child.kind)) {
                children.add(child.text);
            } else {
                throw new MakrellFormatException("Unsupported MRML child node kind: " + child.kind);
            }
        }
        return new MrmlElement(name, attributes, children);
    }

    private static void parseAttributes(MiniMbf.Node node, LinkedHashMap<String, String> attributes) {
        int index = 0;
        while (index < node.children.size()) {
            MiniMbf.Node key = node.children.get(index++);
            if (index >= node.children.size() || !"scalar".equals(key.kind)) {
                throw new MakrellFormatException("Invalid MRML attribute list.");
            }
            if ("scalar".equals(node.children.get(index).kind) && "=".equals(node.children.get(index).text)) {
                index++;
            }
            if (index >= node.children.size()) {
                throw new MakrellFormatException("Missing MRML attribute value.");
            }
            MiniMbf.Node value = node.children.get(index++);
            if (!"scalar".equals(value.kind)) {
                throw new MakrellFormatException("MRML attribute values must be scalar.");
            }
            attributes.put(key.text, value.text);
        }
    }

    private static String writeElement(MrmlElement element) {
        StringBuilder builder = new StringBuilder();
        builder.append("<").append(element.getName());
        for (Map.Entry<String, String> entry : element.getAttributes().entrySet()) {
            builder.append(" ")
                .append(entry.getKey())
                .append("=\"")
                .append(escape(entry.getValue()))
                .append("\"");
        }
        List<Object> children = element.getChildren();
        if (children.isEmpty()) {
            builder.append("/>");
            return builder.toString();
        }
        builder.append(">");
        for (Object child : children) {
            if (child instanceof MrmlElement) {
                builder.append(writeElement((MrmlElement) child));
            } else {
                builder.append(escape(String.valueOf(child)));
            }
        }
        builder.append("</").append(element.getName()).append(">");
        return builder.toString();
    }

    private static String escape(String value) {
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }
}
