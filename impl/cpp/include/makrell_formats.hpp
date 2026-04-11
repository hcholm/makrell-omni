#pragma once

#include <map>
#include <string>
#include <variant>
#include <vector>

namespace makrell::formats {

struct MronValue;
using MronArray = std::vector<MronValue>;
using MronObject = std::map<std::string, MronValue>;

struct BasicSuffixTaggedString {
    std::string value;
    std::string suffix;

    bool operator==(const BasicSuffixTaggedString& other) const = default;
};

struct MronValue {
    using Variant = std::variant<std::nullptr_t, bool, long long, double, std::string, BasicSuffixTaggedString, MronArray, MronObject>;
    Variant value;

    bool operator==(const MronValue& other) const = default;
};

struct MrmlElement;
using MrmlChild = std::variant<std::string, MrmlElement>;

struct MrmlElement {
    std::string name;
    std::map<std::string, std::string> attributes;
    std::vector<MrmlChild> children;

    bool operator==(const MrmlElement& other) const = default;
};

struct MrtdColumn {
    std::string name;
    std::string type;

    bool operator==(const MrtdColumn& other) const = default;
};

using MrtdCell = std::variant<std::string, long long, double, bool, BasicSuffixTaggedString>;

struct MrtdDocument {
    std::vector<MrtdColumn> columns;
    std::vector<std::vector<MrtdCell>> rows;
    std::vector<std::map<std::string, MrtdCell>> records;

    bool operator==(const MrtdDocument& other) const = default;
};

MronValue parse_mron_string(const std::string& source);
MronValue parse_mron_file(const std::string& path);
std::string write_mron_string(const MronValue& value);

MrmlElement parse_mrml_string(const std::string& source);
MrmlElement parse_mrml_file(const std::string& path);
std::string write_mrml_string(const MrmlElement& value);

MrtdDocument parse_mrtd_string(const std::string& source);
MrtdDocument parse_mrtd_file(const std::string& path);
std::string write_mrtd_string(const MrtdDocument& value);

MronValue apply_basic_suffix_profile(const std::string& kind, const std::string& value, const std::string& suffix);
std::pair<std::string, std::string> split_numeric_literal_suffix(const std::string& text);

}  // namespace makrell::formats
