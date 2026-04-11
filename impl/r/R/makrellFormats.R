tokenise_makrell <- function(source) {
  tokens <- list()
  i <- 1L
  n <- nchar(source)
  while (i <= n) {
    ch <- substr(source, i, i)
    if (grepl("[[:space:],]", ch)) {
      i <- i + 1L
      next
    }
    if (ch == "#") {
      while (i <= n && substr(source, i, i) != "\n") i <- i + 1L
      next
    }
    if (ch == "/" && i < n && substr(source, i + 1L, i + 1L) == "/") {
      i <- i + 2L
      while (i <= n && substr(source, i, i) != "\n") i <- i + 1L
      next
    }
    if (ch %in% c("{", "}", "[", "]", "(", ")", "=")) {
      tokens[[length(tokens) + 1L]] <- list(kind = ch, text = ch, quoted = FALSE)
      i <- i + 1L
      next
    }
    if (ch == "\"") {
      i <- i + 1L
      text <- character()
      escaping <- FALSE
      while (i <= n) {
        c <- substr(source, i, i)
        i <- i + 1L
        if (escaping) {
          text <- c(text, switch(c, n = "\n", r = "\r", t = "\t", c))
          escaping <- FALSE
        } else if (c == "\\") {
          escaping <- TRUE
        } else if (c == "\"") {
          break
        } else {
          text <- c(text, c)
        }
      }
      tokens[[length(tokens) + 1L]] <- list(kind = "scalar", text = paste(text, collapse = ""), quoted = TRUE)
      next
    }
    start <- i
    while (i <= n) {
      c <- substr(source, i, i)
    if (grepl("[[:space:],#]", c) || c %in% c("{", "}", "[", "]", "(", ")", "=", "\"", "-")) break
      if (c == "/" && i < n && substr(source, i + 1L, i + 1L) == "/") break
      i <- i + 1L
    }
    tokens[[length(tokens) + 1L]] <- list(kind = "scalar", text = substr(source, start, i - 1L), quoted = FALSE)
  }
  tokens
}

parse_nodes_makrell <- function(source) {
  tokens <- tokenise_makrell(source)
  parse_group <- function(index, closing) {
    items <- list()
    while (index <= length(tokens) && tokens[[index]]$kind != closing) {
      parsed <- parse_node(index)
      items[[length(items) + 1L]] <- parsed$node
      index <- parsed$index
    }
    list(items = items, index = index + 1L)
  }

  parse_node <- function(index) {
    token <- tokens[[index]]
    index <- index + 1L
    if (token$kind %in% c("scalar", "=")) {
      return(list(node = list(kind = "scalar", text = token$text, quoted = token$quoted), index = index))
    }
    if (token$kind == "{") {
      parsed <- parse_group(index, "}")
      return(list(node = list(kind = "brace", children = parsed$items), index = parsed$index))
    }
    if (token$kind == "[") {
      parsed <- parse_group(index, "]")
      return(list(node = list(kind = "square", children = parsed$items), index = parsed$index))
    }
    parsed <- parse_group(index, ")")
    list(node = list(kind = "paren", children = parsed$items), index = parsed$index)
  }

  items <- list()
  index <- 1L
  while (index <= length(tokens)) {
    parsed <- parse_node(index)
    items[[length(items) + 1L]] <- parsed$node
    index <- parsed$index
  }
  items
}

convert_scalar_mron <- function(text, quoted) {
  if (quoted) return(text)
  if (identical(text, "null")) return(NULL)
  if (identical(text, "true")) return(TRUE)
  if (identical(text, "false")) return(FALSE)
  if (grepl("^-?[0-9]+$", text)) return(as.integer(text))
  if (grepl("^-?[0-9]+\\.[0-9]+$", text)) return(as.numeric(text))
  text
}

convert_mron_node <- function(node) {
  if (node$kind == "scalar") return(convert_scalar_mron(node$text, node$quoted))
  if (node$kind == "square") return(lapply(node$children, convert_mron_node))
  convert_mron_pairs(node$children)
}

convert_mron_pairs <- function(nodes) {
  out <- list()
  i <- 1L
  while (i < length(nodes)) {
    key <- convert_mron_node(nodes[[i]])
    out[[as.character(key)]] <- convert_mron_node(nodes[[i + 1L]])
    i <- i + 2L
  }
  out
}

parse_mron_string <- function(source) {
  nodes <- parse_nodes_makrell(source)
  if (length(nodes) == 0) return(NULL)
  if (length(nodes) == 1) return(convert_mron_node(nodes[[1]]))
  convert_mron_pairs(nodes)
}

parse_mron_file <- function(path) parse_mron_string(paste(readLines(path, warn = FALSE), collapse = "\n"))

quote_if_needed <- function(text) {
  if (grepl("^[A-Za-z_][A-Za-z0-9_]*$", text)) text else sprintf("\"%s\"", gsub("([\\\\\"])", "\\\\\\1", text))
}

