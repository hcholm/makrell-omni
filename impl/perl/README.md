# Makrell Formats for Perl

This directory hosts the Perl MRON, MRML, and MRTD package.

Planned published package:

- `Makrell::Formats`

Current scope:

- explicit MBF level 0 tokenisation
- explicit MBF level 1 node parsing
- reserved level 2 parser entry point for later MBF growth
- MRON, MRML, and MRTD parsing and serialisation
- tests
- examples
- package metadata
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- data-format support is intentionally capped at MBF level 1 today
- explicit operator tokens so hyphenated barewords are not silently treated as identifiers
- deterministic XML-style MRML serialisation
- basic MRTD type support: `string`, `int`, `float`, `bool`
- explicit shared `basic suffix profile` support for MRON and MRTD as a post-L1 conversion layer
