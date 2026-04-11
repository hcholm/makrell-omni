package dev.makrell.formats.internal;

import dev.makrell.formats.MakrellFormatException;

import java.util.ArrayList;
import java.util.List;

public final class MiniMbf {
    private MiniMbf() {
    }

    public static List<Node> parse(String source) {
        return new Parser(source).parseRoots();
    }

    public static final class Node {
        public final String kind;
        public final String text;
        public final boolean quoted;
        public final List<Node> children;

        private Node(String kind, String text, boolean quoted, List<Node> children) {
            this.kind = kind;
            this.text = text;
            this.quoted = quoted;
            this.children = children;
        }

        public static Node scalar(String text, boolean quoted) {
            return new Node("scalar", text, quoted, null);
        }

        public static Node group(String kind, List<Node> children) {
            return new Node(kind, null, false, children);
        }
    }

    private static final class Parser {
        private final List<Token> tokens;
        private int index;

        private Parser(String source) {
            this.tokens = tokenize(source);
            this.index = 0;
        }

        private List<Node> parseRoots() {
            List<Node> nodes = new ArrayList<>();
            while (!isAtEnd()) {
                nodes.add(parseNode());
            }
            return nodes;
        }

        private Node parseNode() {
            Token token = next();
            switch (token.kind) {
                case "scalar":
                case "=":
                    return Node.scalar(token.text, token.quoted);
                case "{":
                    return Node.group("brace", parseGroup("}"));
                case "[":
                    return Node.group("square", parseGroup("]"));
                case "(":
                    return Node.group("paren", parseGroup(")"));
                default:
                    throw new MakrellFormatException("Unexpected token: " + token.text);
            }
        }

        private List<Node> parseGroup(String closingKind) {
            List<Node> items = new ArrayList<>();
            while (!isAtEnd() && !peek().kind.equals(closingKind)) {
                items.add(parseNode());
            }
            if (isAtEnd()) {
                throw new MakrellFormatException("Unclosed group, expected " + closingKind);
            }
            next();
            return items;
        }

        private boolean isAtEnd() {
            return index >= tokens.size();
        }

        private Token peek() {
            return tokens.get(index);
        }

        private Token next() {
            return tokens.get(index++);
        }
    }

    private static List<Token> tokenize(String source) {
        List<Token> tokens = new ArrayList<>();
        int i = 0;
        while (i < source.length()) {
            char ch = source.charAt(i);
            if (Character.isWhitespace(ch) || ch == ',') {
                i++;
                continue;
            }
            if (ch == '#') {
                while (i < source.length() && source.charAt(i) != '\n') {
                    i++;
                }
                continue;
            }
            if (ch == '/' && i + 1 < source.length() && source.charAt(i + 1) == '/') {
                i += 2;
                while (i < source.length() && source.charAt(i) != '\n') {
                    i++;
                }
                continue;
            }
            if (ch == '-' && i + 1 < source.length() && Character.isDigit(source.charAt(i + 1))) {
                int start = i++;
                while (i < source.length()) {
                    char c = source.charAt(i);
                    if (Character.isWhitespace(c) || c == ',' || c == '#' || "{}[]()=\"".indexOf(c) >= 0) {
                        break;
                    }
                    if (c == '/' && i + 1 < source.length() && source.charAt(i + 1) == '/') {
                        break;
                    }
                    i++;
                }
                tokens.add(new Token("scalar", source.substring(start, i), false));
                continue;
            }
            if (ch == '-') {
                tokens.add(new Token("-", "-", false));
                i++;
                continue;
            }
            if ("{}[]()=".indexOf(ch) >= 0) {
                tokens.add(new Token(String.valueOf(ch), String.valueOf(ch), false));
                i++;
                continue;
            }
            if (ch == '"') {
                StringBuilder builder = new StringBuilder();
                i++;
                boolean escaping = false;
                while (i < source.length()) {
                    char c = source.charAt(i++);
                    if (escaping) {
                        switch (c) {
                            case 'n':
                                builder.append('\n');
                                break;
                            case 'r':
                                builder.append('\r');
                                break;
                            case 't':
                                builder.append('\t');
                                break;
                            case '"':
                            case '\\':
                                builder.append(c);
                                break;
                            default:
                                builder.append(c);
                                break;
                        }
                        escaping = false;
                        continue;
                    }
                    if (c == '\\') {
                        escaping = true;
                        continue;
                    }
                    if (c == '"') {
                        break;
                    }
                    builder.append(c);
                }
                tokens.add(new Token("scalar", builder.toString(), true));
                continue;
            }
            int start = i;
            while (i < source.length()) {
                char c = source.charAt(i);
                if (Character.isWhitespace(c) || c == ',' || c == '#' || "{}[]()=\"".indexOf(c) >= 0) {
                    break;
                }
                if (c == '/' && i + 1 < source.length() && source.charAt(i + 1) == '/') {
                    break;
                }
                i++;
            }
            tokens.add(new Token("scalar", source.substring(start, i), false));
        }
        return tokens;
    }

    private static final class Token {
        private final String kind;
        private final String text;
        private final boolean quoted;

        private Token(String kind, String text, boolean quoted) {
            this.kind = kind;
            this.text = text;
            this.quoted = quoted;
        }
    }
}
