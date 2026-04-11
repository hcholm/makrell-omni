# Makrell Formats for JVM

This directory hosts the JVM MRON, MRML, and MRTD package.

Planned published package:

- Maven/Gradle coordinate: `dev.makrell:makrell-formats`

Current scope:

- API surface for MRON, MRML, and MRTD
- tests
- examples
- MIT licence metadata
- Maven publication metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- file parsing, native-model parsing, and deterministic serialisation
- comments and identifier-as-string handling in MRON and MRTD
- basic MRTD type support: `string`, `int`, `float`, `bool`
- lightweight implementation intended as a portability baseline, not yet a full MBF-preserving layer

The code structure keeps room for:

- a future syntax-preserving MBF layer
- format/native-model adapters
- later full Makrell-on-JVM support

Current public model types:

- `Mron.parseString(...)` returns native `Map`, `List`, and scalar values
- `Mrml.parseString(...)` returns `MrmlElement`
- `Mrtd.parseString(...)` returns `MrtdDocument`
