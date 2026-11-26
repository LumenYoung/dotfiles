#!/usr/bin/env bash
set -euo pipefail
umask 077

die() { printf '%s\n' "$*" >&2; exit 1; }

run_timer() {
    local state=$1 interval=$2 message=$3 repeat=$4 cli=$5 delay=$2 failures=0 due left
    while [[ ! -e "$state/closed" ]]; do
        due=$(( $(date +%s) + delay ))
        date -u -d "@$due" +%FT%TZ > "$state/next-utc"
        [[ -f "$state/pid" ]] || printf '%s\n' "$$" > "$state/pid"
        while (( (left = due - $(date +%s)) > 0 )); do
            [[ ! -e "$state/closed" ]] || break 2
            sleep "$(( left < 5 ? left : 5 ))"
        done
        [[ ! -e "$state/closed" ]] || break
        printf '%s sending reminder\n' "$(date -u +%FT%TZ)"
        if "$cli" send --name owner-wakeup --to "$PI_INTERCOM_SESSION_ID" --text "$message"; then
            [[ $repeat == --repeat ]] || return 0
            delay=$interval; failures=0
        else
            failures=$((failures + 1))
            (( failures < 3 )) || die 'Delivery failed three times; timer stopped.'
            delay=30
        fi
    done
    printf '%s timer closed\n' "$(date -u +%FT%TZ)"
}

if [[ ${1:-} == --worker ]]; then
    shift
    trap 'rm -f -- "$1/next-utc"' EXIT
    run_timer "$@"
    exit
fi
usage='Usage: wake.sh NEW_STATE_DIR SECONDS MESSAGE [--repeat]'
(( $# == 3 || $# == 4 )) || die "$usage"
[[ $# == 3 || $4 == --repeat ]] || die "$usage"
[[ $2 =~ ^[1-9][0-9]{0,8}$ && -n $3 ]] || die 'Use a positive whole number of seconds and a nonempty message.'
[[ -n ${PI_INTERCOM_SESSION_ID:-} ]] || die 'Set PI_INTERCOM_SESSION_ID to the confirmed owner Intercom ID.'
cli=$(command -v pi-intercom || printf '%s' "$HOME/.pi/agent/npm/node_modules/.bin/pi-intercom")
[[ -x $cli ]] || die 'Install pi-intercom or put its CLI on PATH.'
state=$(realpath -m -- "$1")
mkdir -- "$state" || die 'Cannot create timer state. Inspect any existing timer; do not arm a duplicate.'
nohup setsid bash "$0" --worker "$state" "$2" "$3" "${4:-}" "$cli" </dev/null >>"$state/timer.log" 2>&1 &
for ((i=0; i<100; i++)); do
    if [[ -s "$state/pid" && -s "$state/next-utc" ]] && kill -0 "$(<"$state/pid")" 2>/dev/null; then
        printf 'Armed: pid=%s next=%s log=%s/timer.log\n' "$(<"$state/pid")" "$(<"$state/next-utc")" "$state"
        exit 0
    fi
    sleep 0.02
done
touch "$state/closed"
die "Timer did not confirm startup. Inspect $state/timer.log."
