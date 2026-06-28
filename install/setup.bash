#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MISE_BIN="${MISE_BIN:-}"

usage() {
	cat <<EOF
Usage: $0 [OPTIONS] [-- MISE_SETUP_ARGS...]

Options:
  --desktop    Run mise setup, then desktop extras
  -h, --help   Show this help message

This wrapper bootstraps mise, then installs repo-managed tools (including Claude Code) via:
  mise run setup
EOF
}

RUN_DESKTOP=false
args=()
while [[ $# -gt 0 ]]; do
	case "$1" in
	--desktop)
		RUN_DESKTOP=true
		shift
		;;
	-h|--help)
		usage
		exit 0
		;;
	--)
		shift
		args+=("$@")
		break
		;;
	*)
		args+=("$1")
		shift
		;;
	esac
done

if [[ -z "$MISE_BIN" ]]; then
	if command -v mise >/dev/null 2>&1; then
		MISE_BIN="$(command -v mise)"
	else
		mkdir -p "$HOME/.local/bin"
		curl https://mise.run | sh
		export PATH="$HOME/.local/bin:$PATH"
		MISE_BIN="$(command -v mise)"
	fi
fi

export PATH="$(dirname "$MISE_BIN"):$PATH"

cd "$REPO_ROOT"

bash mise-tasks/ensure-submodules

# Trust this repo-local mise.toml so bootstrap can run non-interactively.
"$MISE_BIN" trust "$REPO_ROOT/mise.toml" >/dev/null 2>&1 || true
"$MISE_BIN" run setup "${args[@]}"

if [[ "$RUN_DESKTOP" == "true" ]]; then
	"$MISE_BIN" run desktop
fi
