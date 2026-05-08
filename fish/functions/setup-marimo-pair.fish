function setup-marimo-pair --description 'Install marimo-pair as a repo-local Codex skill'
    argparse 's/source=' 'h/help' -- $argv
    or return 2

    if set -q _flag_help
        echo "Usage: setup-marimo-pair [--source /path/to/marimo-pair]"
        return 0
    end

    for cmd in git rsync
        if not command -q $cmd
            echo "$cmd not found" >&2
            return 127
        end
    end

    set -l repo_root (git rev-parse --show-toplevel 2>/dev/null)
    if test -z "$repo_root"
        echo "setup-marimo-pair must be run inside a git repository" >&2
        return 1
    end

    set -l source_dir "$HOME/Documents/git/marimo-pair"
    if set -q _flag_source
        set source_dir $_flag_source
    end

    if not test -d "$source_dir/.git"
        mkdir -p (dirname "$source_dir")
        git clone https://github.com/LumenYoung/marimo-pair.git "$source_dir"
        or return $status
    else
        git -C "$source_dir" pull --ff-only
        or return $status
    end

    if not test -f "$source_dir/SKILL.md"
        echo "marimo-pair source is missing SKILL.md: $source_dir" >&2
        return 1
    end

    set -l target_dir "$repo_root/.codex/skills/marimo-pair"
    mkdir -p "$target_dir"
    rsync -a --delete --exclude '.git/' "$source_dir/" "$target_dir/"
    or return $status

    echo "Installed marimo-pair skill:"
    echo "  $target_dir/SKILL.md"
end
