# MRTD Specification (Draft)

MRTD is the Makrell family tabular data format.

This draft intentionally keeps MRTD close to CSV in shape while using MBF token
rules for cells and typed headers.

For data-format implementations, MRTD requires:

- MBF level 0 tokenisation
- MBF level 1 bracketed/nested node parsing

MRTD does not require MBF level 2 operator parsing for its core tabular
surface, but implementations should leave room for a later level 2 path.

## Status

Draft specification.

This draft defines only the core tabular surface:

- first row is the header
- remaining rows are data
- cells are whitespace-delimited
- header cells are field names, optionally with scalar type annotations
- multiline rows are written with round brackets
- operator-shaped tokens are rejected in the core data-cell/header surface

This draft does not yet define:

- comments or metadata lines
- nested values
- formulas
- validation rules beyond header typing
- import/export conventions

### Portability labels used in this document

- `[Core]`: intended to be portable across the Makrell family
- `[Profile]`: specific to one language, format, or named profile
- `[Application]`: acceptable in controlled environments, but not portable by default

## Design goals

MRTD should be:

- much simpler than MRON
- close in feel to CSV/TSV
- easy to type by hand
- structurally aligned with MBF tokenisation rules
- usable across MakrellPy, MakrellTS, and Makrell#

## Basic model

An MRTD document is a sequence of rows.

- The first row is the header row.
- Every later row is a data row.
- Every data row must have the same number of cells as the header row.

## Cell separation

Cells are delimited by whitespace.

Example:

```mrtd
name age active
Ada 32 true
Ben 41 false
```

This means MRTD is not comma-delimited.
Its "CSV-like" character comes from the row-and-column model, not from punctuation.

## Header cells

Each header cell is either:

- a field name
- a field name with a type annotation, written as `name:type`

Examples:

```mrtd
name age active
```

```mrtd
name:string age:int active:bool
```

Field names may be:

- identifiers
- double-quoted strings

Examples:

```mrtd
name age:int
```

```mrtd
"full name":string age:int
```

Identifiers are preferred for field names when possible, but quoted names are valid.

### Future direction: constrained header cells

Constraint syntax is not part of the first MRTD core, but it is expected to grow
from the same MBF and Makrell pattern vocabulary rather than from a separate
mini-language.

The likely direction is:

- `field:type` for simple typed columns
- `field:[type ...constraint...]` for constrained columns

Examples of the intended shape:

```mrtd
status:["new" | "paid" | "failed"]
age:[int $ >= 0 & $ <= 150]
```

Range-like constraints should prefer predicate or pattern-style forms over `..`
notation, because `..` already suggests other Makrell meanings such as regular or
range-oriented syntax elsewhere in the family.

This is a draft extension direction only. It is not yet part of the current core
MRTD syntax.

## Supported types

The initial MRTD draft limits declared field types to MBF scalar types:

- `int`
- `float`
- `bool`
- `string`

If no type annotation is given, the field is untyped in the source model.

Implementations may still choose a runtime coercion strategy for untyped cells,
but they SHOULD preserve the absence of a declared type explicitly in the source
model when they expose column metadata.

## Data cells

Data cells use MBF scalar syntax only.

Allowed cell forms in this draft:

- identifiers
- double-quoted strings
- numbers

Examples:

```mrtd
name age active
Ada 32 true
"Rena Holm" 29 false
```

### Strings

If a string can be expressed as an identifier, it may be written unquoted:

```mrtd
name
```

If it cannot be expressed as an identifier, it must be double-quoted:

```mrtd
"full name"
```

The same rule applies to field names in the header.

Operator-shaped text is not a valid identifier string in MRTD core. For
example, `trailing-commas` is not one unquoted string cell; it is operator-shaped
input and MUST be rejected unless a higher-level syntax mode later defines it.

### Scalar interpretation

In the MRTD core, plain scalar values are:

- identifiers may represent ordinary strings
- `true` and `false` represent booleans
- numbers follow MBF number parsing with the shared MRTD suffix surface described below

The current MRTD base scalar surface includes these suffixes:

- string suffixes:
  - `dt`
  - `bin`
  - `oct`
  - `hex`
- number suffixes:
  - `k`
  - `M`
  - `G`
  - `T`
  - `P`
  - `E`
  - `e`
  - `tau`
  - `deg`
  - `pi`

Portable MRTD implementations SHOULD support this set directly as part of MRTD
core rather than behind a named profile.

If an implementation does not have a natural host type for a suffixed scalar, it
MAY expose a source-level representation that preserves both the scalar value and
the suffix. It MUST NOT silently discard the suffix.

Unsupported suffixes SHOULD be rejected unless an application-specific extension
explicitly permits them.

Examples:

```mrtd
name score bonus
Ada 12 3k
Ben 4.5 2M
```

```mrtd
when
"2026-04-03"dt
```

```text
profiles = { "extended-scalars", "gis-data" }
```

## Multiline rows

A row may be written across multiple lines by wrapping the row in round brackets.

Example:

```mrtd
name:string age:int active:bool
( "Rena Holm"
  29
  true )
```

This is still one logical row.

The content inside the round brackets is parsed as one row and must still contain
exactly one cell per header field.

The same rule applies to the header row. A header may therefore be written as a
multiline round-bracket row if needed.

## Normalised model

Implementations should normalise MRTD into:

- ordered fields
- ordered rows

Equivalent conceptual model:

```text
Document
  fields: Field[]
  rows: Row[]

Field
  name: string
  type?: "int" | "float" | "bool" | "string"

Row
  cells: scalar[]
```

Implementations may additionally expose a record/object projection where each row
is represented as a mapping from field name to cell value.

## Errors

Implementations should report errors for:

- empty input
- missing header row
- invalid header cell syntax
- unsupported declared type
- row width not matching header width
- non-scalar values in data cells
- operator-shaped input where a core MRTD scalar/header cell is expected

## Conformance Test Mapping

- `shared/format-fixtures/mrtd/`: shared fixture coverage for core parsing/writing shape
- `shared/format-fixtures/conformance/mrtd/`: shared MBF level 0/1 conformance cases for untyped headers, identifier cells, and operator-boundary rejection

## Examples

Simple table:

```mrtd
name:string age:int active:bool
Ada 32 true
Ben 41 false
```

Quoted field names and values:

```mrtd
"full name":string city:string
"Rena Holm" Oslo
"Kai Berg" "Bergen sentrum"
```

Multiline row:

```mrtd
name:string note:string score:float
( "Rena Holm"
  "line-wrapped row"
  13.5 )
```
