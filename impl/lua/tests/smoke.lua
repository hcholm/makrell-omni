local mf = dofile("makrell_formats.lua")

local function fixture(group, file)
  return "../../shared/format-fixtures/" .. group .. "/" .. file
end

local function read_all(path)
  local file = assert(io.open(path, "r"))
  local text = file:read("*a")
  file:close()
  return text
end

local profile = mf.mbf_support_profile()
assert(profile.implemented_levels[1] == 0 and profile.implemented_levels[2] == 1, "MBF profile missing level split")

local mron = mf.parse_mron_string(read_all(fixture("mron", "sample.mron")))
assert(mron.name == "Makrell", "MRON fixture name failed")
assert(mron.stable == false, "MRON fixture bool failed")

local mrml = mf.parse_mrml_string(read_all(fixture("mrml", "sample.mrml")))
assert(mf.write_mrml_string(mrml) == '<page lang="en"><title>Makrell</title><p>A small MRML fixture.</p></page>', "MRML writer failed")

local mrtd = mf.parse_mrtd_string(read_all(fixture("mrtd", "sample.mrtd")))
assert(mrtd.records[1].name == "Ada", "MRTD fixture failed")

local conformance_mron = mf.parse_mron_string(read_all(fixture("conformance/mron", "comments-and-identifiers.mron")))
assert(conformance_mron.name == "Makrell", "Conformance MRON name failed")
assert(conformance_mron.features[2] == "typed_scalars", "Conformance MRON identifier array failed")

local block_comment_mron = mf.parse_mron_string(read_all(fixture("conformance/mron", "block-comments.mron")))
assert(block_comment_mron.name == "Makrell", "Block-comment MRON name failed")
assert(block_comment_mron.features[2] == "typed_scalars", "Block-comment MRON identifier array failed")

local negative_mron = mf.parse_mron_string(read_all(fixture("conformance/mron", "negative-numbers.mron")))
assert(negative_mron.offset == -2, "Conformance MRON negative scalar failed")
assert(negative_mron.temps[1] == -1, "Conformance MRON negative array failed")

local id_table = mf.parse_mrtd_string(read_all(fixture("conformance/mrtd", "untyped-headers.mrtd")))
assert(id_table.records[1].status == "active", "MRTD identifier values failed")
assert(id_table.columns[2].type == nil and id_table.columns[3].type == nil, "MRTD untyped headers should stay untyped")

local negative_table = mf.parse_mrtd_string(read_all(fixture("conformance/mrtd", "negative-numbers.mrtd")))
assert(negative_table.records[1].delta == -2, "Conformance MRTD negative int failed")
assert(negative_table.records[1].ratio == -3.5, "Conformance MRTD negative float failed")

local block_comment_table = mf.parse_mrtd_string(read_all(fixture("conformance/mrtd", "block-comments.mrtd")))
assert(block_comment_table.records[1].status == "active", "Block-comment MRTD first row failed")
assert(block_comment_table.records[2].note == "review", "Block-comment MRTD second row failed")

local out = mf.write_mrtd_string({
  columns = {
    { name = "name", type = "string" },
    { name = "age", type = "int" },
    { name = "active", type = "bool" },
  },
  rows = {
    { "Ada", 32, true },
    { "Ben", 41, false },
  }
})
assert(out == "name:string age:int active:bool\nAda 32 true\nBen 41 false", "MRTD writer output failed")

local untyped_out = mf.write_mrtd_string({
  columns = {
    { name = "name" },
    { name = "status" },
  },
  rows = {
    { "Ada", "active" },
  }
})
assert(untyped_out == "name status\nAda active", "MRTD untyped writer output failed")

local ok, err = pcall(function()
  mf.parse_mron_string(read_all(fixture("conformance/mron", "hyphenated-bareword.invalid.mron")))
end)
assert(not ok and err:find("Unexpected token: %-"), "Expected MRON hyphenated bareword rejection")

ok, err = pcall(function()
  mf.parse_mron_string(read_all(fixture("conformance/mron", "unclosed-array.invalid.mron")))
end)
assert(not ok and err:find("Unclosed group"), "Expected MRON unclosed array rejection")

ok, err = pcall(function()
  mf.parse_mrtd_string(read_all(fixture("conformance/mrtd", "hyphenated-bareword.invalid.mrtd")))
end)
assert(not ok and err:find("Unexpected token: %-"), "Expected MRTD hyphenated bareword rejection")

ok, err = pcall(function()
  mf.parse_mbf_level2_nodes("name value")
end)
assert(not ok and err:find("not implemented yet"), "Expected level 2 reservation error")

print("lua smoke ok")
