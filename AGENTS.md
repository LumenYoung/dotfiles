# Agents Guide

This repository syncs configuration into per-agent config directories via `destination.yaml`
(using `propogate_dotfiles.py`). Each top-level entry in the repo can be symlinked into
the destination path listed in `destination.yaml`.

## Skills strategy

This repo has four distinct skill roles:

1. **Project-local skills for this dotfiles repo** live under `.agents/skills/`.
   Use these for instructions that only make sense when an agent is working in this repo
   (for example, `dotfiles-skill-creator` and `dotfiles-maintenance`). Pi discovers
   `.agents/skills/` from the cwd and ancestors, and Codex also supports the `.agents`
   skills convention.
2. **Governed globally shared skills** live under `skills/global/`. These are the shared
   skills this repo maintains for use outside this repo. Expose them to agent skill roots with
   repo-internal relative symlinks, e.g. `codex/skills/global -> ../../skills/global`.
3. **Externally maintained vendored skills/packages** live under `skills/vendor/`. Use this
   for upstream repos tracked as submodules. Expose the actual skill directory through
   `skills/global/` when it should be globally available.
4. **Opt-in skills** live under `optin-skills/<project>/`. These are intentionally outside auto-discovered
   agent skill roots and are mapped to `~/.config/optin-skills` for explicit CLI use such as
   `pi --skill ~/.config/optin-skills/<project>/...` or wrapper functions like `pi-marimo`.

Keep **agent-specific skills separate**. Codex keeps its own skills under `codex/skills/`
and may install additional Codex system/user skills there; do not treat `codex/skills/` as
the governed shared-skill source of truth. Pi-specific skills can live under `pi-agent/skills/`.
The whole Pi agent directory is managed at `pi-agent/`, including global instructions,
subagent definitions, MCP config, settings, extensions, scripts, and ignored runtime state.

If we introduce additional shared skill packs in the future, add them under `skills/` and
symlink/configure as needed. Agent-specific skills stay in that agent’s own directory.

## Propagation behavior

- `propogate_dotfiles.py` reads `destination.yaml` and symlinks each repo entry into its
  destination path. It operates on **top-level entries** only.
- `--core` propagates daily shell/editor configs. `--agents` propagates Codex,
  OpenCode, T3 Code, related systemd user units, helper binaries used by agents,
  and the whole Pi agent directory.
- `.agents/skills/` is intentionally not propagated globally; it is project-local.
- `skills/global/` is intentionally not propagated directly to a home-directory path; it is
  exposed through relative symlinks inside each agent's skill root.
- `skills/vendor/` is for externally maintained upstream repos/submodules. Governed exposure
  still happens through `skills/global/` symlinks.
- `optin-skills/` is propagated to `~/.config/optin-skills` and can be included by both `--core`
  and `--agents` because shell wrappers may reference it while agent commands consume it.
- Each agent may still have its own skill directory for agent-specific or tool-installed skills.

## Current agent paths

- Codex: `~/.codex` → `dotfiles/codex` (superpowers symlinked)
- Gemini: `~/.gemini` → `dotfiles/gemini` (superpowers symlinked)
- OpenCode: `~/.config/opencode` → `dotfiles/opencode` (superpowers symlinked)
- Pi: `~/.pi/agent` → `dotfiles/pi-agent`
- Project-local skills: `dotfiles/.agents/skills`
- Governed global skills source: `dotfiles/skills/global`
- Vendored upstream skill/package source: `dotfiles/skills/vendor`
- Opt-in skill source: `dotfiles/optin-skills` → `~/.config/optin-skills`
- Relative shared-skill links:
  - `codex/skills/global` → `../../skills/global`
  - `pi-agent/skills/global` → `../../skills/global`
  - `claude/skills/global` → `../../skills/global`

Update this document whenever the skills layout or propagation rules change.
