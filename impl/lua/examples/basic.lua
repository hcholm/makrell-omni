local mf = dofile("makrell_formats.lua")

local parsed = mf.parse_mron_string('name Makrell features [comments "trailing commas" typed_scalars] stable false')
print(mf.write_mron_string(parsed))
