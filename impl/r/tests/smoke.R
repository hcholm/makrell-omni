source(file.path("R", "makrellFormats.R"))

fixture_path <- function(group, file) {
  file.path("..", "..", "shared", "format-fixtures", group, file)
}

read_fixture <- function(group, file) {
  paste(readLines(fixture_path(group, file), warn = FALSE), collapse = "\n")
}

mron <- parse_mron_file(fixture_path("mron", "sample.mron"))
stopifnot(identical(mron$name, "Makrell"))
stopifnot(identical(mron$stable, FALSE))

iddoc <- parse_mron_string("title Makrell tags [alpha beta gamma] nested { kind article status draft }")
stopifnot(identical(iddoc$title, "Makrell"))
stopifnot(identical(iddoc$tags, list("alpha", "beta", "gamma")))

conformance_mron <- parse_mron_string(read_fixture(file.path("conformance", "mron"), "comments-and-identifiers.mron"))
stopifnot(identical(conformance_mron$name, "Makrell"))
stopifnot(identical(conformance_mron$features[[2]], "typed_scalars"))

suffix_value <- apply_basic_suffix_profile("string", "2026-04-11", "dt")
stopifnot(is_basic_suffix_tagged_string(suffix_value))
stopifnot(identical(suffix_value$value, "2026-04-11"))
stopifnot(identical(suffix_value$suffix, "dt"))
stopifnot(identical(apply_basic_suffix_profile("number", "3", "k"), 3000L))
numeric_suffix <- split_basic_numeric_suffix("0.5tau")
stopifnot(identical(numeric_suffix$value, "0.5"))
stopifnot(identical(numeric_suffix$suffix, "tau"))

base_suffix_mron <- parse_mron_string(read_fixture(file.path("conformance", "mron"), "base-suffixes.mron"))
stopifnot(is_basic_suffix_tagged_string(base_suffix_mron$when))
stopifnot(identical(base_suffix_mron$when$value, "2026-04-11"))
stopifnot(identical(base_suffix_mron$bits, 10L))
stopifnot(identical(base_suffix_mron$octal, 15L))
stopifnot(identical(base_suffix_mron$mask, 255L))
stopifnot(identical(base_suffix_mron$bonus, 3000L))
stopifnot(isTRUE(all.equal(base_suffix_mron$turn, pi)))
stopifnot(isTRUE(all.equal(base_suffix_mron$angle, pi)))

block_comment_mron <- parse_mron_string(read_fixture(file.path("conformance", "mron"), "block-comments.mron"))
stopifnot(identical(block_comment_mron$name, "Makrell"))
stopifnot(identical(block_comment_mron$features[[2]], "typed_scalars"))

mrml <- parse_mrml_file(fixture_path("mrml", "sample.mrml"))
stopifnot(identical(mrml$name, "page"))
stopifnot(identical(mrml$attributes$lang, "en"))
stopifnot(identical(write_mrml_string(mrml), "<page lang=\"en\"><title>Makrell</title><p>A small MRML fixture.</p></page>"))

mrtd <- parse_mrtd_file(fixture_path("mrtd", "sample.mrtd"))
stopifnot(length(mrtd$columns) == 3)
stopifnot(identical(mrtd$records[[1]]$name, "Ada"))

idtable <- parse_mrtd_string(read_fixture(file.path("conformance", "mrtd"), "untyped-headers.mrtd"))
stopifnot(identical(idtable$records[[1]]$status, "active"))
stopifnot(identical(idtable$records[[2]]$note, "review"))
stopifnot(is.null(idtable$columns[[2]]$type))
stopifnot(is.null(idtable$columns[[3]]$type))

block_comment_table <- parse_mrtd_string(read_fixture(file.path("conformance", "mrtd"), "block-comments.mrtd"))
stopifnot(identical(block_comment_table$records[[1]]$status, "active"))
stopifnot(identical(block_comment_table$records[[2]]$note, "review"))

base_suffix_table <- parse_mrtd_string(read_fixture(file.path("conformance", "mrtd"), "base-suffixes.mrtd"))
stopifnot(is_basic_suffix_tagged_string(base_suffix_table$records[[1]]$when))
stopifnot(identical(base_suffix_table$records[[1]]$bits, 10L))
stopifnot(identical(base_suffix_table$records[[1]]$octal, 15L))
stopifnot(identical(base_suffix_table$records[[1]]$mask, 255L))
stopifnot(identical(base_suffix_table$records[[1]]$bonus, 3000L))

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

untyped_doc <- list(
  columns = list(
    list(name = "name", type = NULL),
    list(name = "status", type = NULL)
  ),
  rows = list(
    list("Ada", "active")
  )
)
stopifnot(identical(write_mrtd_string(untyped_doc), "name status\nAda active"))

stopifnot(inherits(try(parse_mron_string(read_fixture(file.path("conformance", "mron"), "hyphenated-bareword.invalid.mron")), silent = TRUE), "try-error"))
stopifnot(inherits(try(parse_mrtd_string(read_fixture(file.path("conformance", "mrtd"), "hyphenated-bareword.invalid.mrtd")), silent = TRUE), "try-error"))

cat("R smoke tests passed.\n")
