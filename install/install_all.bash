#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLI_DIR="${SCRIPT_DIR}/cli"
DESKTOP_DIR="${SCRIPT_DIR}/desktop"

ENV_NAME="main"
MAMBA_ROOT_PREFIX="${MAMBA_ROOT_PREFIX:-}"
DESKTOP=false
SKIP_PROPAGATE=false
FORCE_REINSTALL=false
LOG_FILE="${LOG_FILE:-$HOME/.local/tools/install_all.log}"
MICROMAMBA_BIN="micromamba"
FISH_VERSION_DEFAULT="4.0.2"
NVIM_TAG_DEFAULT="master"

usage() {
	cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --desktop          Install desktop extras (nerdfont + kitty)
  --skip-propagate   Skip running propogate_dotfiles.py
  -f, --force        Force reinstall of fish and neovim
  -h, --help         Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--desktop)
		DESKTOP=true
		shift
		;;
	--skip-propagate)
		SKIP_PROPAGATE=true
		shift
		;;
	-f | --force)
		FORCE_REINSTALL=true
		shift
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		echo "Unknown option: $1" >&2
		usage
		exit 1
		;;
	esac
done

ensure_local_bin_path() {
	if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
		export PATH="$HOME/.local/bin:$PATH"
	fi
}

ensure_bash_alias() {
	local bashrc="$HOME/.bashrc"
	touch "$bashrc"
	if ! grep -Fxq 'alias ef="exec fish"' "$bashrc"; then
		echo 'alias ef="exec fish"' >>"$bashrc"
	fi
}

ensure_bash_local_bin_path() {
	local bashrc="$HOME/.bashrc"
	touch "$bashrc"
	if ! grep -Fq 'export PATH="$HOME/.local/bin:$PATH"' "$bashrc"; then
		echo 'export PATH="$HOME/.local/bin:$PATH"' >>"$bashrc"
	fi
}

ensure_fish_local_bin_path() {
	local fish_config="$HOME/.config/fish/config.fish"
	mkdir -p "$(dirname "$fish_config")"
	if ! grep -Fq 'fish_add_path "$HOME/.local/bin"' "$fish_config" 2>/dev/null; then
		cat <<'EOF' >>"$fish_config"
if test -d "$HOME/.local/bin"
  fish_add_path "$HOME/.local/bin"
end
EOF
	fi
}

install_micromamba() {
	ensure_local_bin_path
	if command -v micromamba >/dev/null 2>&1; then
		MICROMAMBA_BIN="$(command -v micromamba)"
	else
		bash "$CLI_DIR/micromamba_install.bash"
		MICROMAMBA_BIN="$(command -v micromamba)"
	fi

	ensure_local_bin_path
	if [[ -z "${MAMBA_ROOT_PREFIX}" ]]; then
		MAMBA_ROOT_PREFIX="$HOME/.micromamba"
	fi
	export MAMBA_ROOT_PREFIX
	export MICROMAMBA_BIN
	"$MICROMAMBA_BIN" shell init -s fish >/dev/null 2>&1 || true
}

install_micromamba_env() {
	local packages=(
		gcc
		gxx
		cmake
		ninja
		make
		pkg-config
		git
		curl
		wget
		gettext
		nodejs
		rust
		just
		fontconfig
	)

	if "$MICROMAMBA_BIN" env list | grep -Eq "^[[:space:]]*${ENV_NAME}[[:space:]]"; then
		"$MICROMAMBA_BIN" install -y -n "$ENV_NAME" -c conda-forge "${packages[@]}"
	else
		"$MICROMAMBA_BIN" create -y -n "$ENV_NAME" -c conda-forge "${packages[@]}"
	fi
}

run_in_env() {
	"$MICROMAMBA_BIN" run -n "$ENV_NAME" "$@"
}

main() {
	mkdir -p "$(dirname "$LOG_FILE")"
	echo "=== install_all started at $(date) ===" | tee "$LOG_FILE"

	ensure_bash_alias
	ensure_bash_local_bin_path
	ensure_fish_local_bin_path

	echo "[1/6] Installing micromamba" | tee -a "$LOG_FILE"
	install_micromamba
	echo "[2/6] Creating/updating micromamba env '${ENV_NAME}'" | tee -a "$LOG_FILE"
	install_micromamba_env

	echo "[3/6] Installing fish from source" | tee -a "$LOG_FILE"
	if [[ "$FORCE_REINSTALL" == "true" ]]; then
		run_in_env bash "$CLI_DIR/fish_install.bash"
	else
		if command -v fish >/dev/null 2>&1; then
			current_fish_version="$(fish --version | awk '{print $3}')"
			if [[ "$current_fish_version" == "$FISH_VERSION_DEFAULT" ]]; then
				echo "fish ${current_fish_version} already installed; skipping" | tee -a "$LOG_FILE"
			else
				run_in_env bash "$CLI_DIR/fish_install.bash"
			fi
		else
			run_in_env bash "$CLI_DIR/fish_install.bash"
		fi
	fi
	echo "[4/6] Installing common CLI tools" | tee -a "$LOG_FILE"
	run_in_env bash "$CLI_DIR/common_cli_install.bash"
	echo "[5/6] Building neovim from source" | tee -a "$LOG_FILE"
	if [[ "$FORCE_REINSTALL" == "true" ]]; then
		run_in_env bash "$CLI_DIR/nvim_install_from_source.bash"
	else
		if command -v nvim >/dev/null 2>&1; then
			if [[ "$NVIM_TAG_DEFAULT" == "master" ]]; then
				echo "nvim installed and tag is master; skipping (use --force to rebuild)" | tee -a "$LOG_FILE"
			else
				current_nvim_version="$(nvim --version | head -n 1 | awk '{print $2}' | sed 's/^v//')"
				if [[ "v${current_nvim_version}" == "$NVIM_TAG_DEFAULT" ]]; then
					echo "nvim ${current_nvim_version} already installed; skipping" | tee -a "$LOG_FILE"
				else
					run_in_env bash "$CLI_DIR/nvim_install_from_source.bash"
				fi
			fi
		else
			run_in_env bash "$CLI_DIR/nvim_install_from_source.bash"
		fi
	fi

	if [[ "$DESKTOP" == "true" ]]; then
		echo "[6/6] Installing desktop extras (nerdfont + kitty)" | tee -a "$LOG_FILE"
		run_in_env bash "$DESKTOP_DIR/nerdfont_install.bash"
		run_in_env bash "$DESKTOP_DIR/kitty_install.bash"
	fi

	if [[ "$SKIP_PROPAGATE" != "true" ]]; then
		echo "Running propogate_dotfiles.py" | tee -a "$LOG_FILE"
		python3 "$REPO_ROOT/propogate_dotfiles.py"
	fi

	echo "=== install_all finished at $(date) ===" | tee -a "$LOG_FILE"
}

main "$@"
