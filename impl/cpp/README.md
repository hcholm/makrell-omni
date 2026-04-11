# Makrell Formats for C++

This directory hosts the C++ MRON, MRML, and MRTD library.

Planned published package:

- `makrell-formats-cpp`

Current scope:

- native C++ parsing and serialisation APIs for MRON, MRML, and MRTD
- tests
- examples
- CMake build metadata
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- comments and identifier-as-string handling in MRON and MRTD
- deterministic XML-style MRML serialisation
- basic MRTD type support: `string`, `int`, `float`, `bool`
- lightweight implementation intended as a portability baseline, not yet a full syntax-preserving MBF layer

Current public model types:

- `makrell::formats::MronValue`
- `makrell::formats::MrmlElement`
- `makrell::formats::MrtdDocument`
