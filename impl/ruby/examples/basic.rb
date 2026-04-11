$LOAD_PATH.unshift(File.expand_path("../lib", __dir__))
require "json"
require "makrell/formats"

puts JSON.pretty_generate(
  Makrell::Formats.parse_mron_string(
    'name Makrell features [comments "trailing commas" typed_scalars] stable false'
  )
)
