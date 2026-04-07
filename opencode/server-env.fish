if test -f "$HOME/.local.fish"
    source "$HOME/.local.fish"
end

set -q OPENCODE_HOSTNAME; or set -gx OPENCODE_HOSTNAME 0.0.0.0
set -q OPENCODE_PORT; or set -gx OPENCODE_PORT 14096

if not set -q OPENCODE_CONFIG
    if set -q LUMENY_OPENAI_BASE_URL; and set -q LUMENY_OPENAI_API_KEY
        if test -n "$LUMENY_OPENAI_BASE_URL"; and test -n "$LUMENY_OPENAI_API_KEY"
            set -gx OPENCODE_CONFIG "$HOME/.config/opencode/opencode.proxy.json"
        end
    end
end
