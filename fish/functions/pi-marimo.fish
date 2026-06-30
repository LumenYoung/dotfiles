function pi-marimo --description 'Start marimo and Pi with the opt-in marimo-pair skill'
    argparse 'h/help' 'no-start' 'marimo-port=' -- $argv
    or return 2

    if set -q _flag_help
        echo "Usage: pi-marimo [--no-start] [--marimo-port PORT] [NOTEBOOK.py] [PI_ARGS...]"
        echo
        echo "Options:"
        echo "  -h, --help             Show this help."
        echo "      --no-start         Do not start marimo; only launch Pi with marimo-pair loaded."
        echo "      --marimo-port PORT Pass --port PORT to marimo edit."
        echo
        echo "Starts a marimo notebook with --no-token, then runs pi with marimo-pair loaded via --skill."
        echo "If NOTEBOOK.py exists or looks like a notebook path, it is passed to marimo edit and removed from PI_ARGS."
        echo
        echo "Examples:"
        echo "  pi-marimo notebook.py"
        echo "  pi-marimo --marimo-port 2718 notebook.py \"help me improve this notebook\""
        echo "  pi-marimo --no-start \"connect to my existing marimo session\""
        echo
        echo "Note: pi-marimo uses the marimo executable from the current PATH; source/activate the project env first."
        return 0
    end

    set -l skill_rel marimo/marimo-pair/skills/marimo-pair
    set -l skill_candidates

    if set -q XDG_CONFIG_HOME; and test -n "$XDG_CONFIG_HOME"
        set -a skill_candidates "$XDG_CONFIG_HOME/optin-skills/$skill_rel"
    end
    set -a skill_candidates "$HOME/.config/optin-skills/$skill_rel"

    set -l current_file (status current-filename)
    if test -n "$current_file"; and command -q realpath
        set -l repo_root (dirname (dirname (dirname (realpath "$current_file"))))
        set -a skill_candidates "$repo_root/optin-skills/$skill_rel"
    end

    set -l skill_path
    for candidate in $skill_candidates
        if test -f "$candidate/SKILL.md"
            set skill_path "$candidate"
            break
        end
    end

    if test -z "$skill_path"
        echo "marimo-pair skill not found. Expected one of:" >&2
        for candidate in $skill_candidates
            echo "  $candidate/SKILL.md" >&2
        end
        return 1
    end

    set -l notebook
    if test (count $argv) -gt 0
        set -l first_arg $argv[1]
        if not string match -q -- '-*' "$first_arg"
            if test -e "$first_arg"; or string match -qr '\.(py|ipynb)$' -- "$first_arg"
                set notebook "$first_arg"
                set -e argv[1]
            end
        end
    end

    set -l marimo_pid
    set -l marimo_log
    if not set -q _flag_no_start
        if not command -q marimo
            echo "marimo not found on PATH; source/activate the project environment first" >&2
            return 127
        end

        set -l marimo_args edit --no-token
        if set -q _flag_marimo_port
            set -a marimo_args --port $_flag_marimo_port
        end
        if test -n "$notebook"
            set -a marimo_args "$notebook"
        end

        set marimo_log (mktemp -t pi-marimo.XXXXXX.log)
        marimo $marimo_args >$marimo_log 2>&1 &
        set marimo_pid $last_pid

        sleep 2
        if not kill -0 $marimo_pid 2>/dev/null
            echo "marimo failed to start. Log: $marimo_log" >&2
            cat $marimo_log >&2
            return 1
        end

        echo "marimo running, pid $marimo_pid"
        echo "marimo log: $marimo_log"
    end

    pi --skill "$skill_path" $argv
    set -l pi_status $status

    if test -n "$marimo_pid"
        kill $marimo_pid 2>/dev/null
    end

    return $pi_status
end
