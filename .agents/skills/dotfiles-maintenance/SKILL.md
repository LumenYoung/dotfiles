---
name: dotfiles-maintenance
description: Maintain this dotfiles repository: propagation rules, bootstrap behavior, agent config layout, and skill distribution across Codex, Pi, Claude, OpenCode, and shared/global skill roots.
---

# Dotfiles Maintenance

Use this skill when changing repository structure, bootstrap/setup scripts, `destination.yaml`, `propogate_dotfiles.py`, agent config directories, or skill distribution conventions.

## First checks

1. Read `/home/yang/dotfiles/AGENTS.md` for repository-wide rules.
2. Inspect the relevant propagation inputs before editing:
   - `destination.yaml`
   - `propogate_dotfiles.py`
   - `mise.toml`
   - `install/setup.bash`
3. Prefer small, explicit changes. This repo manages real home-directory config through symlinks, so avoid broad rewrites unless requested.

## Skill distribution model

This repo has four skill roles. Do not mix them.

### 1. Project-local dotfiles skills

Path: `.agents/skills/<skill-name>/SKILL.md`

Use for skills that only make sense when an agent is working inside this dotfiles repo. These skills document repo maintenance practices and are discovered from the current working directory / ancestor project context.

Current examples:
- `.agents/skills/dotfiles-skill-creator/`
- `.agents/skills/dotfiles-maintenance/`

Rules:
- Do not propagate `.agents/skills/` globally.
- Do not place general-purpose reusable skills here.
- If creating or changing skills, load `dotfiles-skill-creator` first.

### 2. Governed globally shared skills

Source of truth: `skills/global/<skill-name>/SKILL.md`

Use for portable skills that should be available outside this repo and governed from this dotfiles repository.

Current examples:
- `skills/global/html-artifacts/`
- `skills/global/iwe-kb-bootstrap/`

Exposure to agents is through repo-internal relative symlinks:
- `codex/skills/global -> ../../skills/global`
- `pi-agent/skills/global -> ../../skills/global`
- `claude/skills/global -> ../../skills/global`

Rules:
- Maintain shared skill content under `skills/global/`, not under an agent-specific directory.
- Keep the relative symlinks intact; do not replace them with copied directories or absolute home-directory symlinks.
- If an agent cannot discover nested symlinked skills, add an explicit agent-specific link/config for that agent instead of duplicating source content.

### 3. Externally maintained vendored skills/packages

Path: `skills/vendor/<upstream-name>/`

Use for upstream repositories tracked as git submodules or otherwise maintained externally. This keeps upstream history/layout intact while letting this repo expose selected skills through the governed global skill root.

Current examples:
- `skills/vendor/visual-explainer/`
- `skills/global/visual-explainer -> ../vendor/visual-explainer/plugins/visual-explainer`

Rules:
- Do not edit vendored upstream content casually; prefer updating the submodule pointer.
- Expose only the actual skill directory through `skills/global/`.
- If the upstream package also provides Pi extensions/prompts, Pi package install may be used, but point it at the same local submodule path to avoid duplicate skill-name collisions from different real paths.

### 4. Agent-specific skills

Paths:
- Codex-specific: `codex/skills/<skill-name>/SKILL.md`
- Pi-specific: `pi-agent/skills/<skill-name>/SKILL.md`
- Claude-specific: `claude/skills/<skill-name>/SKILL.md`

Use only when a skill depends on non-portable behavior of that agent, such as an agent-specific tool, plugin system, prompt format, or runtime convention.

Rules:
- Add a short note in the skill explaining why it is agent-specific.
- Do not treat `codex/skills/` as the governed shared-skill source; Codex may also contain system/user-installed skills.
- Keep agent-specific skills separate from `skills/global/`.

## Propagation implications

`propogate_dotfiles.py` symlinks configured repo entries into home-directory destinations from `destination.yaml`.

Important behavior:
- Propagation operates on configured entries, not arbitrary nested files.
- `--agents` currently propagates agent config roots such as `codex`, `claude/skills`, `pi-agent/skills`, `pi-agent/extensions`, and related config files.
- The relative `global` symlinks inside each agent skill root are what expose `skills/global` to each agent after propagation.
- If adding a new top-level config root, update both `destination.yaml` and the relevant config list in `propogate_dotfiles.py`.

## Bootstrap implications

`install/setup.bash` bootstraps `mise`, then runs `mise run setup`. The `setup` task in `mise.toml` installs tools, propagates core and agent configs, installs Pi packages, and installs integration helpers.

When adding external/vendored dependencies such as git submodules:
- Initialize/update them before tasks that depend on their files.
- Prefer a dedicated `mise` task as well as wrapper support in `install/setup.bash`, because users may run either entrypoint.
- Pi deduplicates symlink aliases that resolve to the same canonical `SKILL.md` path, so a local Pi package install and a `skills/global` symlink can coexist when both point at the same submodule checkout.
- Avoid installing the same skill from a different clone/source while also exposing the local submodule through `skills/global`; Pi warns on same-name skill collisions from different real paths and keeps the first discovered skill.

## Maintenance checklist

Before finishing a repo-maintenance change:

1. Verify affected symlinks with `ls -l` or `find`.
2. Run any narrow validation script for the changed area.
3. If a skill was created or edited, validate it with `.agents/skills/dotfiles-skill-creator/scripts/quick_validate.py <skill-dir>`.
4. Update `AGENTS.md` when the change affects repository-wide conventions.
5. Report exact paths changed and any bootstrap/propagation follow-up required.
