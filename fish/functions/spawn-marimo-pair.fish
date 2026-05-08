function spawn-marimo-pair --description 'Start marimo for repo-local marimo-pair usage'
    argparse 'p/port=' 'h/help' -- $argv
    or return 2

    if set -q _flag_help
        echo "Usage: spawn-marimo-pair [--port 2718] [MARIMO_EDIT_ARGS...]"
        return 0
    end

    set -l repo_root (git rev-parse --show-toplevel 2>/dev/null)
    if test -z "$repo_root"
        echo "spawn-marimo-pair must be run inside a git repository" >&2
        return 1
    end

    set -l skill_path "$repo_root/.codex/skills/marimo-pair/SKILL.md"
    if not test -f "$skill_path"
        echo "repo-local marimo-pair skill not found; installing it now"
        setup-marimo-pair
        or return $status
    end

    for cmd in bash curl jq sed
        if not command -q $cmd
            echo "$cmd not found" >&2
            return 127
        end
    end

    set -l marimo_command marimo
    if not command -q marimo
        if not command -q uv
            echo "marimo not found, and uv not found for fallback" >&2
            return 127
        end
        set marimo_command uv run marimo
    end

    set -l marimo_version ($marimo_command --version 2>/dev/null | string trim)
    if test -z "$marimo_version"
        echo "failed to read marimo version" >&2
        return 1
    end

    set -l min_version 0.21.1
    set -l oldest (printf "%s\n%s\n" "$min_version" "$marimo_version" | sort -V | head -n 1)
    if test "$oldest" != "$min_version"
        echo "marimo $min_version or newer is required; found $marimo_version" >&2
        return 1
    end

    set -l port 2718
    if set -q _flag_port
        set port $_flag_port
    end

    set -l marimo_url "http://127.0.0.1:$port"
    set -l local_fish "$HOME/.local.fish"
    if test -f "$local_fish"
        source "$local_fish"
    end

    mkdir -p (dirname "$local_fish")
    if not test -f "$local_fish"
        touch "$local_fish"
    end

    if not set -q MARIMO_PAIR_TOKEN; or test -z "$MARIMO_PAIR_TOKEN"
        set -l token
        if command -q openssl
            set token (openssl rand -hex 32)
        else if command -q uuidgen
            set token (uuidgen | string lower | string replace -a '-' '')
        else
            echo "openssl or uuidgen is required to generate MARIMO_PAIR_TOKEN" >&2
            return 127
        end

        set -gx MARIMO_PAIR_TOKEN "$token"
        echo "Created MARIMO_PAIR_TOKEN in $local_fish"
    end

    set -gx MARIMO_TOKEN "$MARIMO_PAIR_TOKEN"
    set -gx MARIMO_PAIR_URL "$marimo_url"

    set -l local_tmp "$local_fish.tmp.$fish_pid"
    sed '/^# >>> marimo-pair$/,/^# <<< marimo-pair$/d' "$local_fish" >"$local_tmp"
    printf "\n# >>> marimo-pair\n" >>"$local_tmp"
    printf "# Managed by spawn-marimo-pair. MARIMO_TOKEN is the auth name used by marimo-pair scripts.\n" >>"$local_tmp"
    printf "set -gx MARIMO_PAIR_TOKEN \"%s\"\n" "$MARIMO_PAIR_TOKEN" >>"$local_tmp"
    printf "set -gx MARIMO_TOKEN \"\$MARIMO_PAIR_TOKEN\"\n" >>"$local_tmp"
    printf "set -gx MARIMO_PAIR_URL \"%s\"\n" "$marimo_url" >>"$local_tmp"
    printf "# <<< marimo-pair\n" >>"$local_tmp"
    mv "$local_tmp" "$local_fish"

    echo "Start Codex with marimo-pair auth from another fish shell:"
    echo "  codex"
    echo
    echo "For t3code, restart it from a new fish shell so it inherits:"
    echo "  MARIMO_TOKEN=set"
    echo "  MARIMO_PAIR_URL=$marimo_url"
    echo

    $marimo_command edit --host 127.0.0.1 --port $port --token-password "$MARIMO_PAIR_TOKEN" $argv
end
