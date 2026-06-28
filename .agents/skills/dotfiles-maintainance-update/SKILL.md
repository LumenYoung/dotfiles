---
name: dotfiles-maintainance-update
description: Update this dotfiles repository's maintained dependencies, especially vendored skill submodules like visual-explainer, while preserving propagation and bootstrap conventions.
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

## Updating visual-explainer

`visual-explainer` is maintained upstream and vendored as a git submodule under:

```text
skills/vendor/visual-explainer
```

It is exposed as a governed global skill through:

```text
skills/global/visual-explainer -> ../vendor/visual-explainer/plugins/visual-explainer
```

Pi may also install the local submodule as a package to get the native `visual_explainer` tool and prompt templates. The package install must point at the same local submodule path to avoid duplicate skill-name collisions with the global symlink.

### Update procedure

1. Fetch and move the submodule to upstream's latest tracked commit:
   ```bash
   git submodule update --remote skills/vendor/visual-explainer
   ```
2. Inspect what changed:
   ```bash
   git -C skills/vendor/visual-explainer log --oneline --decorate -10
   git -C skills/vendor/visual-explainer diff --stat HEAD@{1}..HEAD || true
   ```
   If `HEAD@{1}` is unavailable, compare against the old submodule commit shown by the parent repo diff.
3. Read upstream release notes and key files:
   ```bash
   sed -n '1,220p' skills/vendor/visual-explainer/CHANGELOG.md
   sed -n '1,220p' skills/vendor/visual-explainer/plugins/visual-explainer/SKILL.md
   sed -n '1,220p' skills/vendor/visual-explainer/package.json
   ```
4. Verify the global symlink still resolves to a valid skill:
   ```bash
   test -f skills/global/visual-explainer/SKILL.md
   .agents/skills/dotfiles-skill-creator/scripts/quick_validate.py skills/global/visual-explainer
   ```
5. If `package.json` Pi metadata changed, review whether `mise-tasks/install-pi-packages`, `pi-agent/settings.json`, or docs need updates.
6. If prompt/tool behavior changed, note the impact in the final response.
7. Stage the parent repo submodule pointer change, not files inside the submodule unless intentionally contributing upstream.

## Pi duplicate-skill rule

Pi warns on duplicate skill names from different real paths and keeps the first skill found. Pi silently deduplicates symlink aliases that resolve to the same canonical `SKILL.md` path.

Therefore:
- OK: `pi install /home/yang/dotfiles/skills/vendor/visual-explainer` plus `skills/global/visual-explainer` symlink, because both point to the same real skill file.
- Avoid: `pi install git:github.com/nicobailon/visual-explainer` while also exposing the local submodule through `skills/global`, because those are different real paths with the same `visual-explainer` skill name.

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
   mise run install-pi-packages
   ```
