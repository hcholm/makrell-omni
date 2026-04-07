---
name: makrell-data
description: Work with Makrell data and markup formats — MRON (.mron), MRML (.mrml), and MRTD (.mrtd). Use when creating, editing, validating, or explaining these formats.
allowed-tools: Read Grep Glob Edit Write Bash
---

# Makrell Data Formats

You are helping in a project that uses Makrell data and markup formats.
These formats share the MBF structural core with the Makrell language family.

## Format Overview

| Format | Purpose                     | File ext | Closest analogue |
|--------|-----------------------------|----------|------------------|
| MRON   | Data notation (config, API) | `.mron`  | JSON / TOML      |
| MRML   | Markup notation             | `.mrml`  | HTML / XML       |
| MRTD   | Tabular data                | `.mrtd`  | CSV / TSV        |

---

## MRON — Makrell Object Notation

MRON is a Makrell-shaped alternative to JSON. Lighter punctuation, same structural expressiveness.

### Scalars

```mron
name "Rena Holm"
count 42
pi 3.14
active true
missing null
```

Strings require double quotes. Numbers, booleans (`true`/`false`), and `null` are bare.

### Objects (top-level)

```mron
project "Makrell"
version "0.10.0"
active true
```

A top-level MRON document is implicitly an object — each line is a key/value pair.

### Lists

```mron
tags ["docs" "formats" "languages"]
scores [95 87 91]
```

Square brackets, space-separated values.

### Nested objects

```mron
site {
    title "makrell.dev"
    sections [
        {
            name "concepts"
            public true
        }
        {
            name "tutorials"
            public true
        }
    ]
}
```

Curly braces for nested objects. Lists of objects use `[{ ... } { ... }]`.

### Complete example

```mron
owner "Rena Holm"
last_update "2026-04-03"

books [
    {
        title "That Time of the Year Again"
        year 1963
        author "Norton Max"
    }
    {
        title "One for the Team"
        year 2024
        author "Felicia X"
    }
]
```

### MRON vs JSON mapping

| JSON                          | MRON                          |
|-------------------------------|-------------------------------|
| `{ "key": "value" }`         | `key "value"`                 |
| `{ "a": [1, 2, 3] }`        | `a [1 2 3]`                  |
| `{ "x": { "y": 1 } }`       | `x { y 1 }`                  |
| `"string"`                   | `"string"`                    |
| `42`, `true`, `null`         | `42`, `true`, `null`          |
| commas, colons               | whitespace separation         |

---

## MRML — Makrell Markup Language

MRML is a Makrell-shaped alternative to HTML/XML. Tree structure expressed through nested curly forms.

### Basic elements

```mrml
{h1 Hello World}
{p This is a paragraph.}
```

The first token after `{` is the tag name. Everything else is content.

### Attributes

```mrml
{p [class="lead" id="intro"]
    A paragraph with attributes.}
```

Square brackets after the tag name hold attributes.

### Nested structure

```mrml
{html
    {head
        {title A Test}}
    {body
        {h1 This is a Test}
        {p [style="color: red"] Just some {b bold} text here.}}}
```

### Inline elements

```mrml
{p Use the {b shared concepts} section first.}
{p Visit {a [href="/docs"] the docs} for more.}
```

### Complete page example

```mrml
{html
    {head
        {meta [charset="utf-8"]}
        {title My Page}
        {link [rel="stylesheet" href="style.css"]}}
    {body
        {header
            {nav
                {a [href="/"] Home}
                {a [href="/about"] About}}}
        {main
            {section [class="hero"]
                {h1 Welcome}
                {p One structural family for code, data, and markup.}}
            {section [class="features"]
                {div [class="card"]
                    {h2 Functional}
                    {p Pipes, operators, and composition.}}
                {div [class="card"]
                    {h2 Multi-host}
                    {p Python, TypeScript, and .NET.}}}}
        {footer
            {p Built with Makrell.}}}}
```

### MRML vs HTML mapping

| HTML                                  | MRML                                  |
|---------------------------------------|---------------------------------------|
| `<h1>Title</h1>`                     | `{h1 Title}`                          |
| `<p class="x">Text</p>`             | `{p [class="x"] Text}`               |
| `<div><p>A</p><p>B</p></div>`       | `{div {p A} {p B}}`                  |
| `<a href="/">Home</a>`              | `{a [href="/"] Home}`                 |
| Close tags                           | Closing `}` (structural nesting)      |

---

## MRTD — Makrell Tabular Data

MRTD is a whitespace-separated tabular format. Simpler than CSV for many common shapes.

### Untyped (header + data)

```mrtd
name city
Ada Oslo
Ben Bergen
```

The first row is the header. Subsequent rows are data. Cells are whitespace-separated.

### Typed columns

```mrtd
name:string age:int active:bool
Ada 32 true
"Rena Holm" 29 false
```

Header cells can carry type annotations: `int`, `float`, `bool`, `string`.

### Quoted values

```mrtd
"full name":string city:string
"Rena Holm" "Bergen sentrum"
```

Quote values that contain spaces or are not valid identifiers.

### Multiline rows

```mrtd
name:string note:string score:float
( "Rena Holm"
  "line wrapped"
  13.5 )
```

Wrap rows in `( )` when they need to span multiple lines.

### Profiles (extended scalars)

```mrtd
when bonus
"2026-04-03"dt 3k
```

The `extended-scalars` profile adds suffixed literals like date (`dt`) and numeric shortcuts (`k`, `M`). Profiles are opt-in.

### MRTD vs CSV mapping

| CSV                          | MRTD (untyped)        | MRTD (typed)                  |
|------------------------------|-----------------------|-------------------------------|
| `name,age,active`           | `name age active`     | `name:string age:int active:bool` |
| `Ada,32,true`               | `Ada 32 true`         | `Ada 32 true`                |
| `"Rena Holm",29,false`      | `"Rena Holm" 29 false`| `"Rena Holm" 29 false`       |
| Comma-separated              | Whitespace-separated  | Whitespace-separated          |
| No type info                 | No type info          | Type annotations in header    |

---

## Validation commands

All three formats can be checked via CLI:

```bash
makrellsharp check-mron file.mron --json
makrellsharp check-mrml file.mrml --json
makrellsharp check-mrtd file.mrtd --json
```

## Programmatic access

### Python (MakrellPy)

```python
from makrell.mrtd import read_records
rows = read_records("""
name:string age:int active:bool
Ada 32 true
Ben 41 false
""")
```

### TypeScript (MakrellTS)

```typescript
import { parseMrtd, readMrtdRecords } from "makrellts";
const rows = readMrtdRecords(`
name:string age:int active:bool
Ada 32 true
Ben 41 false
`);
```

### C# (Makrell#)

```csharp
var rows = MrtdTyped.ReadRecords<Person>("""
    name:string age:int active:bool
    Ada 32 true
    Ben 41 false
    """);
```

## Guidelines

When writing MRON:
- No commas or colons between keys and values — use whitespace
- Strings always use double quotes
- Top-level is implicitly an object

When writing MRML:
- First token after `{` is the element name
- Attributes go in `[...]` immediately after the tag name
- Close with `}`, not a closing tag — nesting is structural

When writing MRTD:
- First row is always the header
- Whitespace separates cells, not commas
- Quote any value containing spaces
- Type annotations are optional: `name` and `name:string` are both valid headers

## Documentation

- MRON: https://makrell.dev/mron/
- MRML: https://makrell.dev/mrml/
- MRTD: https://makrell.dev/mrtd/
- MBF (shared structure): https://makrell.dev/mbf/
