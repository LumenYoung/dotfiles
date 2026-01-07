function sshfwd --description "SSH with local port forwarding"
    if test (count $argv) -lt 1
        echo "usage: sshfwd <host> [ports] [-- ssh args]" >&2
        return 1
    end

    set -l host $argv[1]
    set -l rest $argv[2..-1]
    set -l ports

    if test (count $rest) -gt 0
        if string match -qr '^[0-9]+(,[0-9]+)*$' -- $rest[1]
            set ports $rest[1]
            set rest $rest[2..-1]
        end
    end

    if test -z "$ports"
        read -l -P "Ports to forward (e.g. 5432 or 8000,8080): " ports
    end

    if test -z "$ports"
        echo "No ports provided." >&2
        return 1
    end

    set -l port_list (string split ',' -- $ports)
    set -l forwards
    for p in $port_list
        if not string match -qr '^[0-9]+$' -- $p
            echo "Invalid port: $p" >&2
            return 1
        end
        set -a forwards -L "$p:localhost:$p"
    end

    set -l split_idx (contains --index -- -- $rest)
    if test -n "$split_idx"
        set -l pre $rest[1..(math $split_idx - 1)]
        set -l post $rest[(math $split_idx + 1)..-1]
        command ssh $forwards $pre $host $post
    else
        command ssh $forwards $rest $host
    end
end
