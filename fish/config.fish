if status is-login
    exec bash -c "test -e /etc/profile && source /etc/profile;\
    exec fish"
end

set sponge_delay 20
set sponge_purge_only_on_exit true

if status is-interactive
    # Commands to run in interactive sessions can go here
    set -l current_tty (tty)
    if test -t 1; and string match -q "/dev/tty*" "$current_tty"
        # TTY-safe prompt: minimal, no heavy theming
        set -g fish_color_normal normal
        set -g fish_color_command normal
        set -g fish_color_param normal
        set -g fish_color_quote normal
        set -g fish_color_error red
        set -g fish_color_end normal
        set -g fish_color_operator normal
        set -g fish_color_escape normal
        set -g fish_color_comment normal
        function fish_prompt
            printf "%s@%s %s> " (whoami) (hostname -s) (prompt_pwd)
        end
        function fish_right_prompt
        end
    end

    if command -v zoxide >/dev/null
        zoxide init fish | source
    end

    if test -f ~/.local.fish
        source ~/.local.fish
    end
    set -g fish_key_bindings fish_vi_key_bindings

end
