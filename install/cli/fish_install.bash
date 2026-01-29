#!/usr/bin/env bash

# Script for installing Fish Shell on systems without root access.
# Fish Shell will be installed in $HOME/.local

# Check for required commands
missing_deps=0
command -v make >/dev/null 2>&1 || {
    echo "Error: make is required but not installed" >&2
    missing_deps=1
}
command -v cmake >/dev/null 2>&1 || {
    echo "Error: cmake is required but not installed" >&2
    missing_deps=1
}
command -v wget >/dev/null 2>&1 || {
    echo "Error: wget is required but not installed" >&2
    missing_deps=1
}

# Exit if any dependencies are missing
if [ $missing_deps -eq 1 ]; then
    exit 1
fi

# Dependencies:
# 1. a C++11 compiler (g++ 4.8 or later, or clang 3.3 or later)
# 2. CMake (version 3.5 or later)

# exit on error
set -e

FISH_SHELL_VERSION=4.0.2

# create our directories
BUILD_TEMP_DIR=/tmp/build_fish_shell
LOCAL_DIR=$HOME/.local
mkdir -p "$LOCAL_DIR" $BUILD_TEMP_DIR
cd $BUILD_TEMP_DIR

# download source files for Fish Shell
wget https://github.com/fish-shell/fish-shell/releases/download/${FISH_SHELL_VERSION}/fish-${FISH_SHELL_VERSION}.tar.xz

# extract files, configure, and compile

tar xvJf fish-${FISH_SHELL_VERSION}.tar.xz
cd fish-${FISH_SHELL_VERSION}
cmake -DCMAKE_INSTALL_PREFIX:PATH="$HOME/.local" -DBUILD_SHARED_LIBS=OFF .
make
make install
