function codex-direct --description 'Run codex without the Lumeny override wrapper'
    set -l codex_bin (command -s codex)

    if test -z "$codex_bin"
        echo "codex executable not found" >&2
        return 127
    end

    "$codex_bin" $argv
end
