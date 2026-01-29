#!/usr/bin/env bash

# Install kitty
curl -L https://sw.kovidgoyal.net/kitty/installer.sh | sh /dev/stdin launch=n

# Create symbolic links to add kitty and kitten to PATH
mkdir -p ~/.local/bin
ln -sf ~/.local/kitty.app/bin/kitty ~/.local/kitty.app/bin/kitten ~/.local/bin/

# Setup desktop integration
mkdir -p ~/.local/share/applications
cp ~/.local/kitty.app/share/applications/kitty.desktop ~/.local/share/applications/
cp ~/.local/kitty.app/share/applications/kitty-open.desktop ~/.local/share/applications/

# Update icon path - use custom icon if it exists
if [ -f ~/dotfiles/arch.png ]; then
    ICON_PATH=~/dotfiles/arch.png
else
    ICON_PATH=~/.local/kitty.app/share/icons/hicolor/256x256/apps/kitty.png
fi

# Update paths in desktop files
sed -i "s|Icon=kitty|Icon=${ICON_PATH}|g" ~/.local/share/applications/kitty*.desktop
sed -i "s|Exec=kitty|Exec=$(readlink -f ~)/.local/kitty.app/bin/kitty|g" ~/.local/share/applications/kitty*.desktop

# Make kitty the default terminal (optional)
echo 'kitty.desktop' >~/.config/xdg-terminals.list

echo "Kitty installation completed!"
