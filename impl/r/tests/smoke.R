source(file.path("R", "makrellFormats.R"))

fixture_path <- function(group, file) {
  file.path("..", "..", "shared", "format-fixtures", group, file)
}

mron <- parse_mron_file(fixture_path("mron", "sample.mron"))
stopifnot(identical(mron$name, "Makrell"))
stopifnot(identical(mron$stable, FALSE))

iddoc <- parse_mron_string("title Makrell tags [alpha beta gamma] nested { kind article status draft }")
stopifnot(identical(iddoc$title, "Makrell"))
stopifnot(identical(iddoc$tags, list("alpha", "beta", "gamma")))

mrml <- parse_mrml_file(fixture_path("mrml", "sample.mrml"))
stopifnot(identical(mrml$name, "page"))
stopifnot(identical(mrml$attributes$lang, "en"))
stopifnot(identical(write_mrml_string(mrml), "<page lang=\"en\"><title>Makrell</title><p>A small MRML fixture.</p></page>"))

mrtd <- parse_mrtd_file(fixture_path("mrtd", "sample.mrtd"))
stopifnot(length(mrtd$columns) == 3)
stopifnot(identical(mrtd$records[[1]]$name, "Ada"))

idtable <- parse_mrtd_string("name:string status note\nAda active draft\nBen inactive review")
stopifnot(identical(idtable$records[[1]]$status, "active"))
stopifnot(identical(idtable$records[[2]]$note, "review"))

doc <- list(
  columns = list(
    list(name = "name", type = "string"),
    list(name = "age", type = "int"),
    list(name = "active", type = "bool")
  ),
  rows = list(
    list("Ada", 32L, TRUE),
    list("Ben", 41L, FALSE)
  )
)
stopifnot(identical(write_mrtd_string(doc), "name:string age:int active:bool\nAda 32 true\nBen 41 false"))

cat("R smoke tests passed.\n")
