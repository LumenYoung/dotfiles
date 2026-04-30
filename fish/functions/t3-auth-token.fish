function t3-auth-token --description 'Issue a T3 Code one-time pairing token'
    if test -f "$HOME/.local.fish"
        source "$HOME/.local.fish"
    end

    if test -f "$HOME/.config/t3-code/server-env.fish"
        source "$HOME/.config/t3-code/server-env.fish"
    end

    set -q T3CODE_HOME; or set -gx T3CODE_HOME "$HOME/.t3"
    set -q T3CODE_NPM_CACHE; or set -gx T3CODE_NPM_CACHE "$T3CODE_HOME/npm-cache"
    set -gx npm_config_cache "$T3CODE_NPM_CACHE"

    set -l ttl 10m
    set -l label "$USER@"(hostname -s)

    env NODE_NO_WARNINGS=1 npx -y t3@latest auth pairing create \
        --base-dir "$T3CODE_HOME" \
        --ttl "$ttl" \
        --label "$label" \
        $argv
end
