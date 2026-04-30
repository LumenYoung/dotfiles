function t3-auth-token --description 'Issue a T3 Code bearer session token'
    if test -f "$HOME/.local.fish"
        source "$HOME/.local.fish"
    end

    if test -f "$HOME/.config/t3-code/server-env.fish"
        source "$HOME/.config/t3-code/server-env.fish"
    end

    set -q T3CODE_HOME; or set -gx T3CODE_HOME "$HOME/.t3"
    set -q T3CODE_NPM_CACHE; or set -gx T3CODE_NPM_CACHE "$T3CODE_HOME/npm-cache"
    set -gx npm_config_cache "$T3CODE_NPM_CACHE"

    set -l ttl 30d
    set -l role owner
    set -l label "$USER@"(hostname -s)

    npx -y t3@latest auth session issue \
        --base-dir "$T3CODE_HOME" \
        --ttl "$ttl" \
        --role "$role" \
        --label "$label" \
        --token-only \
        $argv
end
