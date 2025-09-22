#!/usr/bin/env bash

set -euo pipefail

# Configuration
LOCAL_BIN="$HOME/.local/bin"
TOOLS_DIR="$HOME/.local/tools"
LOG_FILE="$TOOLS_DIR/install.log"

# Global variables for argument parsing
force_eget=false
declare -a tools

# Tool definitions - makes it easy to add/remove tools
declare -A TOOL_COMMANDS=(
    ["fd"]="eget sharkdp/fd --asset ^musl --to $LOCAL_BIN"
    ["ripgrep"]="eget BurntSushi/ripgrep --to $LOCAL_BIN"
    ["lazygit"]="eget jesseduffield/lazygit --to $LOCAL_BIN"
    ["zellij"]="eget zellij-org/zellij --to $LOCAL_BIN"
    ["zoxide"]="eget ajeetdsouza/zoxide --to $LOCAL_BIN"
    ["fzf"]="eget junegunn/fzf --to $LOCAL_BIN"
    ["just"]="eget casey/just --asset linux-musl --to $LOCAL_BIN"
    ["eza"]="eget eza-community/eza --asset tar --asset linux-musl --to $LOCAL_BIN"
    ["yazi"]="eget sxyazi/yazi --asset linux-musl --to $LOCAL_BIN --file yazi && eget sxyazi/yazi --asset linux-musl --to $LOCAL_BIN --file ya"
    ["btop"]="eget aristocratos/btop --to $LOCAL_BIN"
    ["bat"]="eget sharkdp/bat --asset linux-musl --to $LOCAL_BIN"
    ["dust"]="eget bootandy/dust --to $LOCAL_BIN"
)

# Initialize logging and directories
setup_environment() {
    mkdir -p "$LOCAL_BIN" "$TOOLS_DIR"
    # Add local bin to PATH if not present
    if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
        export PATH="$LOCAL_BIN:$PATH"
    fi
    # Initialize log
    echo "=== Installation started at $(date) ===" >"$LOG_FILE"
}

# Log messages
log_message() {
    local message="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $message" | tee -a "$LOG_FILE"
}

# Install eget
install_eget() {
    local force="$1"
    if command -v eget >/dev/null 2>&1 && [[ "$force" != "true" ]]; then
        log_message "eget is already installed. Use -f to force reinstall."
        return 0
    fi

    log_message "Installing eget..."
    curl -sSf -o eget.sh https://zyedidia.github.io/eget.sh
    # Don't redirect output to allow interactive prompts
    if bash eget.sh; then
        mv eget "$LOCAL_BIN/"
        rm -f eget.sh
        log_message "eget installed successfully"
    else
        rm -f eget.sh
        log_message "Error: Failed to install eget"
        return 1
    fi
}

# Install a specific tool
install_tool() {
    local tool="$1"
    if [[ ! -v "TOOL_COMMANDS[$tool]" ]]; then
        log_message "Error: Unknown tool '$tool'"
        return 1
    fi

    log_message "Installing $tool..."
    # Don't redirect output to allow interactive prompts
    if eval "${TOOL_COMMANDS[$tool]}"; then
        log_message "$tool installed successfully"
        return 0
    else
        log_message "Error: Failed to install $tool"
        return 1
    fi
}

# Install all tools
install_all_tools() {
    log_message "Installing all tools..."
    for tool in "${!TOOL_COMMANDS[@]}"; do
        install_tool "$tool"
    done
    log_message "All tools installation completed"
}

# Show usage information
show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS] [TOOLS...]

Options:
    -f, --force      Force reinstall eget
    -h, --help       Show this help message
    -l, --list       List available tools

Install CLI tools using eget. If no tools are specified, all tools are installed.

Available tools: ${!TOOL_COMMANDS[*]}
EOF
}

# List available tools
list_tools() {
    echo "Available tools:"
    for tool in "${!TOOL_COMMANDS[@]}"; do
        echo "  - $tool"
    done
}

# Parse command line arguments
parse_arguments() {
    force_eget=false
    tools=()

    while [[ $# -gt 0 ]]; do
        case "$1" in
        -f | --force)
            force_eget=true
            shift
            ;;
        -h | --help)
            show_usage
            exit 0
            ;;
        -l | --list)
            list_tools
            exit 0
            ;;
        -*)
            echo "Error: Unknown option $1" >&2
            show_usage
            exit 1
            ;;
        *)
            tools+=("$1")
            shift
            ;;
        esac
    done
}

# Main function
main() {
    setup_environment

    # Parse arguments
    parse_arguments "$@"

    # Install eget
    install_eget "$force_eget"

    # Install tools
    if [[ ${#tools[@]} -eq 0 ]]; then
        install_all_tools
    else
        for tool in "${tools[@]}"; do
            install_tool "$tool"
        done
    fi

    log_message "Installation process completed"
}

# Run main function
main "$@"
