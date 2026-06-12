---
name: dotfiles-skill-creator
description: Create or update agent skills in this dotfiles repository. Use when adding project-local skills under .agents/skills, governed globally shared skills under skills/global, or deciding whether a skill belongs in an agent-specific directory such as codex/skills or pi-agent/skills.
---

# Dotfiles Skill Creator

Use this skill to create or update skills in this dotfiles repo without mixing up the two roles of the repository:

1. This repo has **project-local skills** for agents working on the dotfiles repo itself.
2. This repo also **governs globally shared skills** that should be available outside this repo.

## Placement Decision Tree

Choose exactly one destination before creating a skill:

### 1. Project-local to this dotfiles repo

Use `.agents/skills/<skill-name>/`.

Choose this when the skill teaches agents how to work on this repository, its propagation script, its agent configs, or its skill governance conventions.

Properties:
- Loaded only when an agent runs in this repo or below it.
- Intended for both Pi and Codex project-local discovery.
- Must be a directory containing `SKILL.md`; do not rely on root `.md` files in `.agents/skills`.

Examples:
- `dotfiles-skill-creator`
- a future `dotfiles-propagation` skill
- a future `agent-config-maintenance` skill

### 2. Governed globally shared skill

Use `skills/global/<skill-name>/`.

Choose this when the skill should be globally available to agents in other repositories, while still being maintained from this dotfiles repo.

Properties:
- This is the governed source of truth for shared cross-agent skills.
- It should be exposed through repo-internal relative symlinks inside agent skill roots.
- Do not put these directly in `codex/skills`, because Codex may install additional user/system skills there that should not become globally governed.

Current relative links:
- `codex/skills/global -> ../../skills/global`
- `pi-agent/skills/global -> ../../skills/global`
- `claude/skills/global -> ../../skills/global`

### 3. Agent-specific skill

Use the agent-specific directory only when the skill depends on one agent’s non-portable behavior:

- Codex-specific: `codex/skills/<skill-name>/`
- Pi-specific: `pi-agent/skills/<skill-name>/`
- Claude-specific: `claude/skills/<skill-name>/`

When choosing this, add a short note in the skill body explaining why it is not portable.

## Creation Workflow

1. Clarify intended scope: project-local, governed global, or agent-specific.
2. Normalize the skill name to lowercase hyphen-case.
3. Check for collisions before creating:
   ```bash
   find .agents/skills skills/global codex/skills pi-agent/skills claude/skills -maxdepth 2 -name SKILL.md -print 2>/dev/null
   ```
4. Create the skill skeleton:
   ```bash
   .agents/skills/dotfiles-skill-creator/scripts/init_skill.py <skill-name> --scope project
   .agents/skills/dotfiles-skill-creator/scripts/init_skill.py <skill-name> --scope global
   .agents/skills/dotfiles-skill-creator/scripts/init_skill.py <skill-name> --path codex/skills
   ```
5. Edit `SKILL.md` first. Add `scripts/`, `references/`, or `assets/` only when they are actually useful.
6. Validate:
   ```bash
   .agents/skills/dotfiles-skill-creator/scripts/quick_validate.py <path/to/skill>
   ```
7. If the skill changes repository governance, update `AGENTS.md`, `destination.yaml`, `propogate_dotfiles.py`, and the repo-internal relative skill symlinks in the same change.

## Skill Structure

A skill is a directory containing `SKILL.md`:

```text
<skill-name>/
├── SKILL.md
├── scripts/       # optional deterministic helpers
├── references/    # optional detailed docs loaded on demand
└── assets/        # optional templates, images, boilerplate
```

Use this minimal `SKILL.md` shape:

```markdown
---
name: my-skill
description: Specific description of what the skill does and when to use it.
---

# My Skill

Action-oriented instructions for the agent.
```

Rules:
- `name` must use lowercase letters, digits, and hyphens only.
- Keep `description` specific; it is the trigger surface.
- Keep `SKILL.md` lean. Move large details into directly linked `references/` files.
- Prefer scripts for fragile or repetitive operations.
- Do not create extra README, changelog, or installation docs inside a skill unless they are needed by the skill at runtime.

## Repository Governance Rules

- `.agents/skills` is for this repo’s local agent behavior.
- `skills/global` is for globally shared, governed skills.
- `codex/skills` remains Codex’s own global skill area and may contain Codex system/user-installed skills.
- Prefer repo-internal relative symlinks from each agent skill root to `skills/global`, rather than home-directory absolute symlinks.
- If an agent does not discover a nested symlinked directory, add an explicit config or per-skill relative symlinks for that agent rather than copying skill contents.
