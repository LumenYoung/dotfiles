# Pi agent helper scripts

Install dependencies:

```bash
cd ~/.pi/agent/scripts
bun install
# or: mise run install-coms-net-deps
```

## coms-net hub

`coms-net-server.ts` starts the Pi `coms-net` hub from this repo:

```bash
mise run coms-net-server
```

## coms-net CLI

`coms-net-cli.ts` is a helper for talking to the hub:

```bash
mise run coms-net-cli -- --help
```

For a remote/LAN hub, set:

```bash
export PI_COMS_NET_SERVER_URL=http://host:52965
export PI_COMS_NET_AUTH_TOKEN=...
```
