# Makrell Formats for C

This directory hosts the C MRON, MRML, and MRTD library.

Planned published package:

- `makrell-formats-c`

Current scope:

- C parsing and serialisation APIs for MRON, MRML, and MRTD
- tests
- examples
- CMake build metadata
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- comments and identifier-as-string handling in MRON and MRTD
- deterministic XML-style MRML serialisation
- basic MRTD type support: `string`, `int`, `float`, `bool`
- explicit shared `basic suffix profile` support for MRON and MRTD via `mf_apply_basic_suffix_profile(...)` as a post-L1 conversion layer
