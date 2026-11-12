---
name: herdr-app
description: "Operate Herdr app spaces, tabs, panes, and their core terminals when Pi runtime detection confirms Herdr app membership and the user explicitly requests Herdr or terminal operations."
---

# Herdr App

This is a Pi-specific adapter: the `herdr-context` extension conditionally exposes it
through `resources_discover` after verifying Herdr app membership. Use the injected runtime
context rather than the older Herdr integration's `HERDR_ENV` requirement.

Use these interfaces only for explicit user requests to inspect, configure, or control
Herdr or terminals. The availability of background work or delegation is not authorization.

## Read the installed guidance

- Run `herdr-app --skill` for desktop operations and the relationship to herdr-core.
- Use `herdr-app commands` for the installed app's commands and arguments.
- Run `hc --skill` before core-terminal operations.
- Before app configuration changes, read
  `${HERDR_APP_HOME:-$HOME/.config/herdr-app}/AGENTS.md`. It is generated and overwritten at
  app startup; do not edit it for persistent agent policy.

Use `herdr-app` for visible spaces, tabs, and panes; use `hc` for core terminals. Do not
substitute the older `herdr` CLI or its skill. The installed manuals are authoritative for
command syntax; do not guess flags or copy commands from a different interface.

## Target the caller safely

The inherited core terminal ID is not an app pane ID. Recheck its live identity with
`HC_SOCKET="$HC_TERMINAL_SOCKET" hc get "$HC_TERMINAL_ID" --json`, then discover any required
app pane mapping through the installed app interface. Bind core operations to that inherited
socket; do not fall back to a default endpoint. Do not assume the focused pane is the caller's pane, or that a
nested/headless agent has its own visible pane. `/reload` repeats environment detection;
recheck live targets before mutations if topology may have changed.

If identity is unavailable or ambiguous, use read-only checks or ask the user before
controlling a target. Do not treat a running app or a successful `herdr-app status` as proof
of this process's app membership.

Inspect targets before sending input. Preserve focus unless the user requests a change.
Do not close other people's panes, stop servers, or restart Herdr without explicit
authorization. Environment detection grants no additional control authority.
