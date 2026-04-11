# Makrell Formats for Ruby

This directory hosts the Ruby MRON, MRML, and MRTD package.

Planned published package:

- `makrell-formats`

Current scope:

- explicit MBF level 0 tokenisation
- explicit MBF level 1 node parsing
- reserved level 2 parser entry point for later MBF growth
- MRON, MRML, and MRTD parsing and serialisation
- tests
- examples
- gem metadata
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- data-format support is intentionally capped at MBF level 1 today
- operator tokens are preserved so hyphenated barewords are rejected rather than misread as identifiers
- explicit shared `basic suffix profile` support for MRON and MRTD as a post-L1 conversion layer
