# Makrell Formats for Rust

This directory hosts the Rust MRON, MRML, and MRTD crate.

Planned published crate:

- `makrell-formats`

Current scope:

- native Rust parsing and serialisation APIs for MRON, MRML, and MRTD
- tests
- examples
- Cargo publication metadata
- MIT licence metadata

Current status:

- first working core pass for MRON, MRML, and MRTD
- comments and identifier-as-string handling in MRON and MRTD
- deterministic XML-style MRML serialisation
- basic MRTD type support: `string`, `int`, `float`, `bool`
- explicit shared `basic suffix profile` support for MRON and MRTD via `apply_basic_suffix_profile(...)` as a post-L1 conversion layer

Current public model types:

- `mron::MronValue`
- `mrml::MrmlElement`
- `mrtd::MrtdDocument`

## Install

For the `v0.10.0` Git tag from GitHub:

```toml
[dependencies]
makrell-formats = { git = "https://github.com/hcholm/makrell-omni.git", tag = "v0.10.0", package = "makrell-formats" }
```
