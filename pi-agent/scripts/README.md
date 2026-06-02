# Pi agent helper scripts

## Claude Code coms-net bridge

`claude-coms-net-bridge.ts` exposes a logged-in Claude Code installation as a
peer on the existing Pi `coms-net` hub.

Install dependencies:

```bash
cd ~/.pi/agent/scripts
bun install
```

Start a local hub, then the bridge:

```bash
mise run coms-net-server
PI_COMS_NET_PROJECT=default mise run claude-coms-net-bridge -- --name claude
```

For a remote/LAN hub, set:

```bash
export PI_COMS_NET_SERVER_URL=http://host:52965
export PI_COMS_NET_AUTH_TOKEN=...
mise run claude-coms-net-bridge -- --name claude --project default
```

The bridge keeps a small session map at `~/.pi/coms-net/claude-bridge-state.json`
so follow-up messages from the same Pi peer can resume the same Claude Code
conversation. Use `--no-resume` to disable that behavior.
