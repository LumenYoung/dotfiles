if test -f "$HOME/.local.fish"
    source "$HOME/.local.fish"
end

if test -f "$HOME/.config/t3-code/server-env.fish"
    source "$HOME/.config/t3-code/server-env.fish"
end

set -q T3CODE_HOST; or set -gx T3CODE_HOST 0.0.0.0
set -q T3CODE_PORT; or set -gx T3CODE_PORT 4096
set -q T3CODE_HOME; or set -gx T3CODE_HOME "$HOME/.t3"
set -q T3CODE_NPM_CACHE; or set -gx T3CODE_NPM_CACHE "$T3CODE_HOME/npm-cache"
set -gx npm_config_cache "$T3CODE_NPM_CACHE"

mkdir -p "$T3CODE_HOME/userdata"
if not test -e "$T3CODE_HOME/userdata/settings.json"; and test -f "$HOME/.config/t3-code/settings.json"
    cp "$HOME/.config/t3-code/settings.json" "$T3CODE_HOME/userdata/settings.json"
end

exec npx -y t3@latest serve \
    --mode web \
    --host "$T3CODE_HOST" \
    --port "$T3CODE_PORT" \
    --base-dir "$T3CODE_HOME" \
    --no-browser \
    --auto-bootstrap-project-from-cwd "$HOME"
