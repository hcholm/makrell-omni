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
- explicit MBF level 0/1 implementation for the data formats, with level 2 reserved for later
- shared `basic suffix profile` support for MRON and MRTD, exposed explicitly via `BasicSuffixProfile` as a post-L1 conversion layer

The code structure keeps room for:

- a future syntax-preserving MBF layer
- format/native-model adapters
- later full Makrell-on-JVM support

Current public model types:

- `Mron.parseString(...)` returns native `Map`, `List`, and scalar values
- `Mrml.parseString(...)` returns `MrmlElement`
- `Mrtd.parseString(...)` returns `MrtdDocument`
- `BasicSuffixProfile` exposes the shared suffix conversion layer directly for reuse by other format/language code

## Publishing

The JVM track is set up for `v0.10.0` publication as:

- group: `dev.makrell`
- artifact: `makrell-formats`
- version: `0.10.0`

For GitHub Packages publication, provide:

- `GITHUB_PACKAGES_USERNAME`
- `GITHUB_PACKAGES_TOKEN`

Then run:

```bash
gradle publishMavenJavaPublicationToGitHubPackagesRepository
```

For Maven Central publication via the Sonatype Central Portal compatibility
endpoint, provide:

- `MAVEN_CENTRAL_USERNAME`
- `MAVEN_CENTRAL_PASSWORD`
- `SIGNING_IN_MEMORY_KEY`
- `SIGNING_IN_MEMORY_KEY_PASSWORD`

You can also put the same values in a local, untracked Gradle properties file
using `gradle.properties.example` as the template.

Then run:

```bash
gradle clean publishMavenJavaPublicationToMavenCentralRepository
```

For a dry run to local Maven only:

```bash
gradle publishToMavenLocal
```

The published POM includes licence, developer, and SCM metadata, and the build
signs release publications when signing credentials are present.
