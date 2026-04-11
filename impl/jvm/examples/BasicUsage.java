package dev.makrell.formats.examples;

import dev.makrell.formats.Mron;

import java.util.Map;

public final class BasicUsage {
    public static void main(String[] args) {
        @SuppressWarnings("unchecked")
        Map<String, Object> doc = (Map<String, Object>) Mron.parseString(
            "name Makrell features [comments \"trailing-commas\" \"typed-scalars\"] stable false"
        );

        System.out.println(doc.get("name"));
        System.out.println(doc.get("features"));
        System.out.println(Mron.writeString(doc));
    }
}
