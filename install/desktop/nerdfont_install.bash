#!/usr/bin/env bash

# Check if ~/.local/bin is in PATH, if not add it
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    export PATH="$HOME/.local/bin:$PATH"
fi

# get eget
curl -o eget.sh https://zyedidia.github.io/eget.sh
bash eget.sh
mv eget ~/.local/bin/

# Ensure ~/.fonts directory exists
echo "Ensuring ~/.fonts directory exists..."
mkdir -p ~/.fonts

# Download Iosevka font archive
echo "Downloading Iosevka Nerd Font..."
eget ryanoasis/nerd-fonts --asset Iosevka.tar.xz --to ~/.fonts --all --file *.ttf

fc-cache -f -v
 
echo "Nerd Font installation complete."
