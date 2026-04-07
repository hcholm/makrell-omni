# Makrell Skills for Claude Code

This directory contains Claude Code skills for working with the Makrell language family. They give Claude context about Makrell syntax, formats, tooling, and conversion patterns so it can assist effectively in any project that uses Makrell.

## Skills

| Skill | Slash command | What it does |
|-------|---------------|-------------|
| [makrell-code](makrell-code/SKILL.md) | `/makrell-code` | Write and explain MakrellPy, MakrellTS, and Makrell# code |
| [makrell-data](makrell-data/SKILL.md) | `/makrell-data` | Work with MRON, MRML, and MRTD data/markup formats |
| [makrell-run](makrell-run/SKILL.md) | `/makrell-run` | Run, check, build, and diagnose Makrell files |
| [makrell-convert](makrell-convert/SKILL.md) | `/makrell-convert` | Convert between JSON↔MRON, HTML↔MRML, CSV↔MRTD |

## How to use in your project

### Option 1: Add the monorepo as an additional directory

In your project's `.claude/settings.json`:

```json
{
  "additionalDirectories": ["/path/to/makrell-omni/src/skills"]
}
```

Or when launching Claude Code:

```bash
claude --add-dir /path/to/makrell-omni/src/skills
```

### Option 2: Copy into your project

Copy the skill directories you need into your project's `.claude/skills/`:

```
your-project/
  .claude/
    skills/
      makrell-code/
        SKILL.md
      makrell-data/
        SKILL.md
```

### Option 3: Symlink

```bash
# From your project root
mkdir -p .claude/skills
ln -s /path/to/makrell-omni/src/skills/makrell-code .claude/skills/makrell-code
ln -s /path/to/makrell-omni/src/skills/makrell-data .claude/skills/makrell-data
ln -s /path/to/makrell-omni/src/skills/makrell-run  .claude/skills/makrell-run
ln -s /path/to/makrell-omni/src/skills/makrell-convert .claude/skills/makrell-convert
```

## Skill details

**makrell-code** — Loaded automatically when Claude encounters Makrell source files. Contains the full syntax quick reference, operator precedence table, and guidelines for writing idiomatic Makrell across all three language tracks.

**makrell-data** — Loaded automatically when working with `.mron`, `.mrml`, or `.mrtd` files. Covers syntax, structure rules, comparison tables against JSON/HTML/CSV, and programmatic access from all three host languages.

**makrell-run** — Invoked manually via `/makrell-run`. Covers all CLI commands for running scripts, checking diagnostics, emitting host-language output, and building assemblies. Marked `disable-model-invocation: true` since it executes commands.

**makrell-convert** — Loaded automatically when converting between formats. Contains step-by-step conversion procedures and mapping tables for JSON↔MRON, HTML↔MRML, and CSV↔MRTD.