write_mron_string <- function(value) {
  if (is.null(value)) return("null")
  if (is.logical(value) && length(value) == 1) return(if (isTRUE(value)) "true" else "false")
  if (is.integer(value) && length(value) == 1) return(as.character(value))
  if (is.double(value) && length(value) == 1 && !is.list(value)) return(as.character(value))
  if (is.character(value) && length(value) == 1) return(quote_if_needed(value))
  if (is.list(value) && is.null(names(value))) return(sprintf("[%s]", paste(vapply(value, write_mron_string, ""), collapse = " ")))
  if (is.list(value)) {
    parts <- character()
    for (name in names(value)) {
      parts <- c(parts, quote_if_needed(name), write_mron_string(value[[name]]))
    }
    return(sprintf("{ %s }", paste(parts, collapse = " ")))
  }
  stop("Unsupported MRON value")
}

parse_mrml_element <- function(node) {
  out <- list(name = node$children[[1]]$text, attributes = list(), children = list())
  index <- 2L
  if (index <= length(node$children) && node$children[[index]]$kind == "square") {
    attrs <- node$children[[index]]$children
    i <- 1L
    while (i <= length(attrs)) {
      key <- attrs[[i]]$text
      i <- i + 1L
      if (i <= length(attrs) && attrs[[i]]$kind == "scalar" && attrs[[i]]$text == "=") i <- i + 1L
      out$attributes[[key]] <- attrs[[i]]$text
      i <- i + 1L
    }
    index <- index + 1L
  }
  while (index <= length(node$children)) {
    child <- node$children[[index]]
    out$children[[length(out$children) + 1L]] <- if (child$kind == "brace") parse_mrml_element(child) else child$text
    index <- index + 1L
  }
  out
}

parse_mrml_string <- function(source) {
  nodes <- parse_nodes_makrell(source)
  parse_mrml_element(nodes[[1]])
}

parse_mrml_file <- function(path) parse_mrml_string(paste(readLines(path, warn = FALSE), collapse = "\n"))

escape_xml <- function(text) {
  text <- gsub("&", "&amp;", text, fixed = TRUE)
  text <- gsub("<", "&lt;", text, fixed = TRUE)
  text <- gsub(">", "&gt;", text, fixed = TRUE)
  gsub("\"", "&quot;", text, fixed = TRUE)
}

write_mrml_string <- function(value) {
  attrs <- if (length(value$attributes) == 0) "" else paste(sprintf(" %s=\"%s\"", names(value$attributes), vapply(value$attributes, escape_xml, "")), collapse = "")
  if (length(value$children) == 0) return(sprintf("<%s%s/>", value$name, attrs))
  parts <- vapply(value$children, function(child) if (is.list(child) && !is.null(child$name)) write_mrml_string(child) else escape_xml(as.character(child)), "")
  sprintf("<%s%s>%s</%s>", value$name, attrs, paste(parts, collapse = ""), value$name)
}

convert_mrtd_cell <- function(node, type) {
  value <- convert_scalar_mron(node$text, node$quoted)
  if (identical(type, "string")) return(as.character(value))
  if (identical(type, "int") && is.integer(value)) return(value)
  if (identical(type, "float") && (is.integer(value) || is.double(value))) return(as.numeric(value))
  if (identical(type, "bool") && is.logical(value)) return(value)
  if (!type %in% c("string", "int", "float", "bool")) stop(sprintf("Unsupported MRTD field type: %s", type))
  stop(sprintf("MRTD value does not match %s field", type))
}

parse_mrtd_string <- function(source) {
  lines <- trimws(strsplit(gsub("\r\n", "\n", source, fixed = TRUE), "\n", fixed = TRUE)[[1]])
  lines <- lines[lines != "" & !startsWith(lines, "#")]
  if (length(lines) == 0) return(list(columns = list(), rows = list(), records = list()))
  headers <- parse_nodes_makrell(lines[[1]])
  columns <- lapply(headers, function(node) {
    parts <- strsplit(node$text, ":", fixed = TRUE)[[1]]
    list(name = parts[[1]], type = if (length(parts) > 1) parts[[2]] else "string")
  })
  rows <- list()
  records <- list()
  for (line in lines[-1]) {
    if (startsWith(line, "(") && endsWith(line, ")")) line <- trimws(substr(line, 2, nchar(line) - 1))
    cells <- parse_nodes_makrell(line)
    row <- list()
    record <- list()
    for (i in seq_along(columns)) {
      value <- convert_mrtd_cell(cells[[i]], columns[[i]]$type)
      row[[i]] <- value
      record[[columns[[i]]$name]] <- value
    }
    rows[[length(rows) + 1L]] <- row
    records[[length(records) + 1L]] <- record
  }
  list(columns = columns, rows = rows, records = records)
}

parse_mrtd_file <- function(path) parse_mrtd_string(paste(readLines(path, warn = FALSE), collapse = "\n"))

write_mrtd_cell <- function(value) {
  if (is.logical(value)) return(if (isTRUE(value)) "true" else "false")
  if ((is.integer(value) || is.double(value)) && length(value) == 1) return(as.character(value))
  quote_if_needed(as.character(value))
}

write_mrtd_string <- function(value) {
  header <- paste(vapply(value$columns, function(col) sprintf("%s:%s", quote_if_needed(col$name), col$type), ""), collapse = " ")
  lines <- c(header, vapply(value$rows, function(row) paste(vapply(row, write_mrtd_cell, ""), collapse = " "), ""))
  paste(lines, collapse = "\n")
}
