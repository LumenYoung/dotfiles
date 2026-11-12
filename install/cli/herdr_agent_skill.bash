#!/usr/bin/env bash
# Keep the legacy skill available to Codex, but out of Pi's unconditional discovery.
set -euo pipefail

migrate_only=false
if [[ "${1:-}" == "--migrate-shared-only" && $# == 1 ]]; then
  migrate_only=true
elif [[ $# != 0 ]]; then
  echo "Usage: $0 [--migrate-shared-only]" >&2
  exit 2
fi

shared_dir="$HOME/.agents/skills/herdr"
codex_dir="${CODEX_HOME:-$HOME/.codex}/skills/herdr"

# Download before changing existing files. Preserve the existing Codex installation
# contract; Pi uses the repo's thin opt-in adapter instead of this upstream copy.
if [[ "$migrate_only" != true ]]; then
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' EXIT
  url="https://raw.githubusercontent.com/herdrdev/herdr/master/skills/herdr/SKILL.md"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$tmp"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$tmp" "$url"
  else
    echo "ERROR: curl or wget is required to install the Herdr agent skill." >&2
    exit 1
  fi
  if ! grep -q '^name: herdr$' "$tmp"; then
    echo "ERROR: downloaded Herdr skill is missing its expected name; no files changed." >&2
    exit 1
  fi
fi

if [[ -e "$shared_dir" || -L "$shared_dir" ]]; then
  if [[ -L "$shared_dir" ]]; then
    echo "ERROR: shared Herdr skill is a symlink at $shared_dir; relocate it outside skill roots manually." >&2
    exit 1
  fi
  if [[ ! -f "$shared_dir/SKILL.md" ]] || ! grep -q '^name: herdr$' "$shared_dir/SKILL.md"; then
    echo "ERROR: unrecognized shared Herdr skill at $shared_dir; move it outside skill roots manually." >&2
    exit 1
  fi
  state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/dotfiles/herdr-skills"
  mkdir -p "$state_dir"
  backup="$(mktemp -d "$state_dir/backup.XXXXXXXX")"
  mv -- "$shared_dir" "$backup/herdr"
  echo "Moved unconditional Herdr skill to $backup/herdr (preserved, not deleted)."
fi

if [[ "$migrate_only" != true ]]; then
  mkdir -p "$codex_dir"
  cp "$tmp" "$codex_dir/SKILL.md"
  echo "Installed legacy Herdr skill for Codex: $codex_dir/SKILL.md"
fi

echo "Pi's herdr-context extension conditionally loads skills from ~/.config/optin-skills/herdr/."
