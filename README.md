## My dot files

This repo stores config file mappings in `destination.yaml` for my machines.

## Bootstrap a machine

Use the thin setup wrapper. It installs `mise` if needed, trusts this repo's `mise.toml`, then runs `mise run setup`.

```bash
bash install/setup.bash
```

`mise run setup` installs mise-managed CLI tools, creates `~/.local.fish`, propagates core configs, and tries to build fish. Fish build failure is non-fatal because some hosts may not have a C++ compiler.

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
`mise run ensure-local-fish` creates the file if it does not exist.

## ZSH

Use a `~/.local.zsh` file to store zsh commands that will not be synced.
