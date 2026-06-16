# Prefer Lumeny/OpenAI values that were injected into the service environment
# (for example by `mise run t3-code-restart`) over values persisted in
# ~/.local.fish.  Still source ~/.local.fish as a fallback for machines that do
# not inject these variables explicitly.
set -l __t3_had_lumeny_base 0
set -l __t3_had_lumeny_key 0
set -l __t3_had_openai_key 0
set -l __t3_lumeny_base ""
set -l __t3_lumeny_key ""
set -l __t3_openai_key ""

if set -q LUMENY_OPENAI_BASE_URL
    set __t3_had_lumeny_base 1
    set __t3_lumeny_base "$LUMENY_OPENAI_BASE_URL"
end
if set -q LUMENY_OPENAI_API_KEY
    set __t3_had_lumeny_key 1
    set __t3_lumeny_key "$LUMENY_OPENAI_API_KEY"
end
if set -q OPENAI_API_KEY
    set __t3_had_openai_key 1
    set __t3_openai_key "$OPENAI_API_KEY"
end

if test -f "$HOME/.local.fish"
    source "$HOME/.local.fish"
end

if test $__t3_had_lumeny_base -eq 1
    set -gx LUMENY_OPENAI_BASE_URL "$__t3_lumeny_base"
end
if test $__t3_had_lumeny_key -eq 1
    set -gx LUMENY_OPENAI_API_KEY "$__t3_lumeny_key"
end
if test $__t3_had_openai_key -eq 1
    set -gx OPENAI_API_KEY "$__t3_openai_key"
end

if test -f "$HOME/.config/t3-code/server-env.fish"
    source "$HOME/.config/t3-code/server-env.fish"
end

if test -d "$HOME/.config/t3-code/bin"
    fish_add_path --prepend "$HOME/.config/t3-code/bin"
end

# ~/.local.fish may select an older nvm runtime for interactive shells. Prefer
# mise for this service after all local env has been sourced so t3@latest runs
# on the repo-pinned/current Node rather than the interactive nvm default.
if test -x "$HOME/.local/bin/mise"
    "$HOME/.local/bin/mise" activate fish | source
end
if test -d "$HOME/.local/share/mise/shims"
    fish_add_path --move --prepend "$HOME/.local/share/mise/shims"
end

# Avoid leaking an nvm npm prefix into npm/npx when another runtime is selected.
set --erase npm_config_prefix

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
set -q T3CODE_NODE_VERSION; or set -gx T3CODE_NODE_VERSION v24.16.0
set -gx npm_config_cache "$T3CODE_NPM_CACHE"

__t3_ensure_node_runtime; or exit 1

mkdir -p "$T3CODE_HOME/userdata"
if not test -e "$T3CODE_HOME/userdata/settings.json"; and test -f "$HOME/.config/t3-code/settings.json"
    cp "$HOME/.config/t3-code/settings.json" "$T3CODE_HOME/userdata/settings.json"
end

exec npx -y --package t3@latest -- env -u npm_config_prefix t3 serve \
    --mode web \
    --host "$T3CODE_HOST" \
    --port "$T3CODE_PORT" \
    --base-dir "$T3CODE_HOME" \
    --no-browser \
    --auto-bootstrap-project-from-cwd "$HOME"
