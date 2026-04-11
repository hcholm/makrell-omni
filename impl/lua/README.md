# Makrell Formats for Lua

This directory hosts the Lua MRON, MRML, and MRTD package.

Planned published package:

- `makrell-formats`

Current scope:

- explicit MBF level 0 tokenisation
- explicit MBF level 1 node parsing
- reserved level 2 parser entry point for later MBF growth
- MRON, MRML, and MRTD parsing and serialisation
- tests
- examples
- LuaRocks metadata
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- data-format support is intentionally capped at MBF level 1 today
- operator tokens are preserved so hyphenated barewords are rejected rather than misread as identifiers
- explicit shared `basic suffix profile` support for MRON and MRTD as a post-L1 conversion layer

## Install

For the `v0.10.0` Git tag from GitHub:

```bash
luarocks install https://raw.githubusercontent.com/hcholm/makrell-omni/v0.10.0/src/impl/lua/makrell-formats-dev-1.rockspec
```
