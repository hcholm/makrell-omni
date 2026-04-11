# Makrell Formats for Haskell

This directory hosts the Haskell MRON, MRML, and MRTD package.

Planned published package:

- `makrell-formats`

Current scope:

- Haskell parsing and serialisation APIs for MRON, MRML, and MRTD
- tests
- examples
- Cabal metadata
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- comments and identifier-as-string handling in MRON and MRTD
- deterministic XML-style MRML serialisation
- basic MRTD type support: `string`, `int`, `float`, `bool`
- lightweight implementation intended as a portability baseline, not yet a full syntax-preserving MBF layer
