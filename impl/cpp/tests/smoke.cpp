#include "makrell_formats.hpp"

#include <cassert>
#include <fstream>
#include <filesystem>
#include <iostream>

using namespace makrell::formats;

static std::string fixture(const std::string& group, const std::string& file) {
    auto rootStyle = std::filesystem::path("shared") / "format-fixtures" / group / file;
    if (std::filesystem::exists(rootStyle)) return rootStyle.string();
    return (std::filesystem::path("..") / ".." / "shared" / "format-fixtures" / group / file).string();
}

static std::string read_fixture(const std::string& group, const std::string& file) {
    std::ifstream input(fixture(group, file));
    std::ostringstream buffer;
    buffer << input.rdbuf();
    return buffer.str();
}

int main() {
    auto mron = parse_mron_file(fixture("mron", "sample.mron"));
    auto object = std::get<MronObject>(mron.value);
    assert(std::get<std::string>(object["name"].value) == "Makrell");
    assert(std::get<bool>(object["stable"].value) == false);

    auto iddoc = parse_mron_string("title Makrell tags [alpha beta gamma] nested { kind article status draft }");
    auto idobj = std::get<MronObject>(iddoc.value);
    assert(std::get<std::string>(idobj["title"].value) == "Makrell");

    auto block_comment_mron = parse_mron_string(read_fixture("conformance/mron", "block-comments.mron"));
    auto block_comment_obj = std::get<MronObject>(block_comment_mron.value);
    assert(std::get<std::string>(block_comment_obj["name"].value) == "Makrell");

    auto mrml = parse_mrml_file(fixture("mrml", "sample.mrml"));
    assert(mrml.name == "page");
    assert(mrml.attributes["lang"] == "en");
    assert(write_mrml_string(mrml) == "<page lang=\"en\"><title>Makrell</title><p>A small MRML fixture.</p></page>");

    auto mrtd = parse_mrtd_file(fixture("mrtd", "sample.mrtd"));
    assert(mrtd.columns.size() == 3);
    assert(std::get<std::string>(mrtd.records[0]["name"]) == "Ada");

    auto idtable = parse_mrtd_string("name:string status note\nAda active draft\nBen inactive review");
    assert(std::get<std::string>(idtable.records[0]["status"]) == "active");
    assert(std::get<std::string>(idtable.records[1]["note"]) == "review");

    auto block_comment_mrtd = parse_mrtd_string(read_fixture("conformance/mrtd", "block-comments.mrtd"));
    assert(std::get<std::string>(block_comment_mrtd.records[0]["status"]) == "active");
    assert(std::get<std::string>(block_comment_mrtd.records[1]["note"]) == "review");

    auto suffix_value = apply_basic_suffix_profile("string", "2026-04-11", "dt");
    assert((std::get<BasicSuffixTaggedString>(suffix_value.value) == BasicSuffixTaggedString{"2026-04-11", "dt"}));
    assert(std::get<long long>(apply_basic_suffix_profile("number", "3", "k").value) == 3000);
    auto split = split_numeric_literal_suffix("0.5tau");
    assert(split.first == "0.5" && split.second == "tau");

    auto suffix_mron = parse_mron_string(read_fixture("conformance/mron", "base-suffixes.mron"));
    auto suffix_obj = std::get<MronObject>(suffix_mron.value);
    assert((std::get<BasicSuffixTaggedString>(suffix_obj["when"].value) == BasicSuffixTaggedString{"2026-04-11", "dt"}));
    assert(std::get<long long>(suffix_obj["bits"].value) == 10);
    assert(std::get<long long>(suffix_obj["octal"].value) == 15);
    assert(std::get<long long>(suffix_obj["mask"].value) == 255);
    assert(std::get<long long>(suffix_obj["bonus"].value) == 3000);
    assert(std::get<long long>(suffix_obj["scale"].value) == 2000000);

    auto suffix_table = parse_mrtd_string(read_fixture("conformance/mrtd", "base-suffixes.mrtd"));
    assert((std::get<BasicSuffixTaggedString>(suffix_table.records[0]["when"]) == BasicSuffixTaggedString{"2026-04-11", "dt"}));
    assert(std::get<long long>(suffix_table.records[0]["bits"]) == 10);
    assert(std::get<long long>(suffix_table.records[0]["octal"]) == 15);
    assert(std::get<long long>(suffix_table.records[0]["mask"]) == 255);
    assert(std::get<long long>(suffix_table.records[0]["bonus"]) == 3000);
    assert(std::get<long long>(suffix_table.records[0]["scale"]) == 2000000);

    MrtdDocument doc{
        {{"name", "string"}, {"age", "int"}, {"active", "bool"}},
        {{MrtdCell{"Ada"}, MrtdCell{42LL}, MrtdCell{true}}},
        {}
    };
    assert(write_mrtd_string(doc) == "name:string age:int active:bool\nAda 42 true");

    std::cout << "C++ smoke tests passed.\n";
}
