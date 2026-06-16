function __t3_code_read_local_fish_var --argument-names name
    test -f "$HOME/.local.fish"; or return 0

    set -l fish_bin
    if test -x "$HOME/.local/bin/fish"
        set fish_bin "$HOME/.local/bin/fish"
    else if type -q fish
        set fish_bin (command -s fish)
    else
        return 0
    end

    command "$fish_bin" -c '
        source "$HOME/.local.fish"
        set -l name $argv[1]
        if set -q $name
            printf "%s" $$name
        end
    ' -- "$name" 2>/dev/null
end

function t3-code-restart --description 'Restart T3 Code user service with current shell Lumeny/OpenAI env'
    argparse h/help no-fallback allow-missing -- $argv; or return 2

    if set -q _flag_help
        echo 'usage: t3-code-restart [--no-fallback] [--allow-missing]'
        echo
        echo 'Imports LUMENY_OPENAI_BASE_URL and LUMENY_OPENAI_API_KEY from this fish shell'
        echo 'into the systemd --user manager, mirrors the key to OPENAI_API_KEY, then restarts'
        echo 't3-code.service. If either value is missing, falls back to ~/.local.fish unless'
        echo '--no-fallback is passed.'
        return 0
    end

    set -l base_url
    set -l api_key
    set -l base_url_source 'current shell'
    set -l api_key_source 'current shell'

    if set -q LUMENY_OPENAI_BASE_URL
        set base_url "$LUMENY_OPENAI_BASE_URL"
    end
    if set -q LUMENY_OPENAI_API_KEY
        set api_key "$LUMENY_OPENAI_API_KEY"
    end

    if not set -q _flag_no_fallback
        if test -z "$base_url"
            set base_url (__t3_code_read_local_fish_var LUMENY_OPENAI_BASE_URL)
            set base_url_source '~/.local.fish'
        end

        if test -z "$api_key"
            set api_key (__t3_code_read_local_fish_var LUMENY_OPENAI_API_KEY)
            set api_key_source '~/.local.fish'
        end
    end

    if test -z "$base_url"; or test -z "$api_key"
        if not set -q _flag_allow_missing
            echo 'LUMENY_OPENAI_BASE_URL or LUMENY_OPENAI_API_KEY is missing.' >&2
            echo 'Set them in this shell, or pass --allow-missing to restart without them.' >&2
            return 1
        end

        systemctl --user unset-environment \
            LUMENY_OPENAI_BASE_URL \
            LUMENY_OPENAI_API_KEY \
            OPENAI_API_KEY
        echo 'Restarting T3 Code without Lumeny/OpenAI API environment.'
    else
        set -gx LUMENY_OPENAI_BASE_URL "$base_url"
        set -gx LUMENY_OPENAI_API_KEY "$api_key"
        set -gx OPENAI_API_KEY "$api_key"

        systemctl --user import-environment \
            LUMENY_OPENAI_BASE_URL \
            LUMENY_OPENAI_API_KEY \
            OPENAI_API_KEY

        echo "Imported LUMENY_OPENAI_BASE_URL from $base_url_source."
        echo "Imported LUMENY_OPENAI_API_KEY/OPENAI_API_KEY from $api_key_source."
    end

    systemctl --user daemon-reload
    systemctl --user restart t3-code.service
    systemctl --user status t3-code.service --no-pager --lines=12
end
