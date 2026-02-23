# Makrell Sitegen (Fresh Scaffold)

This is a from-scratch static site generator attempt based on `vision.md`.

## What it includes

- Makrell CLI entrypoint: `erbuild.mr`
- Hierarchical sections/pages from `site.mron`
- Override chain: site defaults -> section values -> page values
- Mixed page format `.mr`:
  - MRON front matter between `---` markers
  - Body content in custom MR markup with optional raw MRML lines
- MRML templates with inline MakrellPy expressions (`{$ ...}`)
- Dist output with copied static assets
- Generated search index (`dist/search-index.json`)

## Run

From `src/impl/py/examples/sitegen`:

```bash
$env:PYTHONPATH='c:\eget\2026\Makrell\src\impl\py'
python -m makrell.cli erbuild.mr
```
