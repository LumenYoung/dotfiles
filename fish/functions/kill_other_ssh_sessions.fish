function kill_other_ssh_sessions
    set -l username (whoami)
    set -l current_ssh_pid
    set -l probe_pid $fish_pid

    # Walk up the process tree until we find the sshd instance backing this shell.
    while test -n "$probe_pid"
        if test "$probe_pid" -le 1
            break
        end

        set -l probe_comm (ps -o comm= -p $probe_pid | string trim)
        if test "$probe_comm" = "sshd"
            set current_ssh_pid $probe_pid
            break
        end

        set probe_pid (ps -o ppid= -p $probe_pid | string trim)
    end

    # SSH shells often have an intermediate parent such as login, tmux, or sudo.
    # Fall back to SSH_TTY when the direct ancestry does not expose sshd cleanly.
    if test -z "$current_ssh_pid"
        if set -q SSH_TTY
            set -l current_tty (string replace -r '^/dev/' '' -- $SSH_TTY)
            set current_ssh_pid (ps -u $username -o pid=,args= | awk -v tty="$current_tty" 'index($0, "@" tty) {print $1; exit}')
        end
    end

    if not set -q SSH_CONNECTION; and not set -q SSH_CLIENT; and not set -q SSH_TTY
        echo "Warning: This shell does not look like an SSH session. Exiting."
        return 1
    end

    if test -z "$current_ssh_pid"
        echo "Warning: Could not determine the current session's sshd PID. Exiting."
        return 1
    end

    set -l killed 0
    for pid in (ps -u $username -o pid=,comm= | awk '$2 == "sshd" {print $1}')
        if test "$pid" != "$current_ssh_pid"
            echo "Killing SSH session with PID $pid"
            kill $pid
            or echo "Warning: Failed to kill SSH session with PID $pid"
            set killed 1
        end
    end

    if test $killed -eq 0
        echo "No other SSH sessions found."
    end
end
