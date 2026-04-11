$LOAD_PATH.unshift(File.expand_path("../lib", __dir__))
require "json"
require "makrell/formats"

def fixture(group, file)
  File.expand_path("../../../shared/format-fixtures/#{group}/#{file}", __dir__)
end

def read_fixture(group, file)
  File.read(fixture(group, file), encoding: "UTF-8")
end

raise "MBF profile missing level split" unless Makrell::Formats.mbf_support_profile[:implemented_levels] == [0, 1]

mron = Makrell::Formats.parse_mron_file(fixture("mron", "sample.mron"))
raise "MRON fixture name failed" unless mron["name"] == "Makrell"
raise "MRON fixture bool failed" unless mron["stable"] == false

mrml = Makrell::Formats.parse_mrml_file(fixture("mrml", "sample.mrml"))
expected_mrml = '<page lang="en"><title>Makrell</title><p>A small MRML fixture.</p></page>'
raise "MRML writer failed" unless Makrell::Formats.write_mrml_string(mrml) == expected_mrml

mrtd = Makrell::Formats.parse_mrtd_file(fixture("mrtd", "sample.mrtd"))
raise "MRTD fixture failed" unless mrtd[:records].first["name"] == "Ada"

conformance_mron = Makrell::Formats.parse_mron_string(read_fixture("conformance/mron", "comments-and-identifiers.mron"))
raise "Conformance MRON name failed" unless conformance_mron["name"] == "Makrell"
raise "Conformance MRON identifier array failed" unless conformance_mron["features"][1] == "typed_scalars"

block_comment_mron = Makrell::Formats.parse_mron_string(read_fixture("conformance/mron", "block-comments.mron"))
raise "Block-comment MRON name failed" unless block_comment_mron["name"] == "Makrell"
raise "Block-comment MRON identifier array failed" unless block_comment_mron["features"][1] == "typed_scalars"

negative_mron = Makrell::Formats.parse_mron_string(read_fixture("conformance/mron", "negative-numbers.mron"))
raise "Conformance MRON negative scalar failed" unless negative_mron["offset"] == -2
raise "Conformance MRON negative array failed" unless negative_mron["temps"][0] == -1

id_table = Makrell::Formats.parse_mrtd_string(read_fixture("conformance/mrtd", "untyped-headers.mrtd"))
raise "MRTD identifier values failed" unless id_table[:records].first["status"] == "active"
raise "MRTD untyped header should stay untyped" unless id_table[:columns][1][:type].nil? && id_table[:columns][2][:type].nil?

negative_table = Makrell::Formats.parse_mrtd_string(read_fixture("conformance/mrtd", "negative-numbers.mrtd"))
raise "Conformance MRTD negative int failed" unless negative_table[:records].first["delta"] == -2
raise "Conformance MRTD negative float failed" unless negative_table[:records].first["ratio"] == -3.5

block_comment_table = Makrell::Formats.parse_mrtd_string(read_fixture("conformance/mrtd", "block-comments.mrtd"))
raise "Block-comment MRTD first row failed" unless block_comment_table[:records].first["status"] == "active"
raise "Block-comment MRTD second row failed" unless block_comment_table[:records][1]["note"] == "review"

suffix_value = Makrell::Formats.apply_basic_suffix_profile(:string, "2026-04-11", "dt")
raise "Ruby basic suffix profile string helper failed" unless suffix_value == { value: "2026-04-11", suffix: "dt", __basic_suffix_profile: true }
raise "Ruby basic suffix profile number helper failed" unless Makrell::Formats.apply_basic_suffix_profile(:number, "3", "k") == 3000
raise "Ruby numeric suffix splitting failed" unless Makrell::Formats.split_numeric_literal_suffix("0.5tau") == ["0.5", "tau"]

suffix_mron = Makrell::Formats.parse_mron_string(read_fixture("conformance/mron", "base-suffixes.mron"))
raise "Suffix MRON dt failed" unless suffix_mron["when"] == { value: "2026-04-11", suffix: "dt", __basic_suffix_profile: true }
raise "Suffix MRON base conversions failed" unless suffix_mron["bits"] == 10 && suffix_mron["octal"] == 15 && suffix_mron["mask"] == 255
raise "Suffix MRON scaled numbers failed" unless suffix_mron["bonus"] == 3000 && suffix_mron["scale"] == 2000000

suffix_table = Makrell::Formats.parse_mrtd_string(read_fixture("conformance/mrtd", "base-suffixes.mrtd"))
raise "Suffix MRTD dt failed" unless suffix_table[:records].first["when"] == { value: "2026-04-11", suffix: "dt", __basic_suffix_profile: true }
raise "Suffix MRTD base conversions failed" unless suffix_table[:records].first["bits"] == 10 && suffix_table[:records].first["octal"] == 15 && suffix_table[:records].first["mask"] == 255
raise "Suffix MRTD scaled numbers failed" unless suffix_table[:records].first["bonus"] == 3000 && suffix_table[:records].first["scale"] == 2000000

out = Makrell::Formats.write_mrtd_string(
  columns: [
    { name: "name", type: "string" },
    { name: "age", type: "int" },
    { name: "active", type: "bool" }
  ],
  rows: [
    ["Ada", 32, true],
    ["Ben", 41, false]
  ]
)
raise "MRTD writer output failed" unless out == "name:string age:int active:bool\nAda 32 true\nBen 41 false"

untyped_out = Makrell::Formats.write_mrtd_string(
  columns: [
    { name: "name" },
    { name: "status" }
  ],
  rows: [
    ["Ada", "active"]
  ]
)
raise "MRTD untyped writer output failed" unless untyped_out == "name status\nAda active"

begin
  Makrell::Formats.parse_mron_string(read_fixture("conformance/mron", "hyphenated-bareword.invalid.mron"))
  raise "Expected MRON hyphenated bareword rejection"
rescue => error
  raise error unless error.message.include?("Unexpected token: -")
end

begin
  Makrell::Formats.parse_mron_string(read_fixture("conformance/mron", "unclosed-array.invalid.mron"))
  raise "Expected MRON unclosed array rejection"
rescue => error
  raise error unless error.message.include?("Unclosed group")
end

begin
  Makrell::Formats.parse_mrtd_string(read_fixture("conformance/mrtd", "hyphenated-bareword.invalid.mrtd"))
  raise "Expected MRTD hyphenated bareword rejection"
rescue => error
  raise error unless error.message.include?("Unexpected token: -")
end

begin
  Makrell::Formats.parse_mbf_level2_nodes("name value")
  raise "Expected level 2 reservation error"
rescue => error
  raise error unless error.message.include?("not implemented yet")
end

puts "ruby smoke ok"
