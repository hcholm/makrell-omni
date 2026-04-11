#include "makrell_formats.hpp"

#include <cctype>
#include <cmath>
#include <fstream>
#include <numbers>
#include <regex>
#include <sstream>
#include <stdexcept>

namespace makrell::formats {
namespace {

struct Token {
    std::string kind;
    std::string text;
    bool quoted = false;
    std::string suffix;
};

struct Node {
    std::string kind;
    std::string text;
    bool quoted = false;
    std::string suffix;
    std::vector<Node> children;
};

std::pair<std::string, std::string> split_numeric_literal_suffix_impl(const std::string& text);
MronValue apply_basic_suffix_profile_impl(const std::string& kind, const std::string& value, const std::string& suffix);

std::string read_file(const std::string& path) {
    std::ifstream in(path);
    if (!in) {
        throw std::runtime_error("Could not read file: " + path);
    }
    std::ostringstream buffer;
    buffer << in.rdbuf();
    return buffer.str();
}

std::vector<Token> tokenize(const std::string& source) {
    std::vector<Token> tokens;
    for (std::size_t i = 0; i < source.size();) {
        char ch = source[i];
        if (std::isspace(static_cast<unsigned char>(ch)) || ch == ',') {
            ++i;
            continue;
        }
        if (ch == '#') {
            while (i < source.size() && source[i] != '\n') {
                ++i;
            }
            continue;
        }
        if (ch == '/' && i + 1 < source.size() && source[i + 1] == '/') {
            i += 2;
            while (i < source.size() && source[i] != '\n') {
                ++i;
            }
            continue;
        }
        if (ch == '/' && i + 1 < source.size() && source[i + 1] == '*') {
            i += 2;
            while (i + 1 < source.size() && !(source[i] == '*' && source[i + 1] == '/')) {
                ++i;
            }
            if (i + 1 >= source.size()) {
                throw std::runtime_error("Unterminated block comment");
            }
            i += 2;
            continue;
        }
        if (ch == '-' && i + 1 < source.size() && std::isdigit(static_cast<unsigned char>(source[i + 1]))) {
            std::size_t start = i++;
            while (i < source.size()) {
                char c = source[i];
                if (std::isspace(static_cast<unsigned char>(c)) || c == ',' || c == '#' ||
                    std::string("{}[]()=\"").find(c) != std::string::npos) {
                    break;
                }
                if (c == '/' && i + 1 < source.size() && (source[i + 1] == '/' || source[i + 1] == '*')) {
                    break;
                }
                ++i;
            }
            std::string text = source.substr(start, i - start);
            auto [raw, suffix] = split_numeric_literal_suffix_impl(text);
            tokens.push_back(Token{"scalar", text, false, suffix});
            continue;
        }
        if (ch == '-') {
            tokens.push_back(Token{"-", "-", false, ""});
            ++i;
            continue;
        }
        if (std::string("{}[]()=").find(ch) != std::string::npos) {
            tokens.push_back(Token{std::string(1, ch), std::string(1, ch), false, ""});
            ++i;
            continue;
        }
        if (ch == '"') {
            ++i;
            std::string text;
            bool escaping = false;
            while (i < source.size()) {
                char c = source[i++];
                if (escaping) {
                    switch (c) {
                        case 'n': text.push_back('\n'); break;
                        case 'r': text.push_back('\r'); break;
                        case 't': text.push_back('\t'); break;
                        default: text.push_back(c); break;
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
                text.push_back(c);
            }
            std::size_t suffixStart = i;
            while (i < source.size() && (std::isalnum(static_cast<unsigned char>(source[i])) || source[i] == '_')) {
                ++i;
            }
            tokens.push_back(Token{"scalar", text, true, source.substr(suffixStart, i - suffixStart)});
            continue;
        }
        std::size_t start = i;
        while (i < source.size()) {
            char c = source[i];
            if (std::isspace(static_cast<unsigned char>(c)) || c == ',' || c == '#' ||
                std::string("{}[]()=\"-").find(c) != std::string::npos) {
                break;
            }
            if (c == '/' && i + 1 < source.size() && (source[i + 1] == '/' || source[i + 1] == '*')) {
                break;
            }
            ++i;
        }
        {
            std::string text = source.substr(start, i - start);
            auto [raw, suffix] = split_numeric_literal_suffix_impl(text);
            tokens.push_back(Token{"scalar", text, false, suffix});
        }
    }
    return tokens;
}

Node parse_node(const std::vector<Token>& tokens, std::size_t& index);

std::vector<Node> parse_group(const std::vector<Token>& tokens, std::size_t& index, const std::string& closing) {
    std::vector<Node> items;
    while (index < tokens.size() && tokens[index].kind != closing) {
        items.push_back(parse_node(tokens, index));
    }
    if (index >= tokens.size()) {
        throw std::runtime_error("Unclosed group");
    }
    ++index;
    return items;
}

Node parse_node(const std::vector<Token>& tokens, std::size_t& index) {
    const Token& token = tokens.at(index++);
    if (token.kind == "scalar" || token.kind == "=") {
        return Node{"scalar", token.text, token.quoted, token.suffix, {}};
    }
    if (token.kind == "{") {
        return Node{"brace", "", false, "", parse_group(tokens, index, "}")};
    }
    if (token.kind == "[") {
        return Node{"square", "", false, "", parse_group(tokens, index, "]")};
    }
    if (token.kind == "(") {
        return Node{"paren", "", false, "", parse_group(tokens, index, ")")};
    }
    throw std::runtime_error("Unexpected token: " + token.text);
}

std::vector<Node> parse_nodes(const std::string& source) {
    std::vector<Token> tokens = tokenize(source);
    std::vector<Node> nodes;
    std::size_t index = 0;
    while (index < tokens.size()) {
        nodes.push_back(parse_node(tokens, index));
    }
    return nodes;
}

std::pair<std::string, std::string> split_numeric_literal_suffix_impl(const std::string& text) {
    for (std::size_t boundary = text.size(); boundary > 0; --boundary) {
        std::string value = text.substr(0, boundary);
        std::string suffix = text.substr(boundary);
        if (!suffix.empty() && !std::regex_match(suffix, std::regex("[A-Za-z_][A-Za-z0-9_]*"))) {
            continue;
        }
        try {
            std::size_t pos = 0;
            std::stod(value, &pos);
            if (pos == value.size()) {
                return {value, suffix};
            }
        } catch (...) {
        }
    }
    return {"", ""};
}

MronValue apply_basic_suffix_profile_impl(const std::string& kind, const std::string& value, const std::string& suffix) {
    if (kind == "string") {
        if (suffix.empty()) return MronValue{std::string{value}};
        if (suffix == "dt") return MronValue{BasicSuffixTaggedString{value, suffix}};
        if (suffix == "bin") return MronValue{static_cast<long long>(std::stoll(value, nullptr, 2))};
        if (suffix == "oct") return MronValue{static_cast<long long>(std::stoll(value, nullptr, 8))};
        if (suffix == "hex") return MronValue{static_cast<long long>(std::stoll(value, nullptr, 16))};
        throw std::runtime_error("Unsupported basic suffix profile string suffix '" + suffix + "'.");
    }

    double base = std::stod(value);
    if (suffix.empty()) {
        if (value.find('.') == std::string::npos && value.find('e') == std::string::npos && value.find('E') == std::string::npos) {
            return MronValue{static_cast<long long>(std::stoll(value))};
        }
        return MronValue{base};
    }
    if (suffix == "k") base *= 1e3;
    else if (suffix == "M") base *= 1e6;
    else if (suffix == "G") base *= 1e9;
    else if (suffix == "T") base *= 1e12;
    else if (suffix == "P") base *= 1e15;
    else if (suffix == "E") base *= 1e18;
    else if (suffix == "e") base *= std::exp(1.0);
    else if (suffix == "tau") base *= (std::numbers::pi * 2.0);
    else if (suffix == "deg") base *= (std::numbers::pi / 180.0);
    else if (suffix == "pi") base *= std::numbers::pi;
    else throw std::runtime_error("Unsupported basic suffix profile numeric suffix '" + suffix + "'.");

    if (value.find('.') == std::string::npos && value.find('e') == std::string::npos && value.find('E') == std::string::npos &&
        suffix != "e" && suffix != "tau" && suffix != "deg" && suffix != "pi") {
        long long intValue = static_cast<long long>(base);
        if (base == static_cast<double>(intValue)) {
            return MronValue{intValue};
        }
    }
    return MronValue{base};
}

MronValue convert_scalar(const std::string& text, bool quoted, const std::string& suffix) {
    if (quoted) {
        return apply_basic_suffix_profile_impl("string", text, suffix);
    }
    if (text == "null") return MronValue{nullptr};
    if (text == "true") return MronValue{true};
    if (text == "false") return MronValue{false};
    auto [raw, numericSuffix] = split_numeric_literal_suffix_impl(text);
    if (!raw.empty()) {
        return apply_basic_suffix_profile_impl("number", raw, numericSuffix);
    }
    return MronValue{std::string{text}};
}

MronValue convert_mron_node(const Node& node);

MronObject convert_mron_pairs(const std::vector<Node>& nodes) {
    if (nodes.size() % 2 != 0) {
        throw std::runtime_error("Odd pair count in MRON object");
    }
    MronObject object;
    for (std::size_t i = 0; i < nodes.size(); i += 2) {
        MronValue key = convert_mron_node(nodes[i]);
        object[std::get<std::string>(MronValue{std::visit([](const auto& v) -> std::string {
            using T = std::decay_t<decltype(v)>;
            if constexpr (std::is_same_v<T, std::string>) return v;
            else if constexpr (std::is_same_v<T, BasicSuffixTaggedString>) return v.value;
            else if constexpr (std::is_same_v<T, bool>) return v ? "true" : "false";
            else if constexpr (std::is_same_v<T, std::nullptr_t>) return "null";
            else if constexpr (std::is_same_v<T, long long>) return std::to_string(v);
            else if constexpr (std::is_same_v<T, double>) return std::to_string(v);
            else return "[complex]";
        }, key.value) }.value)] = convert_mron_node(nodes[i + 1]);
    }
    return object;
}

MronValue convert_mron_node(const Node& node) {
    if (node.kind == "scalar") {
        return convert_scalar(node.text, node.quoted, node.suffix);
    }
    if (node.kind == "square") {
        MronArray items;
        for (const Node& child : node.children) {
            items.push_back(convert_mron_node(child));
        }
        return MronValue{items};
    }
    if (node.kind == "brace") {
        return MronValue{convert_mron_pairs(node.children)};
    }
    throw std::runtime_error("Unsupported MRON node kind");
}

std::string quote(const std::string& value) {
    std::string out = "\"";
    for (char ch : value) {
        if (ch == '\\' || ch == '"') {
            out.push_back('\\');
        }
        out.push_back(ch);
    }
    out.push_back('"');
    return out;
}

bool is_identifier_like(const std::string& value) {
    if (value.empty()) return false;
    char first = value.front();
    if (!(std::isalpha(static_cast<unsigned char>(first)) || first == '_')) return false;
    for (std::size_t i = 1; i < value.size(); ++i) {
        char ch = value[i];
        if (!(std::isalnum(static_cast<unsigned char>(ch)) || ch == '_')) return false;
    }
    return true;
}

std::string write_mron_value_inner(const MronValue& value) {
    return std::visit([](const auto& item) -> std::string {
        using T = std::decay_t<decltype(item)>;
        if constexpr (std::is_same_v<T, std::nullptr_t>) {
            return "null";
        } else if constexpr (std::is_same_v<T, bool>) {
            return item ? "true" : "false";
        } else if constexpr (std::is_same_v<T, long long>) {
            return std::to_string(item);
        } else if constexpr (std::is_same_v<T, double>) {
            std::ostringstream out;
            out << item;
            return out.str();
        } else if constexpr (std::is_same_v<T, std::string>) {
            return is_identifier_like(item) ? item : quote(item);
        } else if constexpr (std::is_same_v<T, BasicSuffixTaggedString>) {
            return (is_identifier_like(item.value) ? item.value : quote(item.value)) + item.suffix;
        } else if constexpr (std::is_same_v<T, MronArray>) {
            std::vector<std::string> parts;
            for (const auto& child : item) parts.push_back(write_mron_value_inner(child));
            std::ostringstream out;
            out << "[";
            for (std::size_t i = 0; i < parts.size(); ++i) {
                if (i) out << " ";
                out << parts[i];
            }
            out << "]";
            return out.str();
        } else {
            std::ostringstream out;
            out << "{ ";
            bool first = true;
            for (const auto& [key, child] : item) {
                if (!first) out << " ";
                first = false;
                out << (is_identifier_like(key) ? key : quote(key)) << " " << write_mron_value_inner(child);
            }
            out << " }";
            return out.str();
        }
    }, value.value);
}

MrmlElement parse_mrml_element(const Node& node) {
    if (node.kind != "brace" || node.children.empty() || node.children.front().kind != "scalar") {
        throw std::runtime_error("Invalid MRML element");
    }
    MrmlElement element;
    element.name = node.children.front().text;
    std::size_t index = 1;
    if (index < node.children.size() && node.children[index].kind == "square") {
        const auto& attrs = node.children[index].children;
        for (std::size_t i = 0; i < attrs.size();) {
            if (attrs[i].kind != "scalar") throw std::runtime_error("Invalid MRML attribute list");
            std::string key = attrs[i++].text;
            if (i < attrs.size() && attrs[i].kind == "scalar" && attrs[i].text == "=") ++i;
            if (i >= attrs.size() || attrs[i].kind != "scalar") throw std::runtime_error("Missing MRML attribute value");
            element.attributes[key] = attrs[i++].text;
        }
        ++index;
    }
    for (; index < node.children.size(); ++index) {
        const Node& child = node.children[index];
        if (child.kind == "brace") {
            element.children.push_back(parse_mrml_element(child));
        } else if (child.kind == "scalar") {
            element.children.push_back(child.text);
        } else {
            throw std::runtime_error("Unsupported MRML child node");
        }
    }
    return element;
}

std::string escape_xml(const std::string& value) {
    std::string out;
    for (char ch : value) {
        switch (ch) {
            case '&': out += "&amp;"; break;
            case '<': out += "&lt;"; break;
            case '>': out += "&gt;"; break;
            case '"': out += "&quot;"; break;
            default: out.push_back(ch); break;
        }
    }
    return out;
}

std::string write_mrml_element_inner(const MrmlElement& element) {
    std::ostringstream out;
    out << "<" << element.name;
    for (const auto& [key, value] : element.attributes) {
        out << " " << key << "=\"" << escape_xml(value) << "\"";
    }
    if (element.children.empty()) {
        out << "/>";
        return out.str();
    }
    out << ">";
    for (const auto& child : element.children) {
        if (std::holds_alternative<std::string>(child)) {
            out << escape_xml(std::get<std::string>(child));
        } else {
            out << write_mrml_element_inner(std::get<MrmlElement>(child));
        }
    }
    out << "</" << element.name << ">";
    return out.str();
}

MrtdCell convert_mrtd_cell(const Node& node, const std::string& type) {
    if (node.kind != "scalar") {
        throw std::runtime_error("MRTD cells must be scalar values");
    }
    MronValue scalar = convert_scalar(node.text, node.quoted, node.suffix);
    if (type.empty()) {
        return std::visit([](const auto& item) -> MrtdCell {
            using T = std::decay_t<decltype(item)>;
            if constexpr (std::is_same_v<T, std::string> || std::is_same_v<T, long long> || std::is_same_v<T, double> || std::is_same_v<T, bool> || std::is_same_v<T, BasicSuffixTaggedString>) {
                return item;
            } else {
                return std::string("null");
            }
        }, scalar.value);
    }
    if (type == "string") {
        return std::visit([](const auto& item) -> MrtdCell {
            using T = std::decay_t<decltype(item)>;
            if constexpr (std::is_same_v<T, std::string>) return item;
            else if constexpr (std::is_same_v<T, BasicSuffixTaggedString>) return item;
            else if constexpr (std::is_same_v<T, bool>) return item ? "true" : "false";
            else if constexpr (std::is_same_v<T, long long>) return std::to_string(item);
            else if constexpr (std::is_same_v<T, double>) { std::ostringstream out; out << item; return out.str(); }
            else return "null";
        }, scalar.value);
    }
    if (type == "int" && std::holds_alternative<long long>(scalar.value)) {
        return std::get<long long>(scalar.value);
    }
    if (type == "float") {
        if (std::holds_alternative<long long>(scalar.value)) return static_cast<double>(std::get<long long>(scalar.value));
        if (std::holds_alternative<double>(scalar.value)) return std::get<double>(scalar.value);
    }
    if (type == "bool" && std::holds_alternative<bool>(scalar.value)) {
        return std::get<bool>(scalar.value);
    }
    if (type != "string" && type != "int" && type != "float" && type != "bool") {
        throw std::runtime_error("Unsupported MRTD field type: " + type);
    }
    throw std::runtime_error("MRTD value does not match " + type + " field");
}

std::string write_mrtd_cell_inner(const MrtdCell& cell) {
    return std::visit([](const auto& item) -> std::string {
        using T = std::decay_t<decltype(item)>;
        if constexpr (std::is_same_v<T, std::string>) return is_identifier_like(item) ? item : quote(item);
        else if constexpr (std::is_same_v<T, BasicSuffixTaggedString>) return (is_identifier_like(item.value) ? item.value : quote(item.value)) + item.suffix;
        else if constexpr (std::is_same_v<T, bool>) return item ? "true" : "false";
        else if constexpr (std::is_same_v<T, long long>) return std::to_string(item);
        else { std::ostringstream out; out << item; return out.str(); }
    }, cell);
}

}  // namespace

std::pair<std::string, std::string> split_numeric_literal_suffix(const std::string& text) {
    return split_numeric_literal_suffix_impl(text);
}

MronValue apply_basic_suffix_profile(const std::string& kind, const std::string& value, const std::string& suffix) {
    return apply_basic_suffix_profile_impl(kind, value, suffix);
}

MronValue parse_mron_string(const std::string& source) {
    std::vector<Node> nodes = parse_nodes(source);
    if (nodes.empty()) return MronValue{nullptr};
    if (nodes.size() == 1) return convert_mron_node(nodes.front());
    if (nodes.size() % 2 != 0) {
        throw std::runtime_error("Illegal number (" + std::to_string(nodes.size()) + ") of root level expressions for MRON object");
    }
    return MronValue{convert_mron_pairs(nodes)};
}

MronValue parse_mron_file(const std::string& path) {
    return parse_mron_string(read_file(path));
}

std::string write_mron_string(const MronValue& value) {
    return write_mron_value_inner(value);
}

MrmlElement parse_mrml_string(const std::string& source) {
    std::vector<Node> nodes = parse_nodes(source);
    if (nodes.size() != 1 || nodes.front().kind != "brace") {
        throw std::runtime_error("MRML expects exactly one root element");
    }
    return parse_mrml_element(nodes.front());
}

MrmlElement parse_mrml_file(const std::string& path) {
    return parse_mrml_string(read_file(path));
}

std::string write_mrml_string(const MrmlElement& value) {
    return write_mrml_element_inner(value);
}

MrtdDocument parse_mrtd_string(const std::string& source) {
    std::vector<std::string> lines;
    std::istringstream input(source);
    std::string line;
    while (std::getline(input, line)) {
        line.erase(0, line.find_first_not_of(" \t\r"));
        line.erase(line.find_last_not_of(" \t\r") + 1);
        if (!line.empty() && line.front() != '#') {
            lines.push_back(line);
        }
    }
    MrtdDocument document;
    if (lines.empty()) return document;
    for (const auto& node : parse_nodes(lines.front())) {
        if (node.kind != "scalar") throw std::runtime_error("Invalid MRTD header field");
        std::size_t pos = node.text.find(':');
        document.columns.push_back(MrtdColumn{
            pos == std::string::npos ? node.text : node.text.substr(0, pos),
            pos == std::string::npos ? "" : node.text.substr(pos + 1)
        });
    }
    for (std::size_t i = 1; i < lines.size(); ++i) {
        std::string row_text = lines[i];
        if (row_text.size() >= 2 && row_text.front() == '(' && row_text.back() == ')') {
            row_text = row_text.substr(1, row_text.size() - 2);
        }
        auto cells = parse_nodes(row_text);
        if (cells.size() != document.columns.size()) {
            throw std::runtime_error("MRTD row width mismatch");
        }
        std::vector<MrtdCell> row;
        std::map<std::string, MrtdCell> record;
        for (std::size_t j = 0; j < document.columns.size(); ++j) {
            MrtdCell cell = convert_mrtd_cell(cells[j], document.columns[j].type);
            row.push_back(cell);
            record[document.columns[j].name] = cell;
        }
        document.rows.push_back(row);
        document.records.push_back(record);
    }
    return document;
}

MrtdDocument parse_mrtd_file(const std::string& path) {
    return parse_mrtd_string(read_file(path));
}

std::string write_mrtd_string(const MrtdDocument& value) {
    std::ostringstream out;
    for (std::size_t i = 0; i < value.columns.size(); ++i) {
        if (i) out << " ";
        out << (is_identifier_like(value.columns[i].name) ? value.columns[i].name : quote(value.columns[i].name));
        if (!value.columns[i].type.empty()) {
            out << ":" << value.columns[i].type;
        }
    }
    for (const auto& row : value.rows) {
        out << "\n";
        for (std::size_t i = 0; i < row.size(); ++i) {
            if (i) out << " ";
            out << write_mrtd_cell_inner(row[i]);
        }
    }
    return out.str();
}

}  // namespace makrell::formats
