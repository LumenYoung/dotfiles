if test -f "$HOME/.local.fish"
    source "$HOME/.local.fish"
end

if test -f "$HOME/.config/t3-code/server-env.fish"
    source "$HOME/.config/t3-code/server-env.fish"
end

function __t3_node_runtime_is_compatible
    type -q node; or return 1

    set -l node_version (node -v 2>/dev/null | string replace -r '^v' '')
    set -l parts (string split . -- "$node_version")
    test (count $parts) -ge 2; or return 1

    set -l major $parts[1]
    set -l minor $parts[2]
    string match -qr '^[0-9]+$' -- "$major"; or return 1
    string match -qr '^[0-9]+$' -- "$minor"; or return 1

    if test "$major" -eq 22; and test "$minor" -ge 16
        return 0
    end
    if test "$major" -eq 23; and test "$minor" -ge 11
        return 0
    end
    if test "$major" -eq 24; and test "$minor" -ge 10
        return 0
    end
    if test "$major" -gt 24
        return 0
    end

    return 1
end

function __t3_ensure_node_runtime
    if __t3_node_runtime_is_compatible
        return 0
    end

    if type -q nvm
        nvm --silent use "$T3CODE_NODE_VERSION" >/dev/null 2>/dev/null
        if __t3_node_runtime_is_compatible
            return 0
        end
    end

    set -l current_node "<not found>"
    if type -q node
        set current_node (node -v 2>/dev/null)
    end

    echo "T3 Code requires Node ^22.16 || ^23.11 || >=24.10; current node is $current_node." >&2
    echo "Install a compatible runtime, for example: nvm install $T3CODE_NODE_VERSION" >&2
    echo "Or set T3CODE_NODE_VERSION in ~/.config/t3-code/server-env.fish to an installed compatible version." >&2
    return 1
end

set -q T3CODE_HOST; or set -gx T3CODE_HOST 0.0.0.0
set -q T3CODE_PORT; or set -gx T3CODE_PORT 4096
set -q T3CODE_HOME; or set -gx T3CODE_HOME "$HOME/.t3"
set -q T3CODE_NPM_CACHE; or set -gx T3CODE_NPM_CACHE "$T3CODE_HOME/npm-cache"
set -q T3CODE_NODE_VERSION; or set -gx T3CODE_NODE_VERSION v24.10.0
set -gx npm_config_cache "$T3CODE_NPM_CACHE"

__t3_ensure_node_runtime; or exit 1

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
