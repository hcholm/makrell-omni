# Makrell Formats for PHP

This directory hosts the PHP MRON, MRML, and MRTD package.

Planned published package:

- `makrell/formats`

Current scope:

- Composer metadata
- public API surface
- tests
- examples
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- comments and identifier-as-string handling in MRON and MRTD
- deterministic XML-style MRML serialisation
- basic MRTD type support: `string`, `int`, `float`, `bool`
- explicit shared `basic suffix profile` support for MRON and MRTD via `BasicSuffixProfile` as a post-L1 conversion layer

Current public model shapes:

- `Mron::parseString(...)` returns nested PHP arrays/scalars
- `Mrml::parseString(...)` returns an array with `name`, `attributes`, and `children`
- `Mrtd::parseString(...)` returns `columns`, `rows`, and `records`

## Install

From a checked-out `v0.10.0` GitHub source tree:

```json
{
  "repositories": [
    {
      "type": "path",
      "url": "../makrell-omni/src/impl/php"
    }
  ],
  "require": {
    "makrell/formats": "0.10.0"
  }
}
```
