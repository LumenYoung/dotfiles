function codex --description 'Run codex with optional OpenAI-compatible override'
    set -l codex_bin (command -s codex)

    if test -z "$codex_bin"
        echo "codex executable not found" >&2
        return 127
    end

    if set -q LUMENY_OPENAI_BASE_URL; and set -q LUMENY_OPENAI_API_KEY
        if test -n "$LUMENY_OPENAI_BASE_URL"; and test -n "$LUMENY_OPENAI_API_KEY"
            env OPENAI_API_KEY="$LUMENY_OPENAI_API_KEY" "$codex_bin" \
                                -c "model_provider=\"lumeny_api\"" \
                                -c "features.enable_request_compression=false" \
                                $argv
            return $status
        end
    end

    "$codex_bin" $argv
end
