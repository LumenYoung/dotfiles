function gcommit --description "View git commits or working-tree changes in diffnav"
    argparse 'c/changes' -- $argv
    or return 2

    set show_changes 0
    if set -q _flag_changes
        set show_changes 1
    end
    if not command -q git
        echo "gcommit: git is not installed" >&2
        return 127
    end

    if not git rev-parse --git-dir >/dev/null 2>&1
        echo "gcommit: not inside a git repository" >&2
        return 1
    end

    if not command -q diffnav
        echo "gcommit: diffnav is not installed or not in PATH" >&2
        return 127
    end

    if test $show_changes -eq 1
        if test (count $argv) -gt 0
            echo "Usage: gcommit [-c|--changes] or gcommit [COMMIT ...]" >&2
            return 2
        end

        # `git diff HEAD` includes staged and unstaged changes to tracked
        # files. Append diffs for non-ignored untracked files because Git does
        # not include those in a normal diff.
        begin
            git diff --no-ext-diff --patch --find-renames HEAD
            for file in (git ls-files --others --exclude-standard)
                git diff --no-index --no-ext-diff --patch -- /dev/null "$file"
                or true
            end
        end | diffnav
        return $pipestatus[2]
    end

    if test (count $argv) -eq 0
        if not command -q fzf
            echo "gcommit: fzf is required when no commits are provided" >&2
            return 127
        end

        # Show full hashes to fzf, while displaying the short hash and subject.
        # --accept-nth=1 returns only the full hash for each selected row.
        set commits (git log --all --date-order --decorate=short \
            --format='%H%x09%h %s' |
            fzf --multi --no-sort --delimiter='\t' --accept-nth=1 \
                --layout=reverse --border \
                --prompt='Commit(s)> ' \
                --header='TAB: select multiple commits')

        # Empty selection means the user cancelled or selected nothing.
        if test (count $commits) -eq 0
            return 0
        end
    else
        set commits $argv
    end

    # Resolve and validate every revision before opening diffnav. This also
    # makes fzf-selected hashes and CLI-supplied revisions follow the same path.
    set resolved_commits
    for commit in $commits
        set resolved (git rev-parse --verify "$commit^{commit}" 2>/dev/null)
        if test $status -ne 0
            echo "gcommit: invalid commit: $commit" >&2
            return 1
        end
        set -a resolved_commits $resolved
    end

    # Multiple commits are shown as individual patches, in the supplied order.
    git show --no-walk=unsorted --no-ext-diff --format= --patch \
        --find-renames $resolved_commits | diffnav
end
