# OpenCode (opencode)

Config is synced from this folder to `~/.config/opencode` via `destination.yaml`.

## Investigation agents

This repo now includes custom OpenCode agents in `opencode/agents/`:

- `investigate` (primary): read-only investigation mode with bash enabled for validation.
- `locator` (subagent): finds where relevant code and pipeline files live.
- `analyzer` (subagent): explains how the located code works with file:line evidence.
- `Codex` (primary): fuller Codex-style operating manual adapted for OpenCode constraints; preferred for behavior comparison.

Because `opencode` is synced to `~/.config/opencode`, these load from `~/.config/opencode/agents/` after propagation.
