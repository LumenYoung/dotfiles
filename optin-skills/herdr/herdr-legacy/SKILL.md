---
name: herdr-legacy
description: "Inspect or control older Herdr workspaces, tabs, panes, and agents with the herdr CLI when Pi runtime detection confirms older Herdr context and the user explicitly requests those operations."
---

# Older Herdr CLI

This is a Pi-specific adapter: the `herdr-context` extension conditionally exposes it
through `resources_discover` after verifying older Herdr caller context. It does not apply
to Herdr app or herdr-core.

Use these interfaces only when the user explicitly requests Herdr or terminal/pane
operations, not merely because background work or delegation could help.

Run `herdr --skill` for the installed operation manual and `herdr --help` for command
discovery. Use the relevant command group's help before unfamiliar operations. Do not run
bare `herdr` for discovery: it launches or attaches the TUI. Do not substitute `herdr-app`
or `hc`; their command syntax and identifiers differ.

Resolve the live caller with `herdr pane current --current`. Pane moves can change its
workspace-qualified ID; use the returned identity rather than stale inherited IDs.
Target `--current` or an explicit live ID, never the UI-focused pane by default. A nested
or headless agent may inherit a host pane's context without owning a separate visible
pane or being its foreground agent. `/reload` repeats environment detection; recheck live
targets before mutations if topology may have changed.

If caller identity is unavailable or ambiguous, use read-only checks or ask the user
before controlling a target. Inspect targets before sending input, and preserve focus
unless the user requests a change. Do not close other people's panes, stop servers, or
restart Herdr without explicit authorization. Environment detection grants no additional
control authority.
