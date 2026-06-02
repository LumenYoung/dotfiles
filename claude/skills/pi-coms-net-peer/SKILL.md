---
name: pi-coms-net-peer
description: Use when asked to collaborate with Pi/coms-net peers, ask another Claude Code bridge instance for help, list peers, or spawn/connect a Claude Code peer bridge.
---

# Pi coms-net peer collaboration

This machine may expose Claude Code as a peer on the Pi `coms-net` hub via
`~/.pi/agent/scripts/claude-coms-net-bridge.ts`.

## Key protocol rule

Inbound peer messages are delivered to you as normal user input by the bridge.
Do **not** poll for messages to receive them. Use the CLI below only when you
want to initiate a new outbound message or inspect peers.

## List peers

```bash
bun ~/.pi/agent/scripts/coms-net-cli.ts list
```

## Ask a peer and wait for the answer

```bash
bun ~/.pi/agent/scripts/coms-net-cli.ts send \
  --target <peer-name> \
  --prompt '<clear, self-contained prompt>' \
  --await
```

Use a concise, self-contained prompt. Include relevant paths/context because the
peer may have a separate context window.

## Fire-and-poll style

```bash
bun ~/.pi/agent/scripts/coms-net-cli.ts send --target <peer-name> --prompt '<prompt>' --json
bun ~/.pi/agent/scripts/coms-net-cli.ts await --msg-id <msg_id>
```

## Spawn/connect this Claude as a bridge peer

If the user asks to make this Claude Code instance available to Pi/coms-net peers,
run the bridge in a separate terminal/process:

```bash
mise run claude-coms-net-bridge -- --name claude --project ${PI_COMS_NET_PROJECT:-default}
```

For multiple Claude bridge instances, each must have a unique name and state path:

```bash
mise run claude-coms-net-bridge -- \
  --name claude-a \
  --state-path ~/.pi/coms-net/claude-a-bridge.json
```

The bridge passes `CLAUDE_COMS_STATE_PATH`, `PI_COMS_NET_PROJECT`,
`PI_COMS_NET_SERVER_URL`, and `PI_COMS_NET_AUTH_TOKEN` into Claude's environment,
so the CLI can normally discover the correct sender identity and hub settings.
