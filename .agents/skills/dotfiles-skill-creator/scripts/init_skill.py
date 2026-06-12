#!/usr/bin/env python3
"""Create a skill skeleton in this dotfiles repo."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SCOPE_PATHS = {
    "project": Path(".agents/skills"),
    "global": Path("skills/global"),
}


def normalize_name(raw: str) -> str:
    name = re.sub(r"[^a-z0-9]+", "-", raw.strip().lower()).strip("-")
    name = re.sub(r"-{2,}", "-", name)
    return name


def title_from_name(name: str) -> str:
    return " ".join(part.capitalize() for part in name.split("-"))


def find_repo_root() -> Path:
    current = Path.cwd().resolve()
    for path in [current, *current.parents]:
        if (path / "destination.yaml").exists() and (path / "AGENTS.md").exists():
            return path
    return current


def main() -> int:
    parser = argparse.ArgumentParser(description="Initialize a skill in the dotfiles repo")
    parser.add_argument("name", help="Skill name or title")
    parser.add_argument("--scope", choices=sorted(SCOPE_PATHS), help="project -> .agents/skills, global -> skills/global")
    parser.add_argument("--path", help="Explicit output parent directory, e.g. codex/skills")
    parser.add_argument("--resources", default="", help="Comma-separated optional dirs: scripts,references,assets")
    args = parser.parse_args()

    if bool(args.scope) == bool(args.path):
        print("Choose exactly one of --scope or --path", file=sys.stderr)
        return 2

    name = normalize_name(args.name)
    if not name:
        print("Skill name normalizes to empty", file=sys.stderr)
        return 2
    if len(name) > 64:
        print("Skill name must be <= 64 characters", file=sys.stderr)
        return 2

    repo = find_repo_root()
    parent = repo / (SCOPE_PATHS[args.scope] if args.scope else Path(args.path))
    skill_dir = parent / name
    if skill_dir.exists():
        print(f"Skill already exists: {skill_dir}", file=sys.stderr)
        return 1

    resources = [item.strip() for item in args.resources.split(",") if item.strip()]
    invalid = sorted(set(resources) - {"scripts", "references", "assets"})
    if invalid:
        print(f"Invalid resources: {', '.join(invalid)}", file=sys.stderr)
        return 2

    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text(
        f"""---
name: {name}
description: TODO: Explain what this skill does and when agents should use it. Be specific about triggers, scope, and relevant files or tasks.
---

# {title_from_name(name)}

## Purpose

TODO: Explain what this skill enables.

## Workflow

TODO: Add concise, action-oriented instructions.

## Resources

TODO: Link only resources that exist and explain when to read or run them.
""",
        encoding="utf-8",
    )

    for resource in resources:
        (skill_dir / resource).mkdir()

    try:
        print(skill_dir.relative_to(repo))
    except ValueError:
        print(skill_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
