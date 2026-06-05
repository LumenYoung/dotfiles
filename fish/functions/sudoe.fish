function sudoe --description 'Prompt for sudo now; reuse sudo timestamp for this shell/tty'
    if test (count $argv) -gt 0
        echo 'usage: sudoe' >&2
        return 2
    end

    # Prompt now if needed. sudo then reuses its normal timestamp timeout
    # for later sudo commands in this terminal/session.
    sudo -v
end
