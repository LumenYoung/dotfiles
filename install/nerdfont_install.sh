#!/usr/bin/bash

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
eget ryanoasis/nerd-fonts --asset Iosevka.tar.xz --to .

# Extract the font to ~/.fonts and remove the archive
echo "Extracting Iosevka.tar.xz to ~/.fonts/..."
tar -xf Iosevka.tar.xz -C ~/.fonts/
echo "Removing Iosevka.tar.xz..."
rm Iosevka.tar.xz

# Refresh font cache
echo "Refreshing font cache..."
fc-cache -f -v

echo "Nerd Font installation complete."
