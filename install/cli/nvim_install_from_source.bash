#!/usr/bin/env bash

# Clone neovim, build and install it at ~/.local/

# Default tag
TAG="v0.11.4"

# Help function
show_help() {
    cat <<EOF
Usage: $0 [-t TAG] [-h]

Clone, build and install neovim from source at ~/.local/

Options:
    -t TAG    Specify the git tag/version to build (default: v0.11.2)
    -h        Show this help message

Examples:
    $0                  # Install default version (v0.11.2)
    $0 -t v0.10.0      # Install specific version
    $0 -t master       # Install latest master branch

EOF
}

# Parse command line arguments
while getopts "t:h" opt; do
    case $opt in
    t)
        TAG="$OPTARG"
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

# Check if neovim directory exists, if not clone the repo
if [ ! -d "neovim" ]; then
    git clone https://github.com/neovim/neovim
    cd neovim
    git checkout "$TAG"
else
    cd neovim
    git fetch
    git checkout "$TAG"
    echo "neovim directory exists, checked out $TAG"
fi

rm -rf .deps build
make CMAKE_EXTRA_FLAGS="-DCMAKE_INSTALL_PREFIX=$HOME/.local/" CMAKE_BUILD_TYPE=Release
make install
