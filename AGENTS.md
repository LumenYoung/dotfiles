# Agents Guide

This repository syncs configuration into per-agent config directories via `destination.yaml`
(using `propogate_dotfiles.py`). Each top-level entry in the repo can be symlinked into
the destination path listed in `destination.yaml`.

## Skills strategy

This repo has three distinct skill roles:

1. **Project-local skills for this dotfiles repo** live under `.agents/skills/`.
   Use these for instructions that only make sense when an agent is working in this repo
   (for example, `dotfiles-skill-creator` and `dotfiles-maintenance`). Pi discovers
   `.agents/skills/` from the cwd and ancestors, and Codex also supports the `.agents`
   skills convention.
2. **Governed globally shared skills** live under `skills/global/`. These are the shared
   skills this repo maintains for use outside this repo. Expose them to agent skill roots with
   repo-internal relative symlinks, e.g. `codex/skills/global -> ../../skills/global`.
3. **Externally maintained vendored skills/packages** live under `skills/vendor/`. Use this
   for upstream repos tracked as submodules. Expose the actual skill directory through
   `skills/global/` when it should be globally available.

Keep **agent-specific skills separate**. Codex keeps its own skills under `codex/skills/`
and may install additional Codex system/user skills there; do not treat `codex/skills/` as
the governed shared-skill source of truth. Pi-specific skills can live under `pi-agent/skills/`.
The whole Pi agent directory is managed at `pi-agent/`, including global instructions,
subagent definitions, MCP config, settings, extensions, scripts, and ignored runtime state.

If we introduce additional shared skill packs in the future, add them under `skills/` and
symlink/configure as needed. Agent-specific skills stay in that agent’s own directory.

## Propagation behavior

- `propogate_dotfiles.py` reads `destination.yaml` and symlinks each repo entry into its
  destination path. It operates on **top-level entries** only.
- `--core` propagates daily shell/editor configs. `--agents` propagates Codex,
  OpenCode, T3 Code, related systemd user units, helper binaries used by agents,
  and the whole Pi agent directory.
- `.agents/skills/` is intentionally not propagated globally; it is project-local.
- `skills/global/` is intentionally not propagated directly to a home-directory path; it is
  exposed through relative symlinks inside each agent's skill root.
- `skills/vendor/` is for externally maintained upstream repos/submodules. Governed exposure
  still happens through `skills/global/` symlinks.
- Each agent may still have its own skill directory for agent-specific or tool-installed skills.

## Current agent paths

- Codex: `~/.codex` → `dotfiles/codex` (superpowers symlinked)
- Gemini: `~/.gemini` → `dotfiles/gemini` (superpowers symlinked)
- OpenCode: `~/.config/opencode` → `dotfiles/opencode` (superpowers symlinked)
- Pi: `~/.pi/agent` → `dotfiles/pi-agent`
- Project-local skills: `dotfiles/.agents/skills`
- Governed global skills source: `dotfiles/skills/global`
- Vendored upstream skill/package source: `dotfiles/skills/vendor`
- Relative shared-skill links:
  - `codex/skills/global` → `../../skills/global`
  - `pi-agent/skills/global` → `../../skills/global`
  - `claude/skills/global` → `../../skills/global`

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
