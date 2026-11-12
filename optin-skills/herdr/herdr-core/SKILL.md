---
name: herdr-core
description: "Inspect or control herdr-core terminals with hc when Pi runtime detection confirms core context without Herdr app membership and the user explicitly requests terminal operations."
---

# Herdr Core

This is a Pi-specific adapter: the `herdr-context` extension conditionally exposes it
through `resources_discover` after verifying core-terminal context without Herdr app
membership labels. Core context alone does not establish membership in a desktop app.

Use `hc` only when the user explicitly requests Herdr or terminal operations, not merely
because background work or delegation could help. Run `hc --skill` before relevant
operations and use the installed CLI's help for command syntax. Do not substitute the
older `herdr` CLI or use desktop pane commands on the assumption that this terminal belongs
to Herdr app.

Recheck the inherited terminal with
`HC_SOCKET="$HC_TERMINAL_SOCKET" hc get "$HC_TERMINAL_ID" --json`. Bind core operations to
that inherited socket; do not fall back to a default endpoint. Its ID identifies a core
terminal, not an app pane or an older Herdr pane. Inherited caller context does not
prove a nested/headless agent owns a separate visible pane or is the foreground agent.
If identity is unavailable or ambiguous, use read-only checks or ask the user; do not
fall back to a focused terminal. `/reload` repeats environment detection; recheck live
targets before mutations if topology may have changed.

Inspect targets before sending input. Preserve focus unless the user requests a change.
Do not close other people's terminals, stop servers, or restart Herdr without explicit
authorization. Environment detection grants no additional control authority.
