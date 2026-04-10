# OpenCode (opencode)

Config is synced from this folder to `~/.config/opencode` via `destination.yaml`.

## Install Oh My OpenCode plugin

Bun is required.

```bash
# Install bun (for bunx)
curl -fsSL https://bun.sh/install | bash

# Install OpenCode
bun install -g opencode-ai

# Ensure Bun is on fish PATH (append to ~/.local.fish if present; otherwise append and warn)
if test -f ~/.local.fish
    echo 'fish_add_path ~/.bun/bin' >> ~/.local.fish
else
    echo 'fish_add_path ~/.bun/bin' >> ~/.local.fish
    echo "Warning: ~/.local.fish did not exist; created and appended bun path."
end

# Install plugin
bunx oh-my-opencode install
```

See the official guide for subscription setup: https://github.com/code-yeongyu/oh-my-opencode

## Investigation agents

This repo now includes custom OpenCode agents in `opencode/agents/`:

- `investigate` (primary): read-only investigation mode with bash enabled for validation.
- `locator` (subagent): finds where relevant code and pipeline files live.
- `analyzer` (subagent): explains how the located code works with file:line evidence.
- `Codex` (primary): fuller Codex-style operating manual adapted for OpenCode constraints; preferred for behavior comparison.

Because `opencode` is synced to `~/.config/opencode`, these load from `~/.config/opencode/agents/` after propagation.
