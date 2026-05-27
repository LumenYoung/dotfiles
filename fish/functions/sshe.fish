function sshe --description "SSH wrapper that injects configured local env vars into the remote command"
    set -l default_env_vars \
        LUMENY_OPENAI_BASE_URL \
        LUMENY_OPENAI_API_KEY \
        GITHUB_TOKEN \
        AQUA_GITHUB_TOKEN

    if test (count $argv) -lt 1
        echo "usage: sshe [ssh options] <host> [remote command ...]" >&2
        return 1
    end

    set -l configured_env_vars $default_env_vars
    if set -q SSHE_ENV_VARS[1]
        set configured_env_vars $SSHE_ENV_VARS
    end

    set -l args $argv
    set -l option_args_with_values -B -b -c -D -E -e -F -I -i -J -L -l -m -O -o -p -Q -R -S -W -w
    set -l host_idx 0
    set -l remote_idx 0

    set -l i 1
    while test $i -le (count $args)
        set -l arg $args[$i]

        if test "$arg" = --
            set remote_idx (math $i + 1)
            break
        end

        if contains -- $arg $option_args_with_values
            set i (math $i + 2)
            continue
        end

        if string match -qr '^-(B|b|c|D|E|e|F|I|i|J|L|l|m|O|o|p|Q|R|S|W|w).+$' -- $arg
            set i (math $i + 1)
            continue
        end

        if string match -q -- '-*' $arg
            set i (math $i + 1)
            continue
        end

        set host_idx $i
        set remote_idx (math $i + 1)
        break
    end

    if test $host_idx -eq 0
        command ssh $args
        return $status
    end

    set -l exports
    for env_name in $configured_env_vars
        if not string match -qr '^[A-Za-z_][A-Za-z0-9_]*$' -- $env_name
            continue
        end

        if set -q $env_name
            set -l env_value $$env_name
            if test (count $env_value) -gt 0
                set -a exports "$env_name="(string escape -- (string join ' ' -- $env_value))
            else
                set -a exports "$env_name=''"
            end
        end
    end

    set -l before_host
    if test $host_idx -gt 1
        set before_host $args[1..(math $host_idx - 1)]
    end
    set -l host $args[$host_idx]

    if test (count $exports) -eq 0
        command ssh $args
        return $status
    end

    if test $remote_idx -gt (count $args)
        set -l interactive_cmd "exec env "(string join ' ' -- $exports)' ${SHELL:-/bin/sh} -l'
        command ssh $before_host -t $host $interactive_cmd
        return $status
    end

    set -l remote_cmd $args[$remote_idx..-1]
    set -l remote_cmd_str (string join ' ' -- $remote_cmd)

    if string match -rq '^[A-Za-z_][A-Za-z0-9_]*=' -- $remote_cmd_str
        command ssh $args
        return $status
    end

    set -l prefixed_cmd (string join ' ' -- $exports $remote_cmd_str)
    command ssh $before_host $host $prefixed_cmd
end
