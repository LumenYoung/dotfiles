## Usage

```bash
# Reload systemd and start service
systemctl --user daemon-reload
systemctl --user enable notes-sync.service
systemctl --user start notes-sync.service
```

View the status

```bash
# Check status
systemctl --user status notes-sync.service

# View logs
journalctl --user -u notes-sync.service -f
```

## Paseo environment

`paseo-upstream.service.d/30-local-fish.conf` starts Paseo through Fish with
`--no-config` and explicitly sources `~/.local.fish`. All exported variables
are inherited by Paseo and its agents; values in that file override matching
variables from the service environment files. Keep agent credentials in
`~/.local.fish` rather than copying them into another environment file.
Source output is suppressed to keep credentials out of the journal, and a
source failure prevents startup with a generic error message.

After changing the override, run `systemctl --user daemon-reload`. Changes to
`~/.local.fish` only need a Paseo restart to take effect. Restarting interrupts
running agents, so arrange it when their work can stop.

## Debug

Restart the server

```
# Reload systemd and start service
systemctl --user daemon-reload
systemctl --user restart notes-sync.service
journalctl --user -u notes-sync.service -f
```
