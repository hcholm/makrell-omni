$LOAD_PATH.unshift(File.expand_path("../lib", __dir__))
require "json"
require "makrell/formats"

def fixture(group, file)
  File.expand_path("../../../shared/format-fixtures/#{group}/#{file}", __dir__)
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

id_table = Makrell::Formats.parse_mrtd_string("name:string status note\nAda active draft\nBen inactive review")
raise "MRTD identifier values failed" unless id_table[:records].first["status"] == "active"
raise "MRTD untyped header should stay untyped" unless id_table[:columns][1][:type].nil? && id_table[:columns][2][:type].nil?

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
  Makrell::Formats.parse_mron_string("name trailing-commas")
  raise "Expected MRON hyphenated bareword rejection"
rescue => error
  raise error unless error.message.include?("Unexpected token: -")
end

begin
  Makrell::Formats.parse_mrtd_string("name:string\ntrailing-commas")
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
