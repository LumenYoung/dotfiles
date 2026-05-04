#!/usr/bin/env bash

set -euo pipefail

# Clone neovim, build and install it at ~/.local/

# Default tag
TAG="v0.12.0"
NEOVIM_REPO_URL="https://github.com/neovim/neovim"
NEOVIM_SRC_DIR="${NEOVIM_SRC_DIR:-$HOME/.local/tools/neovim}"

# Help function
show_help() {
    cat <<EOF
Usage: $0 [-t TAG] [-d DIR] [-h]

Clone, build and install neovim from source at ~/.local/

Options:
    -t TAG    Specify the git tag/version to build (default: v0.12.0)
    -d DIR    Source checkout directory (default: \$HOME/.local/tools/neovim)
    -h        Show this help message

Examples:
    $0                  # Install default version (v0.12.0)
    $0 -t v0.12.1      # Install specific version
    $0 -t master       # Install latest master branch

EOF
}

# Parse command line arguments
while getopts "t:d:h" opt; do
    case $opt in
    t)
        TAG="$OPTARG"
        ;;
    d)
        NEOVIM_SRC_DIR="$OPTARG"
        ;;
    h)
        show_help
        exit 0
        ;;
    \?)
        echo "Invalid option: -$OPTARG" >&2
        show_help
        exit 1
        ;;
    esac
done

echo "Building neovim tag/branch: $TAG"
echo "Using neovim source directory: $NEOVIM_SRC_DIR"

# Ensure parent directory exists
mkdir -p "$(dirname "$NEOVIM_SRC_DIR")"

# Check if neovim directory exists, if not clone the repo
if [[ -d "$NEOVIM_SRC_DIR/.git" ]]; then
    git -C "$NEOVIM_SRC_DIR" fetch --all --tags
    git -C "$NEOVIM_SRC_DIR" checkout "$TAG"
    echo "neovim directory exists, checked out $TAG"
elif [[ -d "$NEOVIM_SRC_DIR" ]]; then
    echo "Error: $NEOVIM_SRC_DIR exists but is not a git repository." >&2
    echo "Set NEOVIM_SRC_DIR to another path or remove the directory and retry." >&2
    exit 1
else
    git clone "$NEOVIM_REPO_URL" "$NEOVIM_SRC_DIR"
    git -C "$NEOVIM_SRC_DIR" checkout "$TAG"
fi

cd "$NEOVIM_SRC_DIR"
rm -rf .deps build
make CMAKE_EXTRA_FLAGS="-DCMAKE_INSTALL_PREFIX=$HOME/.local/" CMAKE_BUILD_TYPE=Release
make install
