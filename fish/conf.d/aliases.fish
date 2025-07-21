# Abbreviations and functions
abbr lg 'lazygit'
abbr za 'zathura'
abbr kssh 'kitty +kitten ssh'
abbr start 'sudo systemctl start'
abbr stop 'sudo systemctl stop'
abbr restart 'sudo systemctl restart'
abbr status 'systemctl status'
abbr enable 'sudo systemctl enable'
abbr disable 'sudo systemctl disable'
abbr kcat "kitten icat "

if command -q btop
  abbr btop 'btop --force-utf'
end

if command -q eza
  abbr ls 'eza'
  abbr ll 'eza -l'
else
  abbr ls 'ls --color=auto'
  abbr ll 'ls -l'
end

function uvsh
  set -l venv_name (count $argv > /dev/null && echo $argv[1] || echo '.venv')
  set venv_name (string replace -a / '' -- "$venv_name")
  set venv_name (string replace -a \\ '' -- "$venv_name")

  set -l venv_bin 'bin/activate.fish'

  set -l activator "$venv_name/$venv_bin"
  echo "[INFO] Activate Python venv: $venv_name (via $activator)"

  if not test -f "$activator"
    echo "[ERROR] Python venv not found: $venv_name"
    return 1
  end

  source "$activator"
end

if command -q zellij
  abbr zj 'zellij'
  abbr zjd 'zellij delete-session'
  abbr zjl 'zellij list-sessions'
  function zjc
    set -l session_name (count $argv > /dev/null && echo $argv[1] || echo (hostname))
    
    # Try to attach first
    if not zellij attach "$session_name"
      # If attach fails, delete the session and create new
      zellij delete-session "$session_name"
      zellij options --simplified-ui true --pane-frames false --session-name "$session_name"
    end
  end
end

if command -q yazi
  function ya
    set -l tmp (mktemp -t "yazi-cwd.XXXXX")
    yazi $argv --cwd-file="$tmp"
    if set -l cwd (cat -- "$tmp") && test -n "$cwd" && test "$cwd" != "$PWD"
      cd -- "$cwd"
    end
    rm -f -- "$tmp"
  end
end

if command -q pacman
  abbr S 'sudo pacman -S'
  abbr Sa 'paru -Sa'
  abbr Syu 'sudo pacman -Syu'
  abbr R 'sudo pacman -R'
  abbr Rns 'sudo pacman -Rns'
  abbr Fy 'sudo pacman -Fy'
  abbr syu 'paru -Syu'
  abbr Ss 'pacman -Ss'
  abbr Si 'pacman -Si'
  abbr Ssa 'paru -Ssa'
  abbr Qs 'pacman -Qs'
  abbr Qi 'pacman -Qi'
  abbr Ql 'pacman -Ql'
  abbr Qo 'pacman -Qo'
  abbr Qe 'pacman -Qe'
  abbr Qdt 'pacman -Qdt'
  abbr Qdtq 'pacman -Qdtq'
  abbr Qql 'pacman -Qql'
  abbr Fl 'pacman -Fl'
  abbr Fx 'pacman -Fx'
  abbr G 'paru -G'
end

function sudo
  set -l cmd $argv[1]
  switch "$cmd"
    case vi vim nvim lvim
      command sudo -E $argv
    case '*'
      command sudo $argv
  end
end

function man
  set -gx LESS_TERMCAP_md (printf '\e[01;31m')
  set -gx LESS_TERMCAP_me (printf '\e[0m')
  set -gx LESS_TERMCAP_se (printf '\e[0m')
  set -gx LESS_TERMCAP_so (printf '\e[01;44;33m')
  set -gx LESS_TERMCAP_ue (printf '\e[0m')
  set -gx LESS_TERMCAP_us (printf '\e[01;32m')
  command man $argv
end

function ln-ccjson
  set -l current_dir (pwd)
  set -l base_name (basename $current_dir)
  
  if test "$base_name" = 'build'
    set -l project_root (dirname $current_dir)
    
    if test -f "$current_dir/compile_commands.json"
      ln -s "$current_dir/compile_commands.json" "$project_root/compile_commands.json"
      echo "Soft link created successfully."
    else
      echo "Error: compile_commands.json does not exist in the current directory."
    end
  else
    echo "Error: The base name of the current directory is not 'build'. You should use this alias in the build folder"
  end
end

abbr update-aider 'pip3 install --upgrade aider-chat'

if command -q micromamba
  abbr ma "micromamba activate"
  abbr mda "micromamba deactivate"
  abbr mi "micromamba install"
  abbr mc "micromamba create -n"
end
