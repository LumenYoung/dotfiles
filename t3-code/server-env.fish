set -q T3CODE_HOST; or set -gx T3CODE_HOST 0.0.0.0
set -q T3CODE_PORT; or set -gx T3CODE_PORT 4096
set -q T3CODE_HOME; or set -gx T3CODE_HOME "$HOME/.t3"
set -q T3CODE_NPM_CACHE; or set -gx T3CODE_NPM_CACHE "$T3CODE_HOME/npm-cache"
set -gx npm_config_cache "$T3CODE_NPM_CACHE"

if set -q LUMENY_OPENAI_BASE_URL; and set -q LUMENY_OPENAI_API_KEY
    if test -n "$LUMENY_OPENAI_BASE_URL"; and test -n "$LUMENY_OPENAI_API_KEY"
        set -gx OPENAI_API_KEY "$LUMENY_OPENAI_API_KEY"
    end
end
