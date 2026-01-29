#!/usr/bin/env bash

function nvm_install() {
	# nvm and then install node
	echo "enter nvm_install"
	touch ~/.bashrc
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
	export NVM_DIR="$HOME/.nvm"
	[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"                   # This loads nvm
	[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" # This loads nvm bash_completion
	nvm install node

	# Try to run npm install
	if ! npm install -g neovim tree-sitter-cli; then
		echo "npm install failed, but script continues"
		echo "Run manually: npm install -g neovim tree-sitter-cli"
		return 1
	fi
	return 0
}

# If script is run directly (not sourced), execute the function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	nvm_install
fi
