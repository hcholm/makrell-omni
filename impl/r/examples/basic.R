source(file.path("R", "makrellFormats.R"))

doc <- parse_mron_string("name Makrell features [comments \"trailing-commas\" \"typed-scalars\"] stable false")
print(doc)
