function pi-marimo --description 'Start marimo and Pi with the opt-in marimo-pair skill'
    argparse --ignore-unknown 'h/help' 'no-start' 'no-token' 'marimo-port=' -- $argv
    or return 2

    if set -q _flag_help
        echo "Usage: pi-marimo [--no-start] [--no-token] [--marimo-port PORT] [NOTEBOOK.py] [PI_ARGS...]"
        echo
        echo "Options:"
        echo "  -h, --help             Show this help."
        echo "      --no-start         Do not start marimo; only launch Pi with marimo-pair loaded."
        echo "      --no-token         Start marimo without auth and rely on marimo auto-discovery."
        echo "      --marimo-port PORT Pass --port PORT to marimo edit."
        echo
        echo "Starts a token-protected marimo notebook, then runs pi with marimo-pair loaded via --skill."
        echo "If MARIMO_TOKEN is set, it is reused; otherwise an 8-character random token is generated."
        echo "If IP_PREFIX is set, the matching IPv4 address is discovered, bound, advertised, and injected."
        echo "If NOTEBOOK.py exists or looks like a notebook path, it is passed to marimo edit and removed from PI_ARGS."
        echo
        echo "Examples:"
        echo "  pi-marimo notebook.py"
        echo "  pi-marimo --marimo-port 2718 notebook.py \"help me improve this notebook\""
        echo "  pi-marimo notebook.py --model gpt-5.4-mini \"help me improve this notebook\""
        echo "  pi-marimo --no-start \"connect to my existing marimo session\""
        echo "  pi-marimo --no-token notebook.py"
        echo
        echo "Note: pi-marimo uses the marimo executable from the current PATH; source/activate the project env first."
        echo "Note: set IP_PREFIX, for example 'set -gx IP_PREFIX 10.32.', when remote access should use a non-localhost URL."
        return 0
    end

    set -l skill_rels \
        marimo/marimo-pair/skills/marimo-pair \
        marimo/marimo-authoring
    set -l skill_paths

    for skill_rel in $skill_rels
        set -l skill_candidates

        if set -q XDG_CONFIG_HOME; and test -n "$XDG_CONFIG_HOME"
            set -a skill_candidates "$XDG_CONFIG_HOME/optin-skills/$skill_rel"
        end
        set -a skill_candidates "$HOME/.config/optin-skills/$skill_rel"

        set -l current_file (status current-filename)
        if test -n "$current_file"; and command -q realpath
            set -l repo_root (dirname (dirname (dirname (realpath "$current_file"))))
            set -a skill_candidates "$repo_root/optin-skills/$skill_rel"
        end

        set -l skill_path
        for candidate in $skill_candidates
            if test -f "$candidate/SKILL.md"
                set skill_path "$candidate"
                break
            end
        end

        if test -z "$skill_path"
            echo "marimo skill not found for $skill_rel. Expected one of:" >&2
            for candidate in $skill_candidates
                echo "  $candidate/SKILL.md" >&2
            end
            return 1
        end

        set -a skill_paths "$skill_path"
    end

    set -l notebook
    if test (count $argv) -gt 0
        set -l first_arg $argv[1]
        if not string match -q -- '-*' "$first_arg"
            if test -e "$first_arg"; or string match -qr '\.(py|ipynb)$' -- "$first_arg"
                set notebook "$first_arg"
                set -e argv[1]
            end
        end
    end

    set -l marimo_pid
    set -l marimo_log
    set -l marimo_url
    set -l marimo_token
    set -l marimo_token_file
    if not set -q _flag_no_start
        if not command -q marimo
            echo "marimo not found on PATH; source/activate the project environment first" >&2
            return 127
        end

        set -l marimo_host 127.0.0.1
        if set -q IP_PREFIX; and test -n "$IP_PREFIX"
            if not command -q ip
                echo "IP_PREFIX is set, but ip(8) was not found on PATH" >&2
                return 127
            end

            set -l matched_ips
            for ip_addr in (ip -o -4 addr show scope global | awk '{split($4, a, "/"); print a[1]}')
                if string match -q "$IP_PREFIX*" -- "$ip_addr"
                    set -a matched_ips "$ip_addr"
                end
            end

            if test (count $matched_ips) -eq 0
                echo "No IPv4 address matched IP_PREFIX=$IP_PREFIX" >&2
                return 1
            end

            set marimo_host $matched_ips[1]
            if test (count $matched_ips) -gt 1
                echo "Multiple IPv4 addresses matched IP_PREFIX=$IP_PREFIX; using $marimo_host" >&2
            end
        end

        set -l marimo_port
        if set -q _flag_marimo_port
            set marimo_port $_flag_marimo_port
        else
            if not command -q python
                echo "python not found; pass --marimo-port PORT or make python available on PATH" >&2
                return 127
            end
            set marimo_port (python -c 'import socket, sys; host = sys.argv[1]; s=socket.socket(); s.bind((host, 0)); print(s.getsockname()[1]); s.close()' $marimo_host)
            or return $status
        end

        set marimo_url "http://$marimo_host:$marimo_port"

        set -l marimo_args edit --host $marimo_host --port $marimo_port
        if set -q _flag_no_token
            set -a marimo_args --no-token
        else
            if set -q MARIMO_TOKEN; and test -n "$MARIMO_TOKEN"
                set marimo_token "$MARIMO_TOKEN"
            else
                if not command -q python
                    echo "python not found; set MARIMO_TOKEN or make python available on PATH" >&2
                    return 127
                end
                set marimo_token (python -c 'import secrets, string; alphabet = string.ascii_letters + string.digits; print("".join(secrets.choice(alphabet) for _ in range(8)))')
                or return $status
            end
            set marimo_token_file (mktemp -t pi-marimo-token.XXXXXX)
            or return $status
            chmod 600 "$marimo_token_file"
            printf '%s' "$marimo_token" >"$marimo_token_file"
            set -a marimo_args --token-password-file "$marimo_token_file"
        end
        if test -n "$notebook"
            set -a marimo_args "$notebook"
        end

        set marimo_log (mktemp -t pi-marimo.XXXXXX.log)
        marimo $marimo_args >$marimo_log 2>&1 &
        set marimo_pid $last_pid

        sleep 2
        if test -n "$marimo_token_file"
            rm -f "$marimo_token_file"
        end
        if not kill -0 $marimo_pid 2>/dev/null
            echo "marimo failed to start. Log: $marimo_log" >&2
            cat $marimo_log >&2
            if test -n "$marimo_token_file"
                rm -f "$marimo_token_file"
            end
            return 1
        end

        echo "marimo running, pid $marimo_pid"
        echo "marimo log: $marimo_log"
        echo "marimo URL: $marimo_url"
        if test -n "$marimo_token"
            echo "MARIMO_TOKEN: $marimo_token"
            echo "browser URL: $marimo_url?access_token=$marimo_token"
        end
    end

    set -l pi_args
    for skill_path in $skill_paths
        set -a pi_args --skill "$skill_path"
    end
    if test -n "$marimo_url"; and test -n "$marimo_token"
        set -a pi_args --append-system-prompt "A marimo server for this pi-marimo session is running at $marimo_url. MARIMO_TOKEN is set in the environment. When using marimo-pair scripts, pass --url $marimo_url explicitly instead of relying on auto-discovery."
    end

    if test -n "$marimo_token"
        env MARIMO_TOKEN="$marimo_token" pi $pi_args $argv
    else
        pi $pi_args $argv
    end
    set -l pi_status $status

    if test -n "$marimo_pid"
        kill $marimo_pid 2>/dev/null
    end

    return $pi_status
end
