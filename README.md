## My dot files

This repo stores config file mappings in `destination.yaml` for my machines.

## Bootstrap a machine

Use the thin setup wrapper. It installs `mise` if needed, trusts this repo's `mise.toml`, then runs `mise run setup`. During setup, if old `~/.local/bin` binaries are found for tools now managed by mise, setup prompts once before removing them. The managed tools are available on PATH in shells that activate mise; without activation, run them through `mise exec -- <tool>` or add mise activation to your shell startup.

```bash
bash install/setup.bash
```

Preview legacy user-space binaries that are now managed by mise:

```bash
mise run clean-user-tools
mise run clean-user-tools -- --yes
```

`mise run setup` installs mise-managed CLI tools, creates `~/.local.fish`, propagates core configs, and tries to build fish. Fish is built with mise-provided build dependencies but installed into normal user-local paths such as `~/.local/bin/fish`; it should not require mise internals to start. Fish build failure is non-fatal because some hosts may not have a C++ compiler.

Core propagation links: `nvim`, `zellij`, `fish`, `btop`, `yazi`, and `lazygit`.

## Common commands

```bash
mise run setup          # core bootstrap
mise run propagate-core # link core configs only
mise run propagate      # link all configs from destination.yaml
mise run desktop        # install nerd font + kitty extras
mise run install-fish   # retry fish source build after installing host C++ compiler
mise run nvim-source    # optional Neovim source build fallback
```

## Local machine overrides

Use `~/.local.fish` for fish commands that should not be synced.
`mise run ensure-local-fish` creates the file if it does not exist. Mise activation and shims PATH setup live in the versioned fish config so mise-managed tools are available in interactive fish.

## ZSH

Use a `~/.local.zsh` file to store zsh commands that will not be synced.
