# Agents Guide

This repository syncs configuration into per-agent config directories via `destination.yaml`
(using `propogate_dotfiles.py`). Each top-level entry in the repo can be symlinked into
the destination path listed in `destination.yaml`.

## Skills strategy

We keep **Codex skills separate** and do not force them into the shared skills layout.
Codex keeps its own skills under `codex/skills/` and `codex/superpowers/skills/`.

For other agents (Gemini, OpenCode, and future CLIs), we **share the full Superpowers repo**
from `skills/superpowers` by symlinking it into each agent’s config directory.

If we introduce additional shared skill packs in the future, add them under `skills/` and
symlink as needed. Agent-specific skills stay in that agent’s own directory.

## Propagation behavior

- `propogate_dotfiles.py` reads `destination.yaml` and symlinks each repo entry into its
  destination path. It operates on **top-level entries** only.
- `skills/` is a shared root for agent-shared repos (currently `skills/superpowers`).
- Each agent’s `superpowers` directory is a symlink into this shared root.

## Current agent paths

- Codex: `~/.codex` → `dotfiles/codex` (superpowers symlinked)
- Gemini: `~/.gemini` → `dotfiles/gemini` (superpowers symlinked)
- OpenCode: `~/.config/opencode` → `dotfiles/opencode` (superpowers symlinked)
- Skills root: `~/.config/skills` → `dotfiles/skills`

Update this document whenever the skills layout or propagation rules change.
