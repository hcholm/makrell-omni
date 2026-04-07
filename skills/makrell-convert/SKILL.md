---
name: makrell-convert
description: Convert between Makrell formats and their conventional equivalents — JSON to/from MRON, HTML to/from MRML, CSV to/from MRTD. Use when migrating data or generating Makrell-format files from existing sources.
allowed-tools: Read Grep Glob Edit Write Bash
---

# Convert To and From Makrell Formats

You are helping convert data between Makrell formats and their conventional equivalents.

## Format Pairs

| Makrell Format | Conventional Equivalent | Direction        |
|----------------|------------------------|------------------|
| MRON           | JSON, TOML, YAML       | Both ways         |
| MRML           | HTML, XML              | Both ways         |
| MRTD           | CSV, TSV               | Both ways         |

---

## JSON ↔ MRON

### JSON to MRON rules

| JSON                              | MRON                            |
|-----------------------------------|---------------------------------|
| `{ "key": "value" }`             | `key "value"`                   |
| `{ "key": 42 }`                  | `key 42`                        |
| `{ "key": true }`                | `key true`                      |
| `{ "key": null }`                | `key null`                      |
| `{ "key": [1, 2, 3] }`          | `key [1 2 3]`                   |
| `{ "key": { "a": 1 } }`         | `key { a 1 }`                   |
| `[{ "a": 1 }, { "a": 2 }]`      | `[{ a 1 } { a 2 }]`           |

**Key differences:**
- Remove colons between keys and values
- Remove commas between entries and list elements
- Remove quotes around keys (unless they contain spaces or special characters)
- Keep quotes around string values
- Top-level MRON is implicitly an object — no outer `{}`

### Conversion procedure (JSON → MRON)

1. If the top-level is an object, emit each key/value as a line (no outer braces)
2. Replace `: ` between key and value with a space
3. Remove all commas
4. Keep string values quoted; leave numbers, booleans, null bare
5. For nested objects, use `{ ... }` with the same rules inside
6. For arrays, use `[ ... ]` with space-separated elements

### Example

**JSON:**
```json
{
  "name": "Rena Holm",
  "age": 29,
  "active": true,
  "tags": ["dev", "docs"],
  "address": {
    "city": "Bergen",
    "country": "Norway"
  }
}
```

**MRON:**
```mron
name "Rena Holm"
age 29
active true
tags ["dev" "docs"]
address {
    city "Bergen"
    country "Norway"
}
```

### MRON → JSON procedure

1. Wrap all content in `{ }`
2. Add `:` after each key
3. Add commas between entries and list elements
4. Quote all keys

---

## HTML ↔ MRML

### HTML to MRML rules

| HTML                                 | MRML                                |
|--------------------------------------|-------------------------------------|
| `<tag>content</tag>`                | `{tag content}`                     |
| `<tag attr="val">content</tag>`     | `{tag [attr="val"] content}`        |
| `<tag />`                           | `{tag}`                             |
| `<tag><child /></tag>`              | `{tag {child}}`                     |
| `some <b>bold</b> text`            | `some {b bold} text`                |

**Key differences:**
- Replace `<tag>...</tag>` with `{tag ...}`
- Move attributes into `[...]` after the tag name
- No closing tags — structure is expressed through nesting and `}`
- Self-closing tags become `{tag}` or `{tag [attrs]}`
- Inline elements work naturally: `text {b bold} more text`

### Conversion procedure (HTML → MRML)

1. For each element, write `{tagname`
2. If it has attributes, write ` [attr1="val1" attr2="val2"]`
3. Write child content (text and nested elements) after the tag/attributes
4. Close with `}`
5. Void elements (`<br>`, `<hr>`, `<img>`, `<meta>`, `<link>`, `<input>`) become `{br}`, `{img [src="..."]}`, etc.

### Example

**HTML:**
```html
<html>
  <head>
    <meta charset="utf-8">
    <title>My Page</title>
  </head>
  <body>
    <h1>Welcome</h1>
    <p class="lead">This is <b>Makrell</b> markup.</p>
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
    </ul>
  </body>
</html>
```

**MRML:**
```mrml
{html
    {head
        {meta [charset="utf-8"]}
        {title My Page}}
    {body
        {h1 Welcome}
        {p [class="lead"] This is {b Makrell} markup.}
        {ul
            {li Item 1}
            {li Item 2}}}}
```

### MRML → HTML procedure

1. For each `{tag ...}`, emit `<tag>...</tag>`
2. Move `[...]` attributes into the opening tag
3. Add closing tags for all non-void elements
4. Self-close void elements

---

## CSV ↔ MRTD

### CSV to MRTD rules

| CSV                              | MRTD                                |
|----------------------------------|-------------------------------------|
| `name,age,active`               | `name age active` (untyped)         |
| `name,age,active`               | `name:string age:int active:bool` (typed) |
| `Ada,32,true`                   | `Ada 32 true`                       |
| `"Rena Holm",29,false`          | `"Rena Holm" 29 false`             |

**Key differences:**
- Replace commas with whitespace
- Optionally add type annotations to header: `:string`, `:int`, `:float`, `:bool`
- Keep quotes around values that contain spaces
- Multiline rows use `( )` wrapping instead of quoting with embedded newlines

### Conversion procedure (CSV → MRTD)

1. Split the header row on commas; join with spaces
2. Optionally infer types from data and add annotations (`:int`, `:float`, `:bool`, `:string`)
3. For each data row, split on commas and join with spaces
4. Quote values that contain spaces or are not valid identifiers
5. If a row is very long, consider `( ... )` multiline wrapping

### Example

**CSV:**
```csv
name,age,city,active
Ada,32,Oslo,true
"Rena Holm",29,"Bergen sentrum",false
```

**MRTD (typed):**
```mrtd
name:string age:int city:string active:bool
Ada 32 Oslo true
"Rena Holm" 29 "Bergen sentrum" false
```

**MRTD (untyped):**
```mrtd
name age city active
Ada 32 Oslo true
"Rena Holm" 29 "Bergen sentrum" false
```

### MRTD → CSV procedure

1. Strip type annotations from header cells (e.g., `name:string` → `name`)
2. Join header cells with commas
3. Join each data row's cells with commas
4. Quote any value containing commas (standard CSV quoting rules)

---

## Guidelines

When converting:

- **Ask about typing for MRTD** — the user may want untyped or typed headers
- **Preserve data fidelity** — don't lose values, types, or structure during conversion
- **Format readably** — use consistent indentation in MRON and MRML output
- **Handle edge cases** — empty strings (`""`), null values, nested arrays
- **For large conversions**, consider writing a script rather than converting manually

When the user says "convert this JSON to MRON" or similar:

1. Read the source file
2. Apply the conversion rules
3. Write the result to the target file (or show it)
4. Optionally validate with `makrellsharp check-mron/check-mrml/check-mrtd`
