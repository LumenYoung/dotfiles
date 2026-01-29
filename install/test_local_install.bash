#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

usage() {
	cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --desktop     Include desktop extras (nerdfont + kitty)
  -h, --help    Show this help message
EOF
}

DESKTOP_FLAG=""
while [[ $# -gt 0 ]]; do
	case "$1" in
	--desktop)
		DESKTOP_FLAG="--desktop"
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

if [[ ! -f "${REPO_ROOT}/propogate_dotfiles.py" ]]; then
	echo "Expected repo root one level above: ${REPO_ROOT}" >&2
	exit 1
fi

(cd "${SCRIPT_DIR}" && bash ./install_all.bash ${DESKTOP_FLAG})
