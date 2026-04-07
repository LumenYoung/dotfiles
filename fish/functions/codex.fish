function codex --description 'Run codex with optional OpenAI-compatible override'
    if set -q LUMENY_OPENAI_BASE_URL; and set -q LUMENY_OPENAI_API_KEY
        if test -n "$LUMENY_OPENAI_BASE_URL"; and test -n "$LUMENY_OPENAI_API_KEY"
            env OPENAI_API_KEY="$LUMENY_OPENAI_API_KEY" command codex \
                                -c "model_providers.openai.base_url=\"$LUMENY_OPENAI_BASE_URL\"" \
                                $argv
            return $status
        end
    end
    
    command codex $argv
end
