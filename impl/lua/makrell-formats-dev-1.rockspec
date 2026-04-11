package = "makrell-formats"
version = "0.10.0-1"
source = {
  url = "."
}
description = {
  summary = "MRON, MRML, and MRTD support for Lua",
  homepage = "https://makrell.dev",
  license = "MIT"
}
build = {
  type = "builtin",
  modules = {
    ["makrell_formats"] = "makrell_formats.lua"
  }
}
