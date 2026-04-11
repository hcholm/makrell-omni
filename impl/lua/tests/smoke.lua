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

local id_table = mf.parse_mrtd_string("name:string status note\nAda active draft\nBen inactive review")
assert(id_table.records[1].status == "active", "MRTD identifier values failed")
assert(id_table.columns[2].type == nil and id_table.columns[3].type == nil, "MRTD untyped headers should stay untyped")

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
  mf.parse_mron_string("name trailing-commas")
end)
assert(not ok and err:find("Unexpected token: %-"), "Expected MRON hyphenated bareword rejection")

ok, err = pcall(function()
  mf.parse_mrtd_string("name:string\ntrailing-commas")
end)
assert(not ok and err:find("Unexpected token: %-"), "Expected MRTD hyphenated bareword rejection")

ok, err = pcall(function()
  mf.parse_mbf_level2_nodes("name value")
end)
assert(not ok and err:find("not implemented yet"), "Expected level 2 reservation error")

print("lua smoke ok")
