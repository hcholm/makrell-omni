# Makrell Formats for R

This directory hosts the R MRON, MRML, and MRTD package.

Planned published package:

- `makrellformats`

Current scope:

- base-R parsing and serialisation APIs for MRON, MRML, and MRTD
- tests
- examples
- package metadata
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- comments and identifier-as-string handling in MRON and MRTD
- deterministic XML-style MRML serialisation
- basic MRTD type support: `string`, `int`, `float`, `bool`
- explicit shared `basic suffix profile` support for MRON and MRTD via `apply_basic_suffix_profile(...)` as a post-L1 conversion layer

## Install

For the `v0.10.0` Git tag from GitHub:

```r
remotes::install_github("hcholm/makrell-omni", ref = "v0.10.0", subdir = "src/impl/r")
```
