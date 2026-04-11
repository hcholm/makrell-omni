package dev.makrell.formats;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public final class BasicSuffixProfile {
    private BasicSuffixProfile() {
    }

    public static Object applyString(String value, String suffix) {
        switch (suffix) {
            case "":
                return value;
            case "dt":
                return tryParseDateTime(value);
            case "bin":
                return Integer.parseInt(value, 2);
            case "oct":
                return Integer.parseInt(value, 8);
            case "hex":
                return Integer.parseInt(value, 16);
            default:
                throw new MakrellFormatException("Unsupported basic suffix profile string suffix '" + suffix + "'.");
        }
    }

    public static Object applyNumber(String value, String suffix) {
        if (suffix.isEmpty()) {
            if (value.contains(".") || value.contains("e") || value.contains("E")) {
                return Double.parseDouble(value);
            }
            try {
                return Integer.parseInt(value);
            } catch (NumberFormatException ex) {
                return Long.parseLong(value);
            }
        }

        if (value.matches("-?\\d+")) {
            return applyIntegerSuffix(Long.parseLong(value), suffix);
        }
        if (value.matches("-?\\d+(\\.\\d+)?([eE][-+]?\\d+)?")) {
            return applyFloatSuffix(Double.parseDouble(value), suffix);
        }
        throw new MakrellFormatException("Invalid numeric literal '" + value + "'.");
    }

    public static NumericLiteralParts splitNumericLiteralSuffix(String text) {
        for (int boundary = text.length(); boundary > 0; boundary--) {
            String value = text.substring(0, boundary);
            String suffix = text.substring(boundary);
            if (!suffix.isEmpty() && !suffix.matches("[A-Za-z_][A-Za-z0-9_]*")) {
                continue;
            }
            if (value.matches("-?\\d+") || value.matches("-?\\d+(\\.\\d+)?([eE][-+]?\\d+)?")) {
                return new NumericLiteralParts(value, suffix);
            }
        }
        return null;
    }

    public static final class NumericLiteralParts {
        private final String value;
        private final String suffix;

        public NumericLiteralParts(String value, String suffix) {
            this.value = value;
            this.suffix = suffix;
        }

        public String getValue() {
            return value;
        }

        public String getSuffix() {
            return suffix;
        }
    }

    private static Object applyIntegerSuffix(long value, String suffix) {
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
            default:
                return applyFloatSuffix((double) value, suffix);
        }
    }

    private static Object applyFloatSuffix(double value, String suffix) {
        switch (suffix) {
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
                throw new MakrellFormatException("Unsupported basic suffix profile numeric suffix '" + suffix + "'.");
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
}
