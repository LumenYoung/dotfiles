if test -f "$HOME/.local.fish"
    source "$HOME/.local.fish"
end

set -q OPENCODE_HOSTNAME; or set -gx OPENCODE_HOSTNAME 0.0.0.0
set -q OPENCODE_PORT; or set -gx OPENCODE_PORT 14096
set -q LUCID_MCP_URL; or set -gx LUCID_MCP_URL https://lucid.lumeny.io/mcp
set -q LUCID_MEMORY_READ_GROUPS; or set -gx LUCID_MEMORY_READ_GROUPS work

if not set -q OPENCODE_CONFIG
    if set -q LUMENY_OPENAI_BASE_URL; and set -q LUMENY_OPENAI_API_KEY
        if test -n "$LUMENY_OPENAI_BASE_URL"; and test -n "$LUMENY_OPENAI_API_KEY"
            set -gx OPENCODE_CONFIG "$HOME/.config/opencode/opencode.proxy.json"
        end
    end
end
