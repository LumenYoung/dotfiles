function marimo-codex --description 'Start Codex ACP and marimo together'
    argparse 'p/port=' 'h/help' -- $argv
    or return 2

    if set -q _flag_help
        echo "Usage: marimo-codex [--port 3021] [MARIMO_EDIT_ARGS...]"
        return 0
    end

    if not command -q npx
        echo "npx not found" >&2
        return 127
    end

    set -l marimo_command marimo
    if not command -q marimo
        if not command -q uv
            echo "marimo not found, and uv not found for fallback" >&2
            return 127
        end
        set marimo_command uv run marimo
    end

    set -l port 3021
    if set -q _flag_port
        set port $_flag_port
    end

    set -l acp_log (mktemp -t marimo-codex-acp.XXXXXX.log)

    set -l codex_acp_command "npx @zed-industries/codex-acp"
    set -l acp_env

    if set -q LUMENY_OPENAI_BASE_URL; and set -q LUMENY_OPENAI_API_KEY
        if test -n "$LUMENY_OPENAI_BASE_URL"; and test -n "$LUMENY_OPENAI_API_KEY"
            set codex_acp_command 'npx @zed-industries/codex-acp -c model_provider="lumeny_api" -c features.enable_request_compression=false'
            set acp_env OPENAI_API_KEY="$LUMENY_OPENAI_API_KEY"
        end
    end

    env $acp_env npx stdio-to-ws --port $port "$codex_acp_command" >$acp_log 2>&1 &
    set -l acp_pid $last_pid

    sleep 1
    if not kill -0 $acp_pid 2>/dev/null
        echo "Codex ACP failed to start. Log: $acp_log" >&2
        cat $acp_log >&2
        return 1
    end

    echo "Codex ACP bridge running on port $port, pid $acp_pid"
    echo "Codex ACP log: $acp_log"

    $marimo_command edit $argv
    set -l marimo_status $status

    kill $acp_pid 2>/dev/null
    return $marimo_status
end
