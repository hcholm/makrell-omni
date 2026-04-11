#include "makrell_formats.hpp"

#include <cassert>
#include <filesystem>
#include <iostream>

using namespace makrell::formats;

static std::string fixture(const std::string& group, const std::string& file) {
    auto rootStyle = std::filesystem::path("shared") / "format-fixtures" / group / file;
    if (std::filesystem::exists(rootStyle)) return rootStyle.string();
    return (std::filesystem::path("..") / ".." / "shared" / "format-fixtures" / group / file).string();
}

int main() {
    auto mron = parse_mron_file(fixture("mron", "sample.mron"));
    auto object = std::get<MronObject>(mron.value);
    assert(std::get<std::string>(object["name"].value) == "Makrell");
    assert(std::get<bool>(object["stable"].value) == false);

    auto iddoc = parse_mron_string("title Makrell tags [alpha beta gamma] nested { kind article status draft }");
    auto idobj = std::get<MronObject>(iddoc.value);
    assert(std::get<std::string>(idobj["title"].value) == "Makrell");

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

    MrtdDocument doc{
        {{"name", "string"}, {"age", "int"}, {"active", "bool"}},
        {{MrtdCell{"Ada"}, MrtdCell{42LL}, MrtdCell{true}}},
        {}
    };
    assert(write_mrtd_string(doc) == "name:string age:int active:bool\nAda 42 true");

    std::cout << "C++ smoke tests passed.\n";
}
