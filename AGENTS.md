# Agents Guide

This repository syncs configuration into per-agent config directories via `destination.yaml`
(using `propogate_dotfiles.py`). Each top-level entry in the repo can be symlinked into
the destination path listed in `destination.yaml`.

## Skills strategy

We keep **Codex skills separate** and do not force them into the shared skills layout.
Codex keeps its own skills under `codex/skills/` and `codex/superpowers/skills/`.

For other agents (Gemini, OpenCode, and future CLIs), we **share the full Superpowers repo**
from `skills/superpowers` by symlinking it into each agent’s config directory.

If we introduce additional shared skill packs in the future, add them under `skills/` and
symlink as needed. Agent-specific skills stay in that agent’s own directory.

## Propagation behavior

- `propogate_dotfiles.py` reads `destination.yaml` and symlinks each repo entry into its
  destination path. It operates on **top-level entries** only.
- `skills/` is a shared root for agent-shared repos (currently `skills/superpowers`).
- Each agent’s `superpowers` directory is a symlink into this shared root.

## Current agent paths

- Codex: `~/.codex` → `dotfiles/codex` (superpowers symlinked)
- Gemini: `~/.gemini` → `dotfiles/gemini` (superpowers symlinked)
- OpenCode: `~/.config/opencode` → `dotfiles/opencode` (superpowers symlinked)
- Skills root: `~/.config/skills` → `dotfiles/skills`

Update this document whenever the skills layout or propagation rules change.


# Memorix — Automatic Memory Rules

You have access to Memorix memory tools. You MUST follow these rules to maintain persistent context across sessions.
These rules are NOT optional — they are critical for cross-session memory continuity.

## RULE 1: Session Start — Load Context (MUST)

At the **beginning of every conversation**, BEFORE responding to the user:

1. Call `memorix_search` with a query related to the user's first message or the current project
2. If results are found, use `memorix_detail` to fetch the most relevant ones
3. Reference relevant memories naturally in your response

> **CRITICAL**: Do NOT skip this step. The user expects you to "remember" previous sessions.

## RULE 2: After Every Action — Check & Record (MUST)

After EVERY tool call that modifies state (file create/edit, shell command, config change), run this checklist:

**Ask yourself: "Would a different AI agent need to know about this?"**
- If YES → call `memorix_store` IMMEDIATELY, BEFORE replying to the user
- If NO → skip (e.g., simple file reads, ls/dir, greetings)

### What MUST be recorded:
- ✅ File created or significantly modified → type: `what-changed`
- ✅ Bug identified and fixed → type: `problem-solution`
- ✅ Architecture or design decision made → type: `decision`
- ✅ Unexpected behavior or gotcha discovered → type: `gotcha`
- ✅ Configuration changed (env vars, ports, deps) → type: `what-changed`
- ✅ Feature completed or milestone reached → type: `what-changed`
- ✅ Trade-off discussed with conclusion → type: `trade-off`

### What should NOT be recorded:
- ❌ Simple file reads without findings
- ❌ Greetings, acknowledgments
- ❌ Trivial commands (ls, pwd, git status with no issues)

## RULE 3: Session End — Store Summary (MUST)

When the conversation is ending or the user says goodbye:

1. Call `memorix_store` with type `session-request` to record:
   - What was accomplished in this session
   - Current project state and any blockers
   - Pending tasks or next steps
   - Key files modified

This creates a "handoff note" for the next session (or for another AI agent).

## Guidelines

- **Use concise titles** (~5-10 words) and structured facts
- **Include file paths** in filesModified when relevant
- **Include related concepts** for better searchability
- **Prefer storing too much over too little** — the retention system will auto-decay stale memories

Use types: `decision`, `problem-solution`, `gotcha`, `what-changed`, `discovery`, `how-it-works`, `trade-off`.
