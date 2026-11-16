---
name: dotfiles-maintainance-update
description: Update this dotfiles repository's maintained dependencies, especially vendored skill submodules like agent_skills, while preserving propagation and bootstrap conventions.
---

# Dotfiles Maintainance Update

Use this skill when updating repo-managed external dependencies, submodules, agent packages, generated lockfiles, or shared skills maintained from upstream sources.

Note: the skill name intentionally uses `maintainance` to match the repo-local naming requested by the maintainer.

## First checks

1. Read `/home/yang/dotfiles/AGENTS.md`.
2. Read `.agents/skills/dotfiles-maintenance/SKILL.md` for repository structure and skill distribution rules.
3. Check current state before updating:
   ```bash
   git status --short
   mise run ensure-submodules
   ```
   This repo has historical/stale submodule metadata, so avoid plain `git submodule status --recursive` as a required preflight; it may fail on gitlinks that are not represented in `.gitmodules`.
4. Do not auto-update unrelated package managers, lockfiles, or submodules unless the user asked for a broad update.

## Pi duplicate-skill rule

Pi warns on duplicate skill names from different real paths and keeps the first skill found. Pi silently deduplicates symlink aliases that resolve to the same canonical `SKILL.md` path.

Therefore:
- OK: installing a vendored submodule as a Pi package while also exposing the same submodule path through `skills/global`, because both point to the same real skill file.
- Avoid: installing the same upstream from a different real path (remote git source or registry) while also exposing the local submodule, because duplicate skill names from different real paths collide.

## Updating other submodules

For a named submodule:

```bash
git submodule update --remote <path>
git diff --submodule <path>
```

For all submodules only when explicitly requested:

```bash
git submodule update --remote --recursive
git diff --submodule
```

After any submodule update, re-run the narrow validation for whatever the submodule provides.

## Finishing checklist

1. `git status --short`
2. `git diff --submodule`
3. Validate affected skills.
4. Mention old/new submodule commit if available.
5. Mention any required bootstrap command, usually:
   ```bash
   mise run ensure-submodules
   ```
   If the update affects a Pi package, install it directly with `pi install <spec>`.
